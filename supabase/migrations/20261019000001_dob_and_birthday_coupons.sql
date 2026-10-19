-- ============================================================
-- Migration: date of birth on profiles + birthday coupons.
-- Admin picks customers by birth month and releases one single-use code
-- per customer (kind 'birthday', owned like welcome codes).
-- ============================================================

-- ── profiles.dob ────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob date;

-- A customer sets their date of birth once. After that only staff (or the SQL
-- editor) can change it — otherwise moving the date would earn a birthday
-- coupon every month.
CREATE OR REPLACE FUNCTION profiles_dob_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.dob IS NOT DISTINCT FROM OLD.dob THEN RETURN NEW; END IF;
  IF OLD.dob IS NOT NULL AND auth.uid() IS NOT NULL AND NOT is_admin_or_staff() THEN
    RAISE EXCEPTION 'dob_locked';
  END IF;
  IF NEW.dob IS NOT NULL AND (NEW.dob < DATE '1900-01-01' OR NEW.dob > (now() AT TIME ZONE 'Asia/Kolkata')::date) THEN
    RAISE EXCEPTION 'dob_invalid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_dob_guard ON profiles;
CREATE TRIGGER trg_profiles_dob_guard
  BEFORE UPDATE OF dob ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_dob_guard();

-- ── coupons: 'birthday' kind ────────────────────────────────
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_kind_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_kind_check CHECK (kind IN ('general', 'welcome', 'birthday'));
-- Every personal kind has an owner.
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_welcome_owner_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_welcome_owner_check CHECK (kind = 'general' OR assigned_user_id IS NOT NULL);

-- ── coupon_evaluate: any owned code works only for its owner ─
CREATE OR REPLACE FUNCTION coupon_evaluate(p_user uuid, p_code text, p_lines jsonb)
RETURNS TABLE (coupon_id uuid, code text, discount numeric, error text, min_order numeric, eligible_subtotal numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c coupons%ROWTYPE;
  v_eligible numeric;
  d numeric;
BEGIN
  SELECT * INTO c FROM coupons WHERE coupons.code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, upper(btrim(p_code)), 0::numeric, 'not_found'::text, NULL::numeric, 0::numeric; RETURN;
  END IF;

  IF NOT c.is_active THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'inactive'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'not_started'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'expired'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  -- Someone else's personal (welcome / birthday) code answers exactly like an
  -- unknown code, so the checkout can't be used to probe which codes exist.
  IF c.assigned_user_id IS NOT NULL AND c.assigned_user_id IS DISTINCT FROM p_user THEN
    RETURN QUERY SELECT NULL::uuid, c.code, 0::numeric, 'not_found'::text, NULL::numeric, 0::numeric; RETURN;
  END IF;
  IF c.per_user_limit IS NOT NULL AND (
       SELECT count(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.user_id = p_user
     ) >= c.per_user_limit THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'already_used'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'limit_reached'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  IF c.first_order_only AND EXISTS (
       SELECT 1 FROM orders o WHERE o.user_id = p_user AND o.status NOT IN ('CANCELLED', 'REFUNDED')
     ) THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'first_order_only'::text, c.min_order, 0::numeric; RETURN;
  END IF;

  SELECT COALESCE(sum((l->>'price')::numeric * (l->>'qty')::int), 0) INTO v_eligible
  FROM jsonb_array_elements(p_lines) l
  WHERE coupon_covers_product(c.id, l->>'slug');

  IF v_eligible <= 0 THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'not_applicable'::text, c.min_order, 0::numeric; RETURN;
  END IF;
  IF c.min_order IS NOT NULL AND v_eligible < c.min_order THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'min_order'::text, c.min_order, v_eligible; RETURN;
  END IF;

  d := CASE WHEN c.discount_type = 'percent'
            THEN round(v_eligible * c.discount_value / 100)
            ELSE c.discount_value END;
  IF c.max_discount IS NOT NULL THEN d := LEAST(d, c.max_discount); END IF;
  d := GREATEST(0, LEAST(d, v_eligible));
  RETURN QUERY SELECT c.id, c.code, d, NULL::text, c.min_order, v_eligible;
END;
$$;


-- ── available_coupons: list the customer's own birthday codes too ─
CREATE OR REPLACE FUNCTION available_coupons(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_lines jsonb;
  v_subtotal numeric;
  v_loyalty numeric;
  c coupons%ROWTYPE;
  ev RECORD;
  v_list jsonb := '[]'::jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  v_lines := price_order_lines(p_items);
  v_subtotal := lines_subtotal(v_lines);
  v_loyalty := COALESCE(customer_loyalty_discount(uid, v_subtotal), 0);

  FOR c IN
    SELECT * FROM coupons k
    WHERE k.is_active
      AND (k.starts_at IS NULL OR k.starts_at <= now())
      AND (k.expires_at IS NULL OR k.expires_at > now())
      AND (k.kind = 'general' OR k.assigned_user_id = uid)
  LOOP
    SELECT * INTO ev FROM coupon_evaluate(uid, c.code, v_lines);
    v_list := v_list || jsonb_build_array(jsonb_build_object(
      'code', c.code,
      'kind', c.kind,
      'discount_type', c.discount_type,
      'discount_value', c.discount_value,
      'max_discount', c.max_discount,
      'min_order', c.min_order,
      'first_order_only', c.first_order_only,
      'expires_at', c.expires_at,
      'scope', to_jsonb(coupon_scope_names(c.id)),
      'eligible_subtotal', ev.eligible_subtotal,
      'discount', CASE WHEN ev.error IS NULL THEN GREATEST(0, LEAST(ev.discount, v_subtotal - v_loyalty)) ELSE 0 END,
      'error', ev.error
    ));
  END LOOP;

  RETURN COALESCE((
    SELECT jsonb_agg(x ORDER BY
      CASE WHEN x->>'error' IS NULL THEN 0
           WHEN x->>'error' IN ('min_order', 'not_applicable') THEN 1
           ELSE 2 END,
      (x->>'discount')::numeric DESC,
      x->>'code')
    FROM jsonb_array_elements(v_list) x
  ), '[]'::jsonb);
END;
$$;


-- ── issue_birthday_coupons (admin) ──────────────────────────
-- One code per customer per calendar year (IST); customers who already got
-- one this year are skipped. Returns how many codes were created.
CREATE OR REPLACE FUNCTION issue_birthday_coupons(
  p_user_ids uuid[],
  p_discount_type text,
  p_discount_value numeric,
  p_max_discount numeric,
  p_min_order numeric,
  p_valid_days integer
)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  this_year int := extract(year FROM now() AT TIME ZONE 'Asia/Kolkata')::int;
  v_user uuid;
  new_code text;
  issued integer := 0;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_discount_type NOT IN ('percent', 'fixed') OR p_discount_value IS NULL OR p_discount_value <= 0
     OR (p_discount_type = 'percent' AND p_discount_value > 100) THEN
    RAISE EXCEPTION 'invalid_discount';
  END IF;
  IF COALESCE(p_max_discount, 0) < 0 OR COALESCE(p_min_order, 0) < 0 THEN RAISE EXCEPTION 'invalid_limits'; END IF;
  IF p_valid_days IS NULL OR p_valid_days < 1 OR p_valid_days > 365 THEN RAISE EXCEPTION 'invalid_valid_days'; END IF;

  FOREACH v_user IN ARRAY COALESCE(p_user_ids, '{}'::uuid[]) LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_user);
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM coupons k
      WHERE k.kind = 'birthday' AND k.assigned_user_id = v_user
        AND extract(year FROM k.created_at AT TIME ZONE 'Asia/Kolkata')::int = this_year
    );
    FOR attempt IN 1..10 LOOP
      new_code := 'BDAY-';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      BEGIN
        INSERT INTO coupons (
          code, kind, assigned_user_id, description,
          discount_type, discount_value, min_order, max_discount,
          max_uses, per_user_limit, first_order_only, is_active, expires_at
        ) VALUES (
          new_code, 'birthday', v_user, 'Birthday offer',
          p_discount_type, p_discount_value, NULLIF(p_min_order, 0), NULLIF(p_max_discount, 0),
          1, 1, false, true, now() + make_interval(days => p_valid_days)
        );
        issued := issued + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- code collision → try another
      END;
    END LOOP;
  END LOOP;
  RETURN issued;
END;
$$;

REVOKE EXECUTE ON FUNCTION coupon_evaluate(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION available_coupons(jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION available_coupons(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION issue_birthday_coupons(uuid[], text, numeric, numeric, numeric, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION issue_birthday_coupons(uuid[], text, numeric, numeric, numeric, integer) TO authenticated;
