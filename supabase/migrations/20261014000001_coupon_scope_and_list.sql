-- ============================================================
-- Migration: category-scoped coupons + the checkout coupon list.
--
-- A coupon can be limited to categories (their subcategories included).
-- Its discount and min order then count only the bag's eligible items;
-- everything else pays full price. The admin can leave single products
-- out. Only the categories and the left-out products are stored, so
-- products added to those categories later are covered automatically.
--
-- available_coupons() lists every live coupon for the checkout's
-- "Apply coupon" sheet, each priced against the bag, or with the reason
-- it can't be used yet.
--
-- quote_order() keeps its signature and output (plus coupon_scope), so
-- the razorpay-create-order function needs no redeploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS coupon_categories (
  coupon_id   uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_products (
  coupon_id    uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_slug)
);

ALTER TABLE coupon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "coupon_categories: staff manage" ON coupon_categories
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "coupon_excluded_products: staff manage" ON coupon_excluded_products
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── scope ───────────────────────────────────────────────────
-- No categories = whole store. Otherwise the product must be in one of
-- the coupon's categories or their subcategories (as its primary category
-- or an extra one) and not left out.
CREATE OR REPLACE FUNCTION coupon_covers_product(p_coupon uuid, p_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM coupon_categories cc WHERE cc.coupon_id = p_coupon)
      OR (
        NOT EXISTS (
          SELECT 1 FROM coupon_excluded_products x
          WHERE x.coupon_id = p_coupon AND x.product_slug = p_slug
        )
        AND EXISTS (
          SELECT 1
          FROM coupon_categories cc
          JOIN categories c ON c.id = cc.category_id OR c.parent_id = cc.category_id
          WHERE cc.coupon_id = p_coupon
            AND (
              EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_slug = p_slug AND pc.category_id = c.id)
              OR EXISTS (SELECT 1 FROM products p WHERE p.slug = p_slug AND p.category_id = c.id)
            )
        )
      );
$$;

-- Category names a coupon is limited to (empty = whole store), A → Z.
CREATE OR REPLACE FUNCTION coupon_scope_names(p_coupon uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(c.name ORDER BY c.name), '{}')
  FROM coupon_categories cc JOIN categories c ON c.id = cc.category_id
  WHERE cc.coupon_id = p_coupon;
$$;

-- ── pricing ─────────────────────────────────────────────────
-- Server price per cart line: [{slug, variantId, qty, price}], in the
-- order sent. Moved out of quote_order() unchanged so the coupon list
-- prices the bag the same way.
CREATE OR REPLACE FUNCTION price_order_lines(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e jsonb;
  qty int;
  price numeric;
  v_lines jsonb := '[]'::jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  FOR e IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    qty := (e->>'qty')::int;
    IF qty IS NULL OR qty < 1 OR qty > 99 THEN RAISE EXCEPTION 'bad_qty'; END IF;
    price := NULL;
    IF NULLIF(e->>'variantId', '') IS NOT NULL THEN
      SELECT pv.price INTO price FROM product_variants pv
      WHERE pv.id::text = e->>'variantId' AND pv.product_id = e->>'slug';
    ELSE
      SELECT p.price INTO price FROM products p WHERE p.slug = e->>'slug';
    END IF;
    IF price IS NULL THEN RAISE EXCEPTION 'unknown_item:%', e->>'slug'; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'slug', e->>'slug', 'variantId', NULLIF(e->>'variantId', ''), 'qty', qty, 'price', price));
  END LOOP;
  RETURN v_lines;
END;
$$;

CREATE OR REPLACE FUNCTION lines_subtotal(p_lines jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(sum((l->>'price')::numeric * (l->>'qty')::int), 0)
  FROM jsonb_array_elements(p_lines) l;
$$;

-- ── coupon_evaluate: now takes the priced lines ─────────────
-- Same checks and order as before, plus: the discount and min order use
-- only the lines the coupon covers ('not_applicable' when none are).
DROP FUNCTION IF EXISTS coupon_evaluate(uuid, text, numeric);
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
  -- Someone else's welcome code answers exactly like an unknown code, so the
  -- checkout can't be used to probe which codes exist.
  IF c.kind = 'welcome' AND c.assigned_user_id IS DISTINCT FROM p_user THEN
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

-- ── quote_order: same signature and output, + coupon_scope ──
CREATE OR REPLACE FUNCTION quote_order(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v_lines jsonb;
  v_subtotal numeric;
  v_loyalty numeric;
  v_coupon_code text;
  v_coupon_id uuid;
  v_coupon_discount numeric := 0;
  v_coupon_error text;
  v_coupon_min numeric;
  v_coupon_scope text[] := '{}';
  v_free_ship numeric;
  v_shipping numeric;
  v_total numeric;
  st RECORD;
  ev RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  v_lines := price_order_lines(p_items);
  v_subtotal := lines_subtotal(v_lines);
  v_loyalty := COALESCE(customer_loyalty_discount(uid, v_subtotal), 0);

  IF NULLIF(btrim(COALESCE(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO ev FROM coupon_evaluate(uid, p_coupon_code, v_lines);
    v_coupon_code := ev.code;
    v_coupon_error := ev.error;
    v_coupon_min := ev.min_order;
    IF ev.coupon_id IS NOT NULL THEN v_coupon_scope := coupon_scope_names(ev.coupon_id); END IF;
    IF ev.error IS NULL THEN
      v_coupon_id := ev.coupon_id;
      v_coupon_discount := GREATEST(0, LEAST(ev.discount, v_subtotal - v_loyalty));
    ELSE
      v_coupon_code := NULL;
    END IF;
  END IF;

  SELECT COALESCE((SELECT free_shipping FROM loyalty_settings LIMIT 1), 2499) INTO v_free_ship;
  v_shipping := CASE WHEN v_subtotal - v_loyalty - v_coupon_discount >= v_free_ship THEN 0 ELSE 99 END;
  v_total := GREATEST(0, v_subtotal - v_loyalty - v_coupon_discount + v_shipping);

  SELECT COALESCE(cod_enabled, true) AS cod_enabled,
         COALESCE(cod_advance_percent, 20) AS cod_advance_percent,
         COALESCE(cod_min_order, 0) AS cod_min_order
  INTO st FROM settings LIMIT 1;

  RETURN jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'loyalty_discount', v_loyalty,
    'coupon_code', v_coupon_code,
    'coupon_id', v_coupon_id,
    'coupon_discount', v_coupon_discount,
    'coupon_error', v_coupon_error,
    'coupon_min_order', v_coupon_min,
    'coupon_scope', to_jsonb(v_coupon_scope),
    'shipping', v_shipping,
    'total', v_total,
    'cod_available', COALESCE(st.cod_enabled, true) AND v_total >= COALESCE(st.cod_min_order, 0),
    'cod_advance', round(v_total * COALESCE(st.cod_advance_percent, 20) / 100),
    'cod_advance_percent', COALESCE(st.cod_advance_percent, 20)
  );
END;
$$;

-- ── checkout coupon list ────────────────────────────────────
-- Every live coupon the shopper may see (all general ones + their own
-- welcome code), priced against the bag. Usable ones first, biggest
-- saving first; then ones the shopper can unlock (min order / items);
-- then the rest. Admin notes (description) are never returned.
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
      AND (k.kind = 'general' OR (k.kind = 'welcome' AND k.assigned_user_id = uid))
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

-- ── admin save: coupon + its scope in ONE transaction ───────
-- A coupon saved without its categories would work on the whole store,
-- so the row and the scope must never be saved apart.
CREATE OR REPLACE FUNCTION save_coupon(p_id uuid, p_fields jsonb, p_categories uuid[], p_excluded text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := p_id;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF v_id IS NULL THEN
    INSERT INTO coupons (
      code, kind, assigned_user_id, welcome_tier_id, description,
      discount_type, discount_value, max_discount, min_order,
      max_uses, per_user_limit, starts_at, expires_at, first_order_only, is_active
    ) VALUES (
      p_fields->>'code', 'general', NULL, NULL, NULLIF(p_fields->>'description', ''),
      p_fields->>'discount_type', (p_fields->>'discount_value')::numeric,
      NULLIF(p_fields->>'max_discount', '')::numeric, NULLIF(p_fields->>'min_order', '')::numeric,
      NULLIF(p_fields->>'max_uses', '')::int, NULLIF(p_fields->>'per_user_limit', '')::int,
      NULLIF(p_fields->>'starts_at', '')::timestamptz, NULLIF(p_fields->>'expires_at', '')::timestamptz,
      COALESCE((p_fields->>'first_order_only')::boolean, false), COALESCE((p_fields->>'is_active')::boolean, true)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE coupons SET
      code             = p_fields->>'code',
      description      = NULLIF(p_fields->>'description', ''),
      discount_type    = p_fields->>'discount_type',
      discount_value   = (p_fields->>'discount_value')::numeric,
      max_discount     = NULLIF(p_fields->>'max_discount', '')::numeric,
      min_order        = NULLIF(p_fields->>'min_order', '')::numeric,
      max_uses         = NULLIF(p_fields->>'max_uses', '')::int,
      per_user_limit   = NULLIF(p_fields->>'per_user_limit', '')::int,
      starts_at        = NULLIF(p_fields->>'starts_at', '')::timestamptz,
      expires_at       = NULLIF(p_fields->>'expires_at', '')::timestamptz,
      first_order_only = COALESCE((p_fields->>'first_order_only')::boolean, false),
      is_active        = COALESCE((p_fields->>'is_active')::boolean, true)
    WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
  END IF;

  DELETE FROM coupon_categories WHERE coupon_id = v_id;
  DELETE FROM coupon_excluded_products WHERE coupon_id = v_id;
  INSERT INTO coupon_categories (coupon_id, category_id)
    SELECT v_id, cat FROM unnest(COALESCE(p_categories, '{}')) cat
    WHERE EXISTS (SELECT 1 FROM categories WHERE id = cat)
    ON CONFLICT DO NOTHING;
  -- Left-out products only mean something inside a category limit.
  IF EXISTS (SELECT 1 FROM coupon_categories WHERE coupon_id = v_id) THEN
    INSERT INTO coupon_excluded_products (coupon_id, product_slug)
      SELECT v_id, s FROM unnest(COALESCE(p_excluded, '{}')) s
      WHERE EXISTS (SELECT 1 FROM products WHERE slug = s)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN v_id;
END;
$$;

-- ── grants ──────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION coupon_covers_product(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION coupon_scope_names(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION price_order_lines(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION coupon_evaluate(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION quote_order(jsonb, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION quote_order(jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION available_coupons(jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION available_coupons(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION save_coupon(uuid, jsonb, uuid[], text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION save_coupon(uuid, jsonb, uuid[], text[]) TO authenticated;
