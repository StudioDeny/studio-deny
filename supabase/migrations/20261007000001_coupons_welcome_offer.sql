-- ============================================================
-- Migration: admin-managed coupons + welcome offer (one unique code per
-- new user, tier picked by admin-set target %).
-- Spec: docs/superpowers/specs/2026-10-07-coupons-welcome-popup-design.md
-- ============================================================

-- ── coupons: new columns ────────────────────────────────────
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS kind             text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS welcome_tier_id  uuid,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS starts_at        timestamptz,
  ADD COLUMN IF NOT EXISTS max_discount     numeric(10,2),
  ADD COLUMN IF NOT EXISTS per_user_limit   integer,
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_kind_check CHECK (kind IN ('general', 'welcome'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_max_discount_check CHECK (max_discount IS NULL OR max_discount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_per_user_limit_check CHECK (per_user_limit IS NULL OR per_user_limit > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_percent_max_check
    CHECK (discount_type <> 'percent' OR discount_value <= 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_welcome_owner_check
    CHECK (kind <> 'welcome' OR assigned_user_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION normalize_coupon_code()
RETURNS trigger AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_coupons_normalize_code
    BEFORE INSERT OR UPDATE OF code ON coupons
    FOR EACH ROW EXECUTE FUNCTION normalize_coupon_code();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE coupons SET code = upper(btrim(code)) WHERE code <> upper(btrim(code));

DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_code_format_check
    CHECK (code ~ '^[A-Z0-9_-]{3,32}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS coupons_one_welcome_per_user
  ON coupons (assigned_user_id) WHERE kind = 'welcome';

-- ── welcome_offer_tiers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS welcome_offer_tiers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label          text NOT NULL,
  discount_type  text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  target_percent numeric(5,2) NOT NULL CHECK (target_percent >= 0 AND target_percent <= 100),
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percent' OR discount_value <= 100)
);

DO $$ BEGIN
  CREATE TRIGGER trg_welcome_offer_tiers_updated_at
    BEFORE UPDATE ON welcome_offer_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO welcome_offer_tiers (label, discount_type, discount_value, target_percent, sort_order)
SELECT * FROM (VALUES
  ('5% OFF',  'percent', 5::numeric,  80::numeric, 1),
  ('10% OFF', 'percent', 10::numeric, 15::numeric, 2),
  ('15% OFF', 'percent', 15::numeric, 5::numeric,  3)
) AS v(label, discount_type, discount_value, target_percent, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM welcome_offer_tiers);

DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_welcome_tier_fk
    FOREIGN KEY (welcome_tier_id) REFERENCES welcome_offer_tiers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── welcome_offer_settings (singleton) ──────────────────────
CREATE TABLE IF NOT EXISTS welcome_offer_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled          boolean NOT NULL DEFAULT true,
  code_prefix      text NOT NULL DEFAULT 'DENY' CHECK (code_prefix ~ '^[A-Z0-9]{1,10}$'),
  valid_days       integer CHECK (valid_days IS NULL OR valid_days > 0),
  min_order        numeric(10,2) CHECK (min_order IS NULL OR min_order >= 0),
  max_discount     numeric(10,2) CHECK (max_discount IS NULL OR max_discount > 0),
  first_order_only boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_welcome_offer_settings_updated_at
    BEFORE UPDATE ON welcome_offer_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO welcome_offer_settings (id)
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM welcome_offer_settings);

-- ── coupon_redemptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       uuid REFERENCES coupons(id) ON DELETE SET NULL,
  code            text NOT NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id        text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_amount numeric(10,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id)
);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON coupon_redemptions (user_id);

-- ── tier picker + issuance ──────────────────────────────────
CREATE OR REPLACE FUNCTION pick_welcome_tier()
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_w numeric;
  r numeric;
  acc numeric := 0;
  t RECORD;
  picked uuid;
BEGIN
  SELECT COALESCE(SUM(target_percent), 0) INTO total_w
  FROM welcome_offer_tiers WHERE is_active AND target_percent > 0;
  IF total_w <= 0 THEN RETURN NULL; END IF;

  r := random() * total_w;
  FOR t IN
    SELECT id, target_percent FROM welcome_offer_tiers
    WHERE is_active AND target_percent > 0
    ORDER BY sort_order, created_at
  LOOP
    picked := t.id;
    acc := acc + t.target_percent;
    EXIT WHEN r < acc;
  END LOOP;
  RETURN picked;
END;
$$;

CREATE OR REPLACE FUNCTION issue_welcome_coupon(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s welcome_offer_settings%ROWTYPE;
  t welcome_offer_tiers%ROWTYPE;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  new_id uuid;
  picked_tier uuid;
BEGIN
  SELECT * INTO s FROM welcome_offer_settings LIMIT 1;
  IF NOT FOUND OR NOT s.enabled THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM coupons WHERE kind = 'welcome' AND assigned_user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  -- Pick once into a variable: in a WHERE clause the VOLATILE picker would
  -- run once per row and could match zero or several tiers.
  picked_tier := pick_welcome_tier();
  SELECT * INTO t FROM welcome_offer_tiers WHERE id = picked_tier;
  IF NOT FOUND THEN RETURN NULL; END IF;

  FOR attempt IN 1..10 LOOP
    new_code := s.code_prefix || '-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO coupons (
        code, kind, assigned_user_id, welcome_tier_id, description,
        discount_type, discount_value, min_order, max_discount,
        max_uses, per_user_limit, first_order_only, is_active, expires_at
      ) VALUES (
        new_code, 'welcome', p_user_id, t.id, 'Welcome offer · ' || t.label,
        t.discount_type, t.discount_value, s.min_order, s.max_discount,
        1, 1, s.first_order_only, true,
        CASE WHEN s.valid_days IS NULL THEN NULL ELSE now() + make_interval(days => s.valid_days) END
      )
      RETURNING id INTO new_id;
      RETURN new_id;
    EXCEPTION WHEN unique_violation THEN
      -- code collision → retry; a concurrent welcome coupon for this user → stop
      IF EXISTS (SELECT 1 FROM coupons WHERE kind = 'welcome' AND assigned_user_id = p_user_id) THEN
        RETURN NULL;
      END IF;
    END;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION welcome_offer_stats()
RETURNS TABLE (tier_id uuid, issued bigint, redeemed bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT c.welcome_tier_id, count(*)::bigint, count(*) FILTER (WHERE c.used_count > 0)::bigint
    FROM coupons c
    WHERE c.kind = 'welcome'
    GROUP BY c.welcome_tier_id;
END;
$$;

-- Internal only — never callable from the browser.
REVOKE EXECUTE ON FUNCTION pick_welcome_tier() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION issue_welcome_coupon(uuid) FROM PUBLIC, anon, authenticated;

-- ── signup trigger: same as 20260812000005 + welcome coupon ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _name text;
  _phone text;
  _template_id uuid;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  _phone := NEW.raw_user_meta_data->>'phone';

  BEGIN
    INSERT INTO public.profiles (id, user_id, name, email, phone)
    VALUES (NEW.id, NEW.id, _name, NEW.email, _phone)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.profiles (user_id, name, email, phone)
      VALUES (NEW.id, _name, NEW.email, _phone)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] profile insert failed uid=% err=%', NEW.id, SQLERRM;
    END;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] role insert failed uid=% err=%', NEW.id, SQLERRM;
  END;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    BEGIN
      SELECT id INTO _template_id FROM public.notification_templates WHERE template_name = 'welcome_new_user' AND is_active = true;
      IF _template_id IS NOT NULL THEN
        INSERT INTO public.notification_queue (template_id, recipient_phone, order_id, variables)
        VALUES (_template_id, _phone, NULL, jsonb_build_object('customer_name', _name, 'shop_url', 'https://studiodeny.com/shop'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] welcome notification failed uid=% err=%', NEW.id, SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM public.issue_welcome_coupon(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] welcome coupon failed uid=% err=%', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────
-- public_coupons (20260812000007) lists every active code to anonymous
-- visitors and nothing in the app reads it; codes are now validated only
-- through quote_order(), so drop it.
DROP VIEW IF EXISTS public_coupons;

-- coupons: staff can manage too (admin UI admits admin + staff)
DROP POLICY IF EXISTS "coupons: admin read" ON coupons;
DROP POLICY IF EXISTS "coupons: admins write" ON coupons;
DO $$ BEGIN
  CREATE POLICY "coupons: staff manage" ON coupons
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "coupons: owner reads own welcome" ON coupons
    FOR SELECT USING (assigned_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE welcome_offer_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "welcome_offer_tiers: staff manage" ON welcome_offer_tiers
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE welcome_offer_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "welcome_offer_settings: staff manage" ON welcome_offer_settings
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "coupon_redemptions: staff read" ON coupon_redemptions
    FOR SELECT USING (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "coupon_redemptions: own read" ON coupon_redemptions
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
