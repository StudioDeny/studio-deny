# Coupons, Welcome Offer & Signup Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-controlled coupons (general + a unique welcome code per new user, tier picked by admin-set target %), applied at checkout with a server-computed total, plus a fully admin-editable signup popup and an account page where customers edit name, phone and multiple delivery addresses.

**Architecture:** Postgres owns every money decision: `quote_order()` prices the cart (DB prices, existing `customer_loyalty_discount`, coupon rules, shipping, COD advance); `razorpay-create-order` charges that quote and stores it in `payment_quotes`; the orders INSERT policy requires the saved order to equal the stored quote. Welcome coupons are issued inside the existing `handle_new_user` signup trigger. The storefront and admin are React (TanStack Start) screens over Supabase tables, following the existing singleton-table + admin-editor pattern (`popup_promo` / `admin.popup.tsx`).

**Tech Stack:** TanStack Start + React 19 + TypeScript, Tailwind v4, Supabase (Postgres, RLS, Edge Functions on Deno), Razorpay, Cloudinary (`MediaField`), framer-motion, sonner, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-07-coupons-welcome-popup-design.md`

## Global Constraints

- No new npm dependencies. No OTP. No email verification. No anti-abuse rules.
- Loyalty behaviour, tiers and `loyalty_settings` are not modified. `customer_loyalty_discount()` is reused unchanged.
- Never fail an order after payment because a coupon changed state; honour the quote that was paid.
- Coupon codes are stored upper-case, trimmed; format `^[A-Z0-9_-]{3,32}$`.
- Welcome code format: `<PREFIX>-<6 chars>` from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; prefix `^[A-Z0-9]{1,10}$`, default `DENY`.
- Seed tiers: `5% OFF` percent 5 target 80 · `10% OFF` percent 10 target 15 · `15% OFF` percent 15 target 5.
- Shipping rule (unchanged from today): ₹0 when `subtotal − loyalty − coupon ≥ loyalty_settings.free_shipping` (fallback 2499), else ₹99.
- Popup never shows on `/login`, `/signup`, `/checkout`, `/admin*`, nor to logged-in users. Loyalty popup shows only to logged-in users.
- Admin UI follows `src/routes/admin.popup.tsx` conventions: `text-mono text-[10px] tracking-widest` labels, `.inp` inputs, `border border-border bg-surface p-4` cards, `toast` from sonner.
- RPC calls use the repo's existing untyped pattern: `supabase.rpc("name" as never, args as never)`.
- New migrations are idempotent (`IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN duplicate_object`), like every existing migration.

**Environment note:** this machine has no `supabase` CLI or `psql`. Migrations and the SQL test files are run by the owner in **Supabase Dashboard → SQL Editor** (or `npx supabase login && npx supabase link && npx supabase db push`). Edge functions deploy with `npx supabase functions deploy razorpay-create-order`. Each SQL test file wraps everything in `BEGIN … ROLLBACK`, so it leaves no data behind; a failing `ASSERT` aborts with the message.

## Review Focus

1. **Cart price changed between page load and pay** — quote is re-fetched on every cart/coupon change and the edge function re-quotes at pay time; the customer is charged the fresh quote and the order saves (Task 3 manual check 5).
2. **Coupon's last use taken by someone else while the customer is in Razorpay** — order still saves with the paid discount; `used_count` may exceed `max_uses` by one (Task 2 test T9).
3. **Admin edits tier targets so they don't sum to 100** — admin screen blocks save; the SQL picker still normalises if rows are edited elsewhere (Task 1 test T3, Task 5 step).
4. **Signup popup submit with an email that already exists** — friendly "already have an account — log in" message, no crash, no coupon (Task 6 manual check 4).
5. **Customer with no saved addresses / old localStorage addresses** — localStorage addresses are imported once into the DB, then cleared; checkout works with none (Task 8 manual check 2).

---

### Task 1: Database — coupon columns, welcome offer tables, issuance on signup

**Files:**
- Create: `supabase/migrations/20261007000001_coupons_welcome_offer.sql`
- Create: `supabase/tests/20261007_welcome_offer_test.sql`

**Interfaces:**
- Produces (SQL): tables `welcome_offer_tiers`, `welcome_offer_settings`, `coupon_redemptions`; new `coupons` columns `kind, assigned_user_id, welcome_tier_id, description, starts_at, max_discount, per_user_limit, first_order_only, updated_at`; functions `pick_welcome_tier() → uuid`, `issue_welcome_coupon(p_user_id uuid) → uuid`, `welcome_offer_stats() → TABLE(tier_id uuid, issued bigint, redeemed bigint)`; `handle_new_user()` now issues a welcome coupon.

- [ ] **Step 1: Write the failing test** — `supabase/tests/20261007_welcome_offer_test.sql`

```sql
-- Run in Supabase SQL Editor. Leaves no data behind.
BEGIN;

-- T1: seeded tiers exist and sum to 100
DO $$ DECLARE s numeric; BEGIN
  SELECT SUM(target_percent) INTO s FROM welcome_offer_tiers WHERE is_active;
  ASSERT s = 100, format('T1 tiers should sum to 100, got %s', s);
END $$;

-- T2: picker distribution is close to targets over 4000 draws
DO $$ DECLARE five int; ten int; fifteen int; BEGIN
  CREATE TEMP TABLE draws ON COMMIT DROP AS
    SELECT pick_welcome_tier() AS tier_id FROM generate_series(1, 4000);
  SELECT count(*) INTO five    FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 5;
  SELECT count(*) INTO ten     FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 10;
  SELECT count(*) INTO fifteen FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 15;
  ASSERT five BETWEEN 3080 AND 3320, format('T2 5%% tier got %s/4000', five);
  ASSERT ten BETWEEN 500 AND 700, format('T2 10%% tier got %s/4000', ten);
  ASSERT fifteen BETWEEN 130 AND 270, format('T2 15%% tier got %s/4000', fifteen);
END $$;

-- T3: weights that don't sum to 100 are normalised, not broken
DO $$ DECLARE n int; BEGIN
  UPDATE welcome_offer_tiers SET target_percent = 0 WHERE discount_value IN (10, 15);
  SELECT count(DISTINCT pick_welcome_tier()) INTO n FROM generate_series(1, 200);
  ASSERT n = 1, format('T3 only the 5%% tier should be picked, got %s distinct', n);
  UPDATE welcome_offer_tiers SET target_percent = CASE discount_value WHEN 10 THEN 15 WHEN 15 THEN 5 END
    WHERE discount_value IN (10, 15);
END $$;

-- T4: a new auth user gets exactly one welcome coupon with the right shape
DO $$ DECLARE uid uuid := gen_random_uuid(); c coupons%ROWTYPE; BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (uid, 'welcome-test-' || uid || '@example.com', '{"name":"T","phone":"9999999999"}', 'authenticated', 'authenticated');
  SELECT * INTO c FROM coupons WHERE assigned_user_id = uid;
  ASSERT FOUND, 'T4 welcome coupon not issued';
  ASSERT c.kind = 'welcome', 'T4 kind';
  ASSERT c.code ~ '^DENY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$', format('T4 bad code %s', c.code);
  ASSERT c.max_uses = 1 AND c.per_user_limit = 1, 'T4 single use';
  ASSERT c.welcome_tier_id IS NOT NULL, 'T4 tier recorded';
  -- second call is a no-op
  ASSERT issue_welcome_coupon(uid) IS NULL, 'T4 second issue must be a no-op';
  ASSERT (SELECT count(*) FROM coupons WHERE assigned_user_id = uid) = 1, 'T4 exactly one';
END $$;

-- T5: disabled offer issues nothing
DO $$ DECLARE uid uuid := gen_random_uuid(); BEGIN
  UPDATE welcome_offer_settings SET enabled = false;
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (uid, 'welcome-off-' || uid || '@example.com', '{}', 'authenticated', 'authenticated');
  ASSERT NOT EXISTS (SELECT 1 FROM coupons WHERE assigned_user_id = uid), 'T5 disabled offer issued a coupon';
END $$;

-- T6: codes are normalised to upper case
DO $$ BEGIN
  INSERT INTO coupons (code, discount_type, discount_value) VALUES ('  summer10 ', 'percent', 10);
  ASSERT EXISTS (SELECT 1 FROM coupons WHERE code = 'SUMMER10'), 'T6 code not normalised';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Run: paste the file into Supabase SQL Editor → Run.
Expected: FAIL with `relation "welcome_offer_tiers" does not exist`.

- [ ] **Step 3: Write the migration** — `supabase/migrations/20261007000001_coupons_welcome_offer.sql`

```sql
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
BEGIN
  SELECT * INTO s FROM welcome_offer_settings LIMIT 1;
  IF NOT FOUND OR NOT s.enabled THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM coupons WHERE kind = 'welcome' AND assigned_user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO t FROM welcome_offer_tiers WHERE id = pick_welcome_tier();
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
```

- [ ] **Step 4: Apply the migration, then run the test to verify it passes**

Run: SQL Editor → run the migration file, then run `supabase/tests/20261007_welcome_offer_test.sql`.
Expected: `ROLLBACK` with no assertion error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261007000001_coupons_welcome_offer.sql supabase/tests/20261007_welcome_offer_test.sql
git commit -m "feat(db): admin coupons + welcome offer issued on signup"
```

---

### Task 2: Database — server quote, payment quotes, order policy, redemptions

**Files:**
- Create: `supabase/migrations/20261007000002_order_quote_and_redemptions.sql`
- Create: `supabase/tests/20261007_quote_order_test.sql`

**Interfaces:**
- Consumes: Task 1 tables; existing `customer_loyalty_discount(uuid, numeric)`, `items_match_catalog_prices(jsonb)`, `verified_payments`, `settings.cod_*`, `loyalty_settings.free_shipping`.
- Produces (SQL):
  - `orders.coupon_code text`, `orders.coupon_discount numeric(10,2) NOT NULL DEFAULT 0`
  - table `payment_quotes(razorpay_order_id text PK, user_id uuid, items_key text, coupon_code text, subtotal, loyalty_discount, coupon_discount, shipping, total, payment_type text ('full'|'cod_advance'), cod_advance, created_at)`
  - `order_items_key(p_items jsonb) → text`
  - `coupon_evaluate(p_user uuid, p_code text, p_subtotal numeric) → TABLE(coupon_id uuid, code text, discount numeric, error text, min_order numeric)` (internal)
  - `quote_order(p_items jsonb, p_coupon_code text DEFAULT NULL) → jsonb` with keys `subtotal, loyalty_discount, coupon_code, coupon_discount, coupon_error, coupon_min_order, shipping, total, cod_available, cod_advance, cod_advance_percent`
  - `p_items` element shape: `{"slug": text, "variantId": text|null, "qty": int}`
  - Coupon error codes: `not_found, inactive, not_started, expired, not_yours, already_used, limit_reached, first_order_only, min_order`
  - `order_matches_payment_quote(...)`, trigger `trg_orders_record_coupon`

- [ ] **Step 1: Write the failing test** — `supabase/tests/20261007_quote_order_test.sql`

```sql
-- Run in Supabase SQL Editor after Task 1. Leaves no data behind.
BEGIN;

CREATE TEMP TABLE ctx ON COMMIT DROP AS
SELECT gen_random_uuid() AS uid, gen_random_uuid() AS other_uid,
       (SELECT slug FROM products WHERE price > 0 ORDER BY price LIMIT 1) AS slug,
       (SELECT price FROM products WHERE price > 0 ORDER BY price LIMIT 1) AS price;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
SELECT uid, 'quote-' || uid || '@example.com', '{}', 'authenticated', 'authenticated' FROM ctx
UNION ALL
SELECT other_uid, 'quote-' || other_uid || '@example.com', '{}', 'authenticated', 'authenticated' FROM ctx;

SELECT set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) FROM ctx;

-- general coupons used by the tests
INSERT INTO coupons (code, discount_type, discount_value) VALUES ('TEST10', 'percent', 10);
INSERT INTO coupons (code, discount_type, discount_value, max_discount) VALUES ('TESTCAP', 'percent', 50, 20);
INSERT INTO coupons (code, discount_type, discount_value, expires_at) VALUES ('TESTOLD', 'fixed', 50, now() - interval '1 day');
INSERT INTO coupons (code, discount_type, discount_value, starts_at) VALUES ('TESTSOON', 'fixed', 50, now() + interval '1 day');
INSERT INTO coupons (code, discount_type, discount_value, min_order) VALUES ('TESTMIN', 'fixed', 50, 999999);
INSERT INTO coupons (code, discount_type, discount_value, is_active) VALUES ('TESTOFF', 'fixed', 50, false);
INSERT INTO coupons (code, discount_type, discount_value, max_uses, used_count) VALUES ('TESTFULL', 'fixed', 50, 5, 5);

-- T1: plain quote = DB price × qty, no coupon
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 2)), NULL);
  ASSERT (q->>'subtotal')::numeric = c.price * 2, format('T1 subtotal %s', q);
  ASSERT (q->>'coupon_discount')::numeric = 0, 'T1 no coupon discount';
  ASSERT (q->>'total')::numeric = (q->>'subtotal')::numeric - (q->>'loyalty_discount')::numeric + (q->>'shipping')::numeric, 'T1 total formula';
END $$;

-- T2: percent coupon, lower-case input accepted
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), ' test10 ');
  ASSERT q->>'coupon_error' IS NULL, format('T2 error %s', q->>'coupon_error');
  ASSERT q->>'coupon_code' = 'TEST10', 'T2 normalised code';
  ASSERT (q->>'coupon_discount')::numeric = round(c.price * 0.10), format('T2 discount %s', q->>'coupon_discount');
END $$;

-- T3: ₹ cap
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), 'TESTCAP');
  ASSERT (q->>'coupon_discount')::numeric = LEAST(20, round(c.price * 0.5)), format('T3 cap %s', q->>'coupon_discount');
END $$;

-- T4: every rejection returns its code and a zero discount
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; code text; expected text; BEGIN
  SELECT * INTO c FROM ctx;
  FOR code, expected IN VALUES
    ('NOPE123', 'not_found'), ('TESTOLD', 'expired'), ('TESTSOON', 'not_started'),
    ('TESTMIN', 'min_order'), ('TESTOFF', 'inactive'), ('TESTFULL', 'limit_reached')
  LOOP
    q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), code);
    ASSERT q->>'coupon_error' = expected, format('T4 %s → %s, expected %s', code, q->>'coupon_error', expected);
    ASSERT (q->>'coupon_discount')::numeric = 0, format('T4 %s discount must be 0', code);
  END LOOP;
END $$;

-- T5: someone else's welcome coupon is rejected; own one works
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; other_code text; own_code text; BEGIN
  SELECT * INTO c FROM ctx;
  SELECT code INTO other_code FROM coupons WHERE assigned_user_id = c.other_uid;
  SELECT code INTO own_code FROM coupons WHERE assigned_user_id = c.uid;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), other_code);
  ASSERT q->>'coupon_error' = 'not_yours', format('T5 other → %s', q->>'coupon_error');
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), own_code);
  ASSERT q->>'coupon_error' IS NULL, format('T5 own → %s', q->>'coupon_error');
END $$;

-- T6: unknown product and bad qty raise
DO $$ BEGIN
  BEGIN
    PERFORM quote_order('[{"slug":"no-such-product-xyz","variantId":null,"qty":1}]'::jsonb, NULL);
    ASSERT false, 'T6 unknown item should raise';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    PERFORM quote_order(jsonb_build_array(jsonb_build_object('slug', (SELECT slug FROM ctx), 'variantId', null, 'qty', 0)), NULL);
    ASSERT false, 'T6 qty 0 should raise';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;

-- T7: items key ignores line order
DO $$ BEGIN
  ASSERT order_items_key('[{"slug":"b","variantId":null,"qty":1},{"slug":"a","variantId":"v1","qty":2}]')
       = order_items_key('[{"slug":"a","variantId":"v1","qty":2},{"slug":"b","variantId":null,"qty":1}]'), 'T7 order-insensitive';
END $$;

-- T8: order must match the stored quote
DO $$ DECLARE c ctx%ROWTYPE; items jsonb; q jsonb; BEGIN
  SELECT * INTO c FROM ctx;
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1));
  q := quote_order(items, 'TEST10');
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T8', c.uid, order_items_key(items), 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T8', 'order_T8', round((q->>'total')::numeric * 100)::integer);

  ASSERT order_matches_payment_quote('pay_T8', c.uid, items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL), 'T8 exact match accepted';
  ASSERT NOT order_matches_payment_quote('pay_T8', c.uid, items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric + 100, (q->>'shipping')::numeric, (q->>'total')::numeric - 100, 'razorpay', NULL), 'T8 forged coupon rejected';
  ASSERT NOT order_matches_payment_quote('pay_T8', c.uid,
    jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 5)), 'TEST10', (q->>'subtotal')::numeric,
    (q->>'loyalty_discount')::numeric, (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL),
    'T8 different cart rejected';
  ASSERT NOT order_matches_payment_quote('pay_T8', c.other_uid, items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL), 'T8 other user rejected';
END $$;

-- T9: redemption trigger records use even when the coupon is already full
DO $$ DECLARE c ctx%ROWTYPE; before_count int; BEGIN
  SELECT * INTO c FROM ctx;
  UPDATE coupons SET max_uses = 1, used_count = 1 WHERE code = 'TEST10';
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, total, address, payment_id, coupon_code, coupon_discount)
  VALUES ('SDTEST9', c.uid, 'x@example.com', '[]', 100, 0, 0, 90, '{}', 'pay_T9', 'TEST10', 10);
  ASSERT (SELECT used_count FROM coupons WHERE code = 'TEST10') = 2, 'T9 used_count incremented past limit';
  ASSERT EXISTS (SELECT 1 FROM coupon_redemptions WHERE order_id = 'SDTEST9' AND code = 'TEST10' AND discount_amount = 10), 'T9 redemption row';
END $$;

-- T10: after one use, the user's own welcome coupon reports already_used
DO $$ DECLARE c ctx%ROWTYPE; own_code text; q jsonb; BEGIN
  SELECT * INTO c FROM ctx;
  SELECT code INTO own_code FROM coupons WHERE assigned_user_id = c.uid;
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, total, address, payment_id, coupon_code, coupon_discount)
  VALUES ('SDTEST10', c.uid, 'x@example.com', '[]', 100, 0, 0, 95, '{}', 'pay_T10', own_code, 5);
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), own_code);
  ASSERT q->>'coupon_error' IN ('already_used', 'first_order_only'), format('T10 → %s', q->>'coupon_error');
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Run: SQL Editor → run the test file.
Expected: FAIL with `function quote_order(jsonb, unknown) does not exist`.

- [ ] **Step 3: Write the migration** — `supabase/migrations/20261007000002_order_quote_and_redemptions.sql`

```sql
-- ============================================================
-- Migration: server-computed checkout quote, coupon validation,
-- payment ↔ quote binding, coupon redemption bookkeeping.
--
-- razorpay-create-order now prices the cart with quote_order() and
-- stores what it charged in payment_quotes. The orders INSERT policy
-- requires the saved order to equal that stored quote, so a customer
-- cannot pay for one cart/coupon and save another.
--
-- order_matches_payment_quote() is SECURITY DEFINER because the
-- verified_payments and payment_quotes tables are policy-less (service
-- role only): a plain subquery inside an RLS policy runs as the
-- customer and would see zero rows.
--
-- Loyalty is unchanged — customer_loyalty_discount() is only called.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code     text,
  ADD COLUMN IF NOT EXISTS coupon_discount numeric(10,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_coupon_discount_check
    CHECK (coupon_discount >= 0 AND coupon_discount <= subtotal) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_quotes (
  razorpay_order_id text PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items_key         text NOT NULL,
  coupon_code       text,
  subtotal          numeric(10,2) NOT NULL,
  loyalty_discount  numeric(10,2) NOT NULL,
  coupon_discount   numeric(10,2) NOT NULL,
  shipping          numeric(10,2) NOT NULL,
  total             numeric(10,2) NOT NULL,
  payment_type      text NOT NULL CHECK (payment_type IN ('full', 'cod_advance')),
  cod_advance       numeric(10,2) NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_quotes ENABLE ROW LEVEL SECURITY;  -- no policies: service role only

-- Order-insensitive fingerprint of a cart: "slug|variant|qty" sorted.
CREATE OR REPLACE FUNCTION order_items_key(p_items jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(string_agg(k, ',' ORDER BY k), '')
  FROM (
    SELECT format('%s|%s|%s',
                  e->>'slug',
                  COALESCE(NULLIF(e->>'variantId', ''), '-'),
                  (e->>'qty')::int) AS k
    FROM jsonb_array_elements(p_items) e
  ) s;
$$;

CREATE OR REPLACE FUNCTION coupon_evaluate(p_user uuid, p_code text, p_subtotal numeric)
RETURNS TABLE (coupon_id uuid, code text, discount numeric, error text, min_order numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c coupons%ROWTYPE;
  d numeric;
BEGIN
  SELECT * INTO c FROM coupons WHERE coupons.code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, upper(btrim(p_code)), 0::numeric, 'not_found'::text, NULL::numeric; RETURN;
  END IF;

  IF NOT c.is_active THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'inactive'::text, c.min_order; RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'not_started'::text, c.min_order; RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'expired'::text, c.min_order; RETURN;
  END IF;
  IF c.kind = 'welcome' AND c.assigned_user_id IS DISTINCT FROM p_user THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'not_yours'::text, c.min_order; RETURN;
  END IF;
  IF c.per_user_limit IS NOT NULL AND (
       SELECT count(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.user_id = p_user
     ) >= c.per_user_limit THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'already_used'::text, c.min_order; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'limit_reached'::text, c.min_order; RETURN;
  END IF;
  IF c.first_order_only AND EXISTS (
       SELECT 1 FROM orders o WHERE o.user_id = p_user AND o.status NOT IN ('CANCELLED', 'REFUNDED')
     ) THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'first_order_only'::text, c.min_order; RETURN;
  END IF;
  IF c.min_order IS NOT NULL AND p_subtotal < c.min_order THEN
    RETURN QUERY SELECT c.id, c.code, 0::numeric, 'min_order'::text, c.min_order; RETURN;
  END IF;

  d := CASE WHEN c.discount_type = 'percent'
            THEN round(p_subtotal * c.discount_value / 100)
            ELSE c.discount_value END;
  IF c.max_discount IS NOT NULL THEN d := LEAST(d, c.max_discount); END IF;
  d := GREATEST(0, LEAST(d, p_subtotal));
  RETURN QUERY SELECT c.id, c.code, d, NULL::text, c.min_order;
END;
$$;

CREATE OR REPLACE FUNCTION quote_order(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  e jsonb;
  qty int;
  price numeric;
  v_subtotal numeric := 0;
  v_loyalty numeric;
  v_coupon_code text;
  v_coupon_discount numeric := 0;
  v_coupon_error text;
  v_coupon_min numeric;
  v_free_ship numeric;
  v_shipping numeric;
  v_total numeric;
  st RECORD;
  ev RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
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
    v_subtotal := v_subtotal + price * qty;
  END LOOP;

  v_loyalty := COALESCE(customer_loyalty_discount(uid, v_subtotal), 0);

  IF NULLIF(btrim(COALESCE(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO ev FROM coupon_evaluate(uid, p_coupon_code, v_subtotal);
    v_coupon_code := ev.code;
    v_coupon_error := ev.error;
    v_coupon_min := ev.min_order;
    IF ev.error IS NULL THEN
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
    'subtotal', v_subtotal,
    'loyalty_discount', v_loyalty,
    'coupon_code', v_coupon_code,
    'coupon_discount', v_coupon_discount,
    'coupon_error', v_coupon_error,
    'coupon_min_order', v_coupon_min,
    'shipping', v_shipping,
    'total', v_total,
    'cod_available', COALESCE(st.cod_enabled, true) AND v_total >= COALESCE(st.cod_min_order, 0),
    'cod_advance', round(v_total * COALESCE(st.cod_advance_percent, 20) / 100),
    'cod_advance_percent', COALESCE(st.cod_advance_percent, 20)
  );
END;
$$;

CREATE OR REPLACE FUNCTION order_matches_payment_quote(
  p_payment_id text, p_user uuid, p_items jsonb, p_coupon_code text,
  p_subtotal numeric, p_discount numeric, p_coupon_discount numeric,
  p_shipping numeric, p_total numeric, p_payment_method text, p_cod_advance numeric
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM verified_payments vp
    JOIN payment_quotes q ON q.razorpay_order_id = vp.razorpay_order_id
    WHERE vp.payment_id = p_payment_id
      AND vp.used = false
      AND q.user_id = p_user
      AND q.items_key = order_items_key(p_items)
      AND q.coupon_code IS NOT DISTINCT FROM p_coupon_code
      AND q.subtotal = p_subtotal
      AND q.loyalty_discount = p_discount
      AND q.coupon_discount = p_coupon_discount
      AND q.shipping = p_shipping
      AND q.total = p_total
      AND (
        (p_payment_method = 'razorpay' AND q.payment_type = 'full'
          AND vp.amount_paise = round(q.total * 100)::integer)
        OR (p_payment_method = 'cod' AND q.payment_type = 'cod_advance'
          AND p_cod_advance = q.cod_advance
          AND vp.amount_paise = round(q.cod_advance * 100)::integer)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION coupon_evaluate(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION quote_order(jsonb, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION quote_order(jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION order_matches_payment_quote(text, uuid, jsonb, text, numeric, numeric, numeric, numeric, numeric, text, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION order_matches_payment_quote(text, uuid, jsonb, text, numeric, numeric, numeric, numeric, numeric, text, numeric) TO authenticated;

-- ── orders INSERT policy: 20260812000009's list, quote check replaces
--    the direct loyalty + verified_payments checks (same guarantees,
--    plus coupon/total/cart binding). ──────────────────────────
DROP POLICY IF EXISTS "orders: customers insert own" ON orders;

DO $$ BEGIN
  CREATE POLICY "orders: customers insert own" ON orders
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      AND status = 'PLACED'
      AND refund_amount IS NULL
      AND refunded_at IS NULL
      AND cancelled_at IS NULL
      AND shiprocket_order_id IS NULL
      AND shiprocket_shipment_id IS NULL
      AND awb_number IS NULL
      AND courier_name IS NULL
      AND tracking_url IS NULL
      AND shipped_at IS NULL
      AND delivered_at IS NULL
      AND rto_initiated_at IS NULL
      AND return_status IS NULL
      AND return_reason IS NULL
      AND return_requested_at IS NULL
      AND shiprocket_return_order_id IS NULL
      AND shiprocket_return_shipment_id IS NULL
      AND return_awb_number IS NULL
      AND return_courier_name IS NULL
      AND return_tracking_url IS NULL
      AND return_received_at IS NULL
      AND replacement_order_id IS NULL
      AND payment_id IS NOT NULL
      AND items_match_catalog_prices(items)
      AND order_matches_payment_quote(
        payment_id, auth.uid(), items, coupon_code,
        subtotal, discount, coupon_discount, shipping, total,
        payment_method, cod_advance_amount
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── redemption bookkeeping ──────────────────────────────────
CREATE OR REPLACE FUNCTION record_coupon_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid;
BEGIN
  IF NEW.coupon_code IS NULL OR NEW.coupon_discount <= 0 THEN RETURN NEW; END IF;
  BEGIN
    SELECT id INTO cid FROM coupons WHERE code = NEW.coupon_code FOR UPDATE;
    IF cid IS NOT NULL THEN
      UPDATE coupons SET used_count = used_count + 1 WHERE id = cid;
    END IF;
    INSERT INTO coupon_redemptions (coupon_id, code, user_id, order_id, discount_amount)
    VALUES (cid, NEW.coupon_code, NEW.user_id, NEW.id, NEW.coupon_discount)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Bookkeeping must never block a paid order.
    RAISE WARNING '[record_coupon_redemption] order=% err=%', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_orders_record_coupon
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION record_coupon_redemption();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 4: Apply the migration, then run the test to verify it passes**

Run: SQL Editor → run the migration, then `supabase/tests/20261007_quote_order_test.sql`.
Expected: `ROLLBACK` with no assertion error.

**Deploy order warning:** this migration makes the orders policy require a `payment_quotes` row, which only the new `razorpay-create-order` (Task 3) writes. Apply this migration and deploy Task 3's edge function + frontend together, or checkout will refuse to save orders in between.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261007000002_order_quote_and_redemptions.sql supabase/tests/20261007_quote_order_test.sql
git commit -m "feat(db): server checkout quote, coupon validation, payment-quote binding"
```

---

### Task 3: Checkout — server quote, coupon box, payment bound to quote

**Files:**
- Modify: `src/types/database.ts` (Coupon type, DBOrder, new table types, Database.Tables entries)
- Create: `src/lib/coupons.ts`
- Modify: `supabase/functions/razorpay-create-order/index.ts`
- Modify: `src/lib/razorpay.ts`
- Modify: `src/lib/orders.ts` (Order type, mapRow, recomputeTotal, createOrder)
- Modify: `src/routes/checkout.tsx`
- Modify: `src/routes/order.$id.tsx:161`, `src/routes/invoice.$id.tsx:115`, `src/routes/admin.invoice.$id.tsx:90`

**Interfaces:**
- Consumes: `quote_order` jsonb shape and error codes from Task 2.
- Produces (TS):
  - `type QuoteLine = { slug: string; variantId: string | null; qty: number }`
  - `type CouponError = "not_found" | "inactive" | "not_started" | "expired" | "not_yours" | "already_used" | "limit_reached" | "first_order_only" | "min_order"`
  - `type OrderQuote = { subtotal: number; loyalty_discount: number; coupon_code: string | null; coupon_discount: number; coupon_error: CouponError | null; coupon_min_order: number | null; shipping: number; total: number; cod_available: boolean; cod_advance: number; cod_advance_percent: number }`
  - `quoteLines(items: CartItem[]): QuoteLine[]`
  - `fetchQuote(lines: QuoteLine[], couponCode: string | null): Promise<OrderQuote>`
  - `couponErrorMessage(err: CouponError, minOrder: number | null): string`
  - `myWelcomeCoupon(): Promise<Coupon | null>`
  - `couponLabel(c: Pick<Coupon, "discount_type" | "discount_value">): string` → `"10% OFF"` / `"₹200 OFF"`
  - `openRazorpay({ checkout: { items: QuoteLine[]; couponCode: string | null; paymentType: "full" | "cod_advance" }, …, onSuccess(paymentId: string, quote: OrderQuote) })`
  - `createOrder({ email, userId, items, address, paymentId, quote: OrderQuote, payment_method, cod_advance_paid? })`
  - `Order.couponCode?: string`, `Order.couponDiscount: number`

- [ ] **Step 1: Types** — in `src/types/database.ts` replace the `Coupon` type and add the new types after it:

```ts
export type Coupon = {
  id: string;
  code: string;
  kind: "general" | "welcome";
  assigned_user_id: string | null;
  welcome_tier_id: string | null;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number | null;
  max_discount: number | null;
  max_uses: number | null;
  per_user_limit: number | null;
  first_order_only: boolean;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WelcomeOfferTier = {
  id: string;
  label: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  target_percent: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WelcomeOfferSettings = {
  id: string;
  enabled: boolean;
  code_prefix: string;
  valid_days: number | null;
  min_order: number | null;
  max_discount: number | null;
  first_order_only: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponRedemption = {
  id: string;
  coupon_id: string | null;
  code: string;
  user_id: string | null;
  order_id: string;
  discount_amount: number;
  created_at: string;
};
```

Change the `coupons` entry in `Database.public.Tables` to:

```ts
      coupons: {
        Row: Coupon;
        Insert: Omit<Coupon, "id" | "created_at" | "updated_at" | "used_count"> & Partial<Pick<Coupon, "used_count">>;
        Update: Partial<Omit<Coupon, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      welcome_offer_tiers: {
        Row: WelcomeOfferTier;
        Insert: Omit<WelcomeOfferTier, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WelcomeOfferTier, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      welcome_offer_settings: {
        Row: WelcomeOfferSettings;
        Insert: Omit<WelcomeOfferSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WelcomeOfferSettings, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      coupon_redemptions: {
        Row: CouponRedemption;
        Insert: Omit<CouponRedemption, "id" | "created_at">;
        Update: Partial<Omit<CouponRedemption, "id" | "created_at">>;
        Relationships: [];
      };
```

In `DBOrder` add after `discount: number;`:

```ts
  coupon_code: string | null;
  coupon_discount: number;
```

- [ ] **Step 2: Coupon client lib** — create `src/lib/coupons.ts`:

```ts
import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/context/CartContext";
import type { Coupon } from "@/types/database";

export type QuoteLine = { slug: string; variantId: string | null; qty: number };

export type CouponError =
  | "not_found" | "inactive" | "not_started" | "expired" | "not_yours"
  | "already_used" | "limit_reached" | "first_order_only" | "min_order";

export type OrderQuote = {
  subtotal: number;
  loyalty_discount: number;
  coupon_code: string | null;
  coupon_discount: number;
  coupon_error: CouponError | null;
  coupon_min_order: number | null;
  shipping: number;
  total: number;
  cod_available: boolean;
  cod_advance: number;
  cod_advance_percent: number;
};

export const quoteLines = (items: CartItem[]): QuoteLine[] =>
  items.map((i) => ({ slug: i.product.slug, variantId: i.variantId ?? null, qty: i.qty }));

// Postgres numerics arrive as numbers or numeric strings depending on the
// driver path; normalise once here so callers can do arithmetic.
export function toQuote(raw: Record<string, unknown>): OrderQuote {
  const n = (v: unknown) => Number(v ?? 0);
  return {
    subtotal: n(raw.subtotal),
    loyalty_discount: n(raw.loyalty_discount),
    coupon_code: (raw.coupon_code as string | null) ?? null,
    coupon_discount: n(raw.coupon_discount),
    coupon_error: (raw.coupon_error as CouponError | null) ?? null,
    coupon_min_order: raw.coupon_min_order == null ? null : n(raw.coupon_min_order),
    shipping: n(raw.shipping),
    total: n(raw.total),
    cod_available: Boolean(raw.cod_available),
    cod_advance: n(raw.cod_advance),
    cod_advance_percent: n(raw.cod_advance_percent),
  };
}

export async function fetchQuote(lines: QuoteLine[], couponCode: string | null): Promise<OrderQuote> {
  const { data, error } = await supabase.rpc("quote_order" as never, { p_items: lines, p_coupon_code: couponCode } as never);
  if (error) throw new Error(error.message);
  return toQuote(data as unknown as Record<string, unknown>);
}

export function couponErrorMessage(err: CouponError, minOrder: number | null): string {
  switch (err) {
    case "not_found": return "That code doesn't exist.";
    case "inactive": return "That code is switched off.";
    case "not_started": return "That code isn't active yet.";
    case "expired": return "That code has expired.";
    case "not_yours": return "That code belongs to another account.";
    case "already_used": return "You've already used that code.";
    case "limit_reached": return "That code has been fully used.";
    case "first_order_only": return "That code is for your first order only.";
    case "min_order": return `Add items worth ₹${(minOrder ?? 0).toLocaleString("en-IN")} or more to use that code.`;
  }
}

export const couponLabel = (c: Pick<Coupon, "discount_type" | "discount_value">): string =>
  c.discount_type === "percent"
    ? `${Number(c.discount_value)}% OFF`
    : `₹${Number(c.discount_value).toLocaleString("en-IN")} OFF`;

/** The signed-in user's welcome coupon (RLS: owner can read their own). */
export async function myWelcomeCoupon(): Promise<Coupon | null> {
  const { data } = await supabase.from("coupons").select("*").eq("kind", "welcome").maybeSingle();
  return (data as Coupon | null) ?? null;
}

export function couponStatus(c: Coupon): "active" | "used" | "expired" | "inactive" {
  if (c.max_uses != null && c.used_count >= c.max_uses) return "used";
  if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return "expired";
  if (!c.is_active) return "inactive";
  return "active";
}
```

Note: `myWelcomeCoupon` filters only on `kind` — RLS returns only the caller's own welcome coupon to customers. For an admin account it could match many rows; `.maybeSingle()` then errors and the function returns `null`, which is the right behaviour on the storefront.

- [ ] **Step 3: Edge function** — replace the body-parsing and order-creation part of `supabase/functions/razorpay-create-order/index.ts`. Keep the CORS, `requireEnv`, rate-limit code as is; replace everything from `const razorpayKeyId = …` to the final success `return` with:

```ts
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Log in to pay" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const razorpayKeyId = requireEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = requireEnv("RAZORPAY_KEY_SECRET");
    const { items, coupon_code = null, payment_type, notes } = await req.json();

    if (!Array.isArray(items) || items.length === 0 || (payment_type !== "full" && payment_type !== "cod_advance")) {
      return new Response(JSON.stringify({ error: "Invalid checkout request" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Price the cart server-side as the customer (auth.uid() inside quote_order).
    const { data: quote, error: quoteErr } = await authedClient.rpc("quote_order", {
      p_items: items,
      p_coupon_code: coupon_code,
    });
    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: quoteErr?.message ?? "Could not price your bag" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (coupon_code && quote.coupon_error) {
      return new Response(JSON.stringify({ error: "coupon_invalid", coupon_error: quote.coupon_error }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (payment_type === "cod_advance" && !quote.cod_available) {
      return new Response(JSON.stringify({ error: "Cash on delivery isn't available for this order" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const chargeRupees = payment_type === "cod_advance" ? Number(quote.cod_advance) : Number(quote.total);
    const amount = Math.round(chargeRupees * 100);
    if (!Number.isInteger(amount) || amount < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", notes, receipt: `rcpt_${Date.now()}` }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("razorpay-create-order: Razorpay API error", res.status, json);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // The orders INSERT policy only accepts an order equal to this stored quote.
    // The cart fingerprint comes from the same SQL function the policy uses,
    // so the two can never disagree.
    const { data: itemsKey, error: keyErr } = await supabase.rpc("order_items_key", { p_items: items });
    if (keyErr || typeof itemsKey !== "string") {
      console.error("razorpay-create-order: order_items_key failed", keyErr?.message);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { error: quoteSaveErr } = await supabase.from("payment_quotes").insert({
      razorpay_order_id: json.id,
      user_id: userData.user.id,
      items_key: itemsKey,
      coupon_code: quote.coupon_code,
      subtotal: quote.subtotal,
      loyalty_discount: quote.loyalty_discount,
      coupon_discount: quote.coupon_discount,
      shipping: quote.shipping,
      total: quote.total,
      payment_type,
      cod_advance: quote.cod_advance,
    });
    if (quoteSaveErr) {
      console.error("razorpay-create-order: payment_quotes insert failed", quoteSaveErr.message);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ order_id: json.id, amount: json.amount, currency: json.currency, quote }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
```

`supabase` here is the existing service-role client; `authedClient` is the existing caller-JWT client (both already created at the top of the handler).

- [ ] **Step 4: Razorpay client** — in `src/lib/razorpay.ts` replace `createRazorpayOrder` and `RzpOpts`, and the two lines in `openRazorpay` that use them:

```ts
import { toQuote, type OrderQuote, type QuoteLine, type CouponError } from "@/lib/coupons";

export class CouponRejectedError extends Error {
  constructor(public couponError: CouponError) { super("coupon_invalid"); }
}

type CheckoutRequest = { items: QuoteLine[]; couponCode: string | null; paymentType: "full" | "cod_advance" };

async function createRazorpayOrder(
  checkout: CheckoutRequest,
  notes?: Record<string, string>,
): Promise<{ orderId: string; amountPaise: number; quote: OrderQuote }> {
  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: { items: checkout.items, coupon_code: checkout.couponCode, payment_type: checkout.paymentType, notes },
  });
  if (error) {
    // supabase-js hides non-2xx bodies behind error.context (a Response).
    let body: { error?: string; coupon_error?: CouponError } = {};
    try { body = await (error as { context?: Response }).context?.json(); } catch { /* keep {} */ }
    if (body.error === "coupon_invalid" && body.coupon_error) throw new CouponRejectedError(body.coupon_error);
    throw new Error(body.error ?? "Could not start payment — try again");
  }
  if (!data?.order_id) throw new Error("Could not start payment — try again");
  return { orderId: data.order_id as string, amountPaise: Number(data.amount), quote: toQuote(data.quote) };
}

export type RzpOpts = {
  checkout: CheckoutRequest;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  onSuccess: (paymentId: string, quote: OrderQuote) => void | Promise<void>;
  onDismiss: () => void;
  onVerifyFailed: (message: string) => void;
};
```

In `openRazorpay` change:

```ts
  const { orderId, amountPaise, quote } = await createRazorpayOrder(opts.checkout, opts.notes);
```

and in the Razorpay options use `amount: amountPaise,` and in the handler `await opts.onSuccess(resp.razorpay_payment_id, quote);`.

- [ ] **Step 5: Orders lib** — in `src/lib/orders.ts`:

Add to `Order` after `discount: number;`:

```ts
  couponCode?: string;
  couponDiscount: number;
```

In `mapRow` after `discount: Number(row.discount),`:

```ts
    couponCode: row.coupon_code ?? undefined,
    couponDiscount: Number(row.coupon_discount ?? 0),
```

Replace `recomputeTotal`:

```ts
export const recomputeTotal = (o: Order): number => {
  const tax = Math.round((o.subtotal * (o.taxRate || 0)) / 100);
  const extras = (o.extraLines || []).reduce((s, l) => s + l.amount, 0);
  return Math.max(0, o.subtotal + o.shipping + tax + extras - (o.discount || 0) - (o.couponDiscount || 0));
};
```

Replace `createOrder`'s params and the money fields (keep the `order_items` sync below unchanged). Add `import type { OrderQuote } from "@/lib/coupons";` at the top.

```ts
export async function createOrder(params: {
  email: string;
  userId?: string;
  items: CartItem[];
  address: Order["address"];
  paymentId: string;
  quote: OrderQuote;
  payment_method?: Order["payment_method"];
  cod_advance_paid?: boolean;
}): Promise<Order> {
  const id = "SD" + Date.now().toString(36).toUpperCase();
  const { quote } = params;
  const isCod = params.payment_method === "cod";
  const items = params.items.map((i) => ({
    slug: i.product.slug, name: i.product.name, image: i.product.image,
    size: i.size, qty: i.qty, price: i.product.price,
    variantId: i.variantId ?? null,
  }));

  const { data, error } = await supabase
    .from("orders")
    .insert({
      id,
      user_id: params.userId ?? null,
      user_email: params.email,
      items: items as unknown as DBOrder["items"],
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      tax_rate: 0,
      tax: 0,
      discount: quote.loyalty_discount,
      coupon_code: quote.coupon_code,
      coupon_discount: quote.coupon_discount,
      extra_lines: [],
      total: quote.total,
      status: "PLACED",
      address: params.address,
      payment_id: params.paymentId,
      payment_method: params.payment_method ?? "razorpay",
      cod_advance_paid: params.cod_advance_paid ?? false,
      cod_advance_amount: isCod ? quote.cod_advance : null,
    } as any)
    .select()
    .single();
```

- [ ] **Step 6: Checkout page** — in `src/routes/checkout.tsx`:

Imports: add `import { fetchQuote, quoteLines, couponErrorMessage, couponLabel, couponStatus, myWelcomeCoupon, type OrderQuote } from "@/lib/coupons";`, `import { CouponRejectedError } from "@/lib/razorpay";` (merge with the existing `openRazorpay` import), and `Tag, X` to the lucide import. Remove the `CodSettings` type and its `useEffect` fetch of `settings` (the quote now carries COD data).

Replace lines 64–100 (state + client money math + COD settings) with:

```tsx
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState<"razorpay" | "cod">("razorpay");

  // Loyalty tier is only used for the summary LABEL; the amount comes from the server quote.
  const [settings, setSettings] = useState(DEFAULT_LOYALTY_SETTINGS);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (user) ordersFor(user.email).then(setUserOrders);
  }, [user]);
  useEffect(() => { getLoyaltySettings().then(setSettings); }, []);
  const tier = tierFor(pointsFromOrders(userOrders));
  const discountPct = settings.discount[tier.name as keyof typeof settings.discount] ?? 0;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<Coupon | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    myWelcomeCoupon().then((c) => setWelcome(c && couponStatus(c) === "active" ? c : null));
  }, [user]);

  // Re-price whenever the bag or the applied code changes. The server is
  // the only place money is computed.
  const linesKey = JSON.stringify(quoteLines(items));
  useEffect(() => {
    if (!user || items.length === 0) return;
    let cancelled = false;
    setQuoteFailed(false);
    fetchQuote(quoteLines(items), appliedCoupon)
      .then((q) => {
        if (cancelled) return;
        if (appliedCoupon && q.coupon_error) {
          setCouponMsg(couponErrorMessage(q.coupon_error, q.coupon_min_order));
          setAppliedCoupon(null);
          return;
        }
        setQuote(q);
      })
      .catch(() => { if (!cancelled) setQuoteFailed(true); });
    return () => { cancelled = true; };
  }, [user, linesKey, appliedCoupon]);

  const applyCoupon = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setCouponMsg(null);
    setAppliedCoupon(c);
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponMsg(null); };

  const codAvailable = quote?.cod_available ?? false;

  useEffect(() => {
    if (!codAvailable && payMethod === "cod") setPayMethod("razorpay");
  }, [codAvailable]);
```

Add `import type { Coupon } from "@/types/database";`.

In `onSubmit`, before `setPaying(true)` add:

```tsx
    if (!quote) return toast.error("Still pricing your bag — try again in a second");
```

Replace both `openRazorpay({...})` calls. COD:

```tsx
        await openRazorpay({
          checkout: { items: quoteLines(items), couponCode: appliedCoupon, paymentType: "cod_advance" },
          name: "STUDIO DENY",
          description: `COD Advance — ${items.length} item(s)`,
          prefill: { name: data.name, email: data.email, contact: data.phone },
          notes: { city: data.city, pincode: data.pincode, payment_type: "cod_advance" },
          onDismiss: () => { setPaying(false); toast.error("Payment cancelled"); },
          onVerifyFailed: (message) => { setPaying(false); toast.error(message); },
          onSuccess: async (paymentId, paidQuote) => {
            try {
              const order = await createOrder({
                email: data.email, userId: user?.id, items, address, paymentId,
                quote: paidQuote,
                payment_method: "cod",
                cod_advance_paid: true,
              });
              recordAttempt("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
              toast.success("COD order placed! Advance paid.");
              clear();
              navigate({ to: "/order/$id", params: { id: order.id } });
            } catch {
              setPaying(false);
              toast.error(`Payment succeeded (${paymentId}) but saving the order failed. Contact support.`);
            }
          },
        });
```

Full payment: same shape with `paymentType: "full"`, `description: \`${items.length} item(s) — Drop 014\``, `notes: { city: data.city, pincode: data.pincode }`, `payment_method: "razorpay"` and no `cod_advance_paid`, success toast `"Payment successful"`.

In both `catch (e: any)` blocks, before the generic toast, add:

```tsx
        if (e instanceof CouponRejectedError) {
          setPaying(false);
          setCouponMsg(couponErrorMessage(e.couponError, null));
          setAppliedCoupon(null);
          return;
        }
```

Replace the summary block (old lines 341–374, from `<div className="border-t border-border mt-4 pt-4 …">` through the submit `</button>`) with:

```tsx
          {/* Coupon */}
          <div className="border-t border-border mt-4 pt-4">
            {appliedCoupon && quote?.coupon_code ? (
              <div className="flex items-center justify-between border border-primary/40 bg-primary/5 px-3 h-10">
                <span className="text-mono text-xs tracking-widest flex items-center gap-2"><Tag className="size-3.5" /> {quote.coupon_code}</span>
                <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(couponInput); } }}
                    placeholder="COUPON CODE"
                    className="flex-1 min-w-0 bg-background border border-border h-10 px-3 text-mono text-xs tracking-widest uppercase focus:border-primary outline-none"
                  />
                  <button type="button" onClick={() => applyCoupon(couponInput)} className="border border-border px-4 h-10 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary">
                    APPLY
                  </button>
                </div>
                {welcome && (
                  <button
                    type="button"
                    onClick={() => applyCoupon(welcome.code)}
                    className="mt-2 w-full text-left border border-dashed border-primary/50 px-3 py-2 text-xs hover:bg-primary/5"
                  >
                    Your welcome offer <span className="text-mono font-semibold">{welcome.code}</span> — {couponLabel(welcome)} · <span className="text-primary">APPLY</span>
                  </button>
                )}
              </>
            )}
            {couponMsg && <p className="text-xs text-primary mt-2">{couponMsg}</p>}
          </div>

          <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm text-mono">
            {!quote ? (
              <div className="text-muted-foreground text-xs">{quoteFailed ? "COULD NOT PRICE YOUR BAG — REFRESH" : "PRICING…"}</div>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">SUBTOTAL</span><span>{formatINR(quote.subtotal)}</span></div>
                {quote.loyalty_discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span className="flex items-center gap-1"><Sparkles className="size-3" /> {tier.name} −{discountPct}%</span>
                    <span>−{formatINR(quote.loyalty_discount)}</span>
                  </div>
                )}
                {quote.coupon_discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span className="flex items-center gap-1"><Tag className="size-3" /> {quote.coupon_code}</span>
                    <span>−{formatINR(quote.coupon_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">SHIPPING</span><span>{quote.shipping === 0 ? "FREE" : formatINR(quote.shipping)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span>TOTAL</span><span className="text-display text-2xl">{formatINR(quote.total)}</span>
                </div>
                {payMethod === "cod" && (
                  <div className="border border-primary/30 bg-primary/5 p-3 mt-2">
                    <div className="flex justify-between text-primary">
                      <span>PAY NOW (ADVANCE)</span><span>{formatINR(quote.cod_advance)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-xs mt-1">
                      <span>PAY ON DELIVERY</span><span>{formatINR(quote.total - quote.cod_advance)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={paying || !quote}
            className="w-full mt-5 bg-primary text-primary-foreground font-bold tracking-[0.2em] text-mono text-xs h-12 hover:glow-primary disabled:opacity-50"
          >
            {paying
              ? "PROCESSING…"
              : !quote
              ? "PRICING…"
              : payMethod === "cod"
              ? `PAY ADVANCE ${formatINR(quote.cod_advance)}`
              : `PAY ${formatINR(quote.total)}`}
          </button>
```

In the COD radio label replace `codSettings.cod_advance_percent` with `quote?.cod_advance_percent ?? 0` and `codAdvance` with `quote?.cod_advance ?? 0`.

- [ ] **Step 7: Show the coupon on order/invoice pages**

`src/routes/order.$id.tsx` after line 161 (the DISCOUNT row):

```tsx
              {order.couponDiscount ? <div className="flex justify-between text-muted-foreground"><span>COUPON {order.couponCode}</span><span>− {formatINR(order.couponDiscount)}</span></div> : null}
```

`src/routes/invoice.$id.tsx` after line 115:

```tsx
            {o.couponDiscount ? <Row k={`Coupon ${o.couponCode ?? ""}`} v={"− " + formatINR(o.couponDiscount)} /> : null}
```

`src/routes/admin.invoice.$id.tsx` after line 90:

```tsx
            {o.couponDiscount ? <Row k={`COUPON ${o.couponCode ?? ""}`} v={"− " + formatINR(o.couponDiscount)} /> : null}
```

- [ ] **Step 8: Type-check and build**

Run: `npx tsc --noEmit -p .` → Expected: no output.
Run: `npm run build` → Expected: build completes.

- [ ] **Step 9: Deploy and manual check** (owner, with Razorpay test keys)

Run: apply Task 2 migration, then `npx supabase functions deploy razorpay-create-order`, then deploy the frontend.
Checks:
1. Bag with one item → summary shows SUBTOTAL/SHIPPING/TOTAL from the server; pay with test card → order page opens; DB `orders.coupon_discount = 0`.
2. Apply `TEST10`-style general coupon created in SQL editor → COUPON line appears, total drops; pay → order saved, `coupon_redemptions` row exists, `coupons.used_count` +1.
3. Apply an expired code → message "That code has expired.", no coupon line.
4. COD with a coupon → advance = round(total × %); order saves with `cod_advance_amount` = quoted advance.
5. Open checkout, change a product's price in admin, then pay → charged the new price, order saves.

- [ ] **Step 10: Commit**

```bash
git add src/types/database.ts src/lib/coupons.ts src/lib/razorpay.ts src/lib/orders.ts src/routes/checkout.tsx src/routes/order.\$id.tsx src/routes/invoice.\$id.tsx src/routes/admin.invoice.\$id.tsx supabase/functions/razorpay-create-order/index.ts
git commit -m "feat(checkout): coupons with server-computed quote bound to the payment"
```

---

### Task 4: Admin — Coupons screen

**Files:**
- Create: `src/routes/admin.coupons.tsx`
- Modify: `src/routes/admin.tsx` (coreLinks)
- Modify: `src/lib/adminSearchIndex.ts` (new entry)

**Interfaces:**
- Consumes: `Coupon`, `CouponRedemption` types; `couponLabel`, `couponStatus` from `src/lib/coupons.ts`; `ConfirmDialog` from `src/components/ui/confirm-dialog.tsx` (props `open, onOpenChange, title, confirmLabel, destructive, onConfirm`).
- Produces: route `/admin/coupons`.

- [ ] **Step 1: Write the screen** — `src/routes/admin.coupons.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Coupon, CouponRedemption } from "@/types/database";
import { couponLabel, couponStatus } from "@/lib/coupons";
import { formatINR } from "@/context/CartContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shuffle, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Draft = {
  id?: string;
  kind: Coupon["kind"];
  code: string;
  description: string;
  discount_type: Coupon["discount_type"];
  discount_value: string;
  max_discount: string;
  min_order: string;
  max_uses: string;
  per_user_limit: string;
  starts_at: string;
  expires_at: string;
  first_order_only: boolean;
  is_active: boolean;
};

const BLANK: Draft = {
  kind: "general", code: "", description: "", discount_type: "percent", discount_value: "",
  max_discount: "", min_order: "", max_uses: "", per_user_limit: "1", starts_at: "", expires_at: "",
  first_order_only: false, is_active: true,
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () => "DENY" + Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const toDraft = (c: Coupon): Draft => ({
  id: c.id, kind: c.kind, code: c.code, description: c.description ?? "",
  discount_type: c.discount_type, discount_value: String(c.discount_value),
  max_discount: c.max_discount?.toString() ?? "", min_order: c.min_order?.toString() ?? "",
  max_uses: c.max_uses?.toString() ?? "", per_user_limit: c.per_user_limit?.toString() ?? "",
  starts_at: toLocalInput(c.starts_at), expires_at: toLocalInput(c.expires_at),
  first_order_only: c.first_order_only, is_active: c.is_active,
});

function validate(d: Draft): string | null {
  const code = d.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return "Code: 3–32 letters, numbers, - or _";
  const v = Number(d.discount_value);
  if (!(v > 0)) return "Discount must be more than 0";
  if (d.discount_type === "percent" && v > 100) return "Percent discount can't be over 100";
  for (const [label, val] of [["Max discount", d.max_discount], ["Min order", d.min_order], ["Total uses", d.max_uses], ["Uses per customer", d.per_user_limit]] as const) {
    if (val.trim() !== "" && !(Number(val) > 0)) return `${label} must be blank or more than 0`;
  }
  if (d.starts_at && d.expires_at && new Date(d.starts_at) >= new Date(d.expires_at)) return "End date must be after start date";
  return null;
}

function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | "general" | "welcome">("general");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "used" | "expired" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, CouponRedemption[]>>({});

  const load = async () => {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) toast.error(error.message);
    setRows((data as Coupon[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((c) =>
    (kindFilter === "all" || c.kind === kindFilter) &&
    (statusFilter === "all" || couponStatus(c) === statusFilter) &&
    (!search.trim() || c.code.includes(search.trim().toUpperCase()))
  ), [rows, kindFilter, statusFilter, search]);

  const save = async () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) return toast.error(problem);
    setSaving(true);
    const fields = {
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim() || null,
      discount_type: draft.discount_type,
      discount_value: Number(draft.discount_value),
      max_discount: numOrNull(draft.max_discount),
      min_order: numOrNull(draft.min_order),
      max_uses: numOrNull(draft.max_uses),
      per_user_limit: numOrNull(draft.per_user_limit),
      starts_at: fromLocalInput(draft.starts_at),
      expires_at: fromLocalInput(draft.expires_at),
      first_order_only: draft.first_order_only,
      is_active: draft.is_active,
    };
    const { error } = draft.id
      ? await supabase.from("coupons").update(fields).eq("id", draft.id)
      : await supabase.from("coupons").insert({ ...fields, kind: "general", assigned_user_id: null, welcome_tier_id: null });
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That code already exists" : error.message);
    toast.success("Coupon saved");
    setDraft(null);
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, is_active: !c.is_active } : r)));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("coupons").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id));
  };

  const toggleOpen = async (c: Coupon) => {
    const next = openId === c.id ? null : c.id;
    setOpenId(next);
    if (next && !redemptions[c.id]) {
      const { data } = await supabase.from("coupon_redemptions").select("*").eq("coupon_id", c.id).order("created_at", { ascending: false });
      setRedemptions((r) => ({ ...r, [c.id]: (data as CouponRedemption[]) ?? [] }));
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-display text-4xl md:text-5xl mb-2">COUPONS.</h1>
          <p className="text-mono text-[11px] tracking-widest text-muted-foreground">CREATE, LIMIT, SWITCH OFF AND DELETE CODES. WELCOME CODES ARE ISSUED AUTOMATICALLY.</p>
        </div>
        <button type="button" onClick={() => setDraft({ ...BLANK, code: randomCode() })} className="h-10 px-4 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2">
          <Plus className="size-3.5" /> NEW COUPON
        </button>
      </div>

      {draft && (
        <div className="border border-border bg-surface p-4 mb-6 max-w-3xl space-y-4">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{draft.id ? `EDIT ${draft.kind === "welcome" ? "WELCOME " : ""}COUPON` : "NEW COUPON"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="lbl">CODE</div>
              <div className="flex gap-2">
                <input value={draft.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="inp uppercase" disabled={draft.kind === "welcome"} />
                {draft.kind === "general" && (
                  <button type="button" title="Random code" onClick={() => set({ code: randomCode() })} className="border border-border h-10 px-3 hover:border-primary hover:text-primary"><Shuffle className="size-4" /></button>
                )}
              </div>
            </label>
            <label className="block">
              <div className="lbl">NOTE (ADMIN ONLY)</div>
              <input value={draft.description} onChange={(e) => set({ description: e.target.value })} className="inp" placeholder="e.g. Diwali campaign" />
            </label>
            <label className="block">
              <div className="lbl">DISCOUNT TYPE</div>
              <select value={draft.discount_type} onChange={(e) => set({ discount_type: e.target.value as Draft["discount_type"] })} className="inp">
                <option value="percent">% OFF</option>
                <option value="fixed">₹ FLAT OFF</option>
              </select>
            </label>
            <label className="block">
              <div className="lbl">{draft.discount_type === "percent" ? "PERCENT (1–100)" : "RUPEES OFF"}</div>
              <input type="number" min={0} value={draft.discount_value} onChange={(e) => set({ discount_value: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MAX DISCOUNT ₹ (BLANK = NO CAP)</div>
              <input type="number" min={0} value={draft.max_discount} onChange={(e) => set({ max_discount: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MIN ORDER ₹ (BLANK = NONE)</div>
              <input type="number" min={0} value={draft.min_order} onChange={(e) => set({ min_order: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">TOTAL USES ALLOWED (BLANK = UNLIMITED)</div>
              <input type="number" min={1} value={draft.max_uses} onChange={(e) => set({ max_uses: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">USES PER CUSTOMER (BLANK = UNLIMITED)</div>
              <input type="number" min={1} value={draft.per_user_limit} onChange={(e) => set({ per_user_limit: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">STARTS (BLANK = NOW)</div>
              <input type="datetime-local" value={draft.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">ENDS (BLANK = NEVER)</div>
              <input type="datetime-local" value={draft.expires_at} onChange={(e) => set({ expires_at: e.target.value })} className="inp" />
            </label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="size-4" /><span className="lbl !mb-0">ACTIVE</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={draft.first_order_only} onChange={(e) => set({ first_order_only: e.target.checked })} className="size-4" /><span className="lbl !mb-0">FIRST ORDER ONLY</span></label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={saving} className="h-10 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-10 px-6 border border-border text-mono text-xs tracking-widest">CANCEL</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)} className="inp !w-auto">
          <option value="general">GENERAL</option>
          <option value="welcome">WELCOME</option>
          <option value="all">ALL KINDS</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="inp !w-auto">
          <option value="all">ANY STATUS</option>
          <option value="active">ACTIVE</option>
          <option value="used">USED UP</option>
          <option value="expired">EXPIRED</option>
          <option value="inactive">SWITCHED OFF</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH CODE" className="inp !w-56 uppercase" />
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-surface text-mono text-[10px] tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">CODE</th>
              <th className="text-left p-3">DISCOUNT</th>
              <th className="text-left p-3">USES</th>
              <th className="text-left p-3">ENDS</th>
              <th className="text-left p-3">STATUS</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No coupons match.</td></tr>
            )}
            {visible.map((c) => {
              const status = couponStatus(c);
              return (
                <Fragment key={c.id}>
                  <tr className="border-t border-border">
                    <td className="p-3">
                      <button type="button" onClick={() => toggleOpen(c)} className="text-mono font-semibold inline-flex items-center gap-1 hover:text-primary">
                        <ChevronDown className={`size-3 transition-transform ${openId === c.id ? "rotate-180" : ""}`} /> {c.code}
                      </button>
                      <div className="text-[11px] text-muted-foreground">{c.kind === "welcome" ? "WELCOME" : c.description}</div>
                    </td>
                    <td className="p-3">
                      {couponLabel(c)}
                      {c.max_discount ? <span className="text-muted-foreground text-xs"> · max {formatINR(c.max_discount)}</span> : null}
                      {c.min_order ? <div className="text-muted-foreground text-xs">min {formatINR(c.min_order)}</div> : null}
                    </td>
                    <td className="p-3 text-mono text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td className="p-3 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString("en-IN") : "—"}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => toggleActive(c)} className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${status === "active" ? "border-emerald-500 text-emerald-600" : "border-border text-muted-foreground"}`} title="Click to switch on/off">
                        {status.toUpperCase()}
                      </button>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setDraft(toDraft(c))} className="text-mono text-[10px] tracking-widest hover:text-primary mr-3">EDIT</button>
                      <button type="button" onClick={() => setDeleteTarget(c)} className="text-muted-foreground hover:text-red-500" aria-label={`Delete ${c.code}`}><Trash2 className="size-3.5" /></button>
                    </td>
                  </tr>
                  {openId === c.id && (
                    <tr className="border-t border-border bg-surface/50">
                      <td colSpan={6} className="p-3">
                        {!redemptions[c.id] ? "Loading…" : redemptions[c.id].length === 0 ? <span className="text-muted-foreground text-xs">Not used yet.</span> : (
                          <ul className="text-xs space-y-1">
                            {redemptions[c.id].map((r) => (
                              <li key={r.id} className="flex gap-4">
                                <span className="text-mono">{r.order_id}</span>
                                <span>−{formatINR(r.discount_amount)}</span>
                                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`DELETE ${deleteTarget?.code ?? ""}?`}
        confirmLabel="DELETE"
        destructive
        onConfirm={confirmDelete}
      />

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Nav + search** — in `src/routes/admin.tsx` add `TicketPercent, Gift` to the lucide import and in `coreLinks` after LOYALTY:

```ts
    { to: "/admin/coupons" as const, label: "COUPONS", icon: TicketPercent },
```

In `src/lib/adminSearchIndex.ts` append to `SEARCH_INDEX` (core section):

```ts
  {
    id: "coupons",
    name: "Coupons",
    description: "Create, limit, switch off and delete discount codes; see who used them",
    route: "/admin/coupons",
    breadcrumb: "Admin → Coupons",
    keywords: ["coupons", "codes", "discount", "promo", "voucher"],
    synonyms: ["coupon code", "promo code", "discount code", "offer code", "usage limit", "delete coupon"],
    priority: 8,
    category: "core",
  },
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit -p .` → no output. `npm run build` → completes (the route tree regenerates and picks up `/admin/coupons`).

- [ ] **Step 4: Manual check**

1. Create `SUMMER10`, 10 %, max ₹200, total uses 3 → appears in list as ACTIVE.
2. Duplicate code → "That code already exists".
3. Percent 150 → "Percent discount can't be over 100".
4. Click ACTIVE → becomes SWITCHED OFF; checkout rejects the code with "That code is switched off."
5. Expand a used coupon → redemption list shows order id and amount.
6. Delete → gone from the list; redemptions in DB keep the code text.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.coupons.tsx src/routes/admin.tsx src/lib/adminSearchIndex.ts src/routeTree.gen.ts
git commit -m "feat(admin): coupons screen — create, limit, toggle, delete, usage"
```

---

### Task 5: Admin — Welcome Offer screen

**Files:**
- Create: `src/routes/admin.welcome-offer.tsx`
- Modify: `src/routes/admin.tsx` (coreLinks), `src/lib/adminSearchIndex.ts`

**Interfaces:**
- Consumes: `WelcomeOfferTier`, `WelcomeOfferSettings`; RPC `welcome_offer_stats()` → rows `{ tier_id, issued, redeemed }`.
- Produces: route `/admin/welcome-offer`.

- [ ] **Step 1: Write the screen** — `src/routes/admin.welcome-offer.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WelcomeOfferSettings, WelcomeOfferTier } from "@/types/database";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/welcome-offer")({
  component: AdminWelcomeOffer,
});

type TierDraft = Pick<WelcomeOfferTier, "label" | "discount_type" | "discount_value" | "target_percent" | "is_active"> & { id?: string };
type Stat = { tier_id: string | null; issued: number; redeemed: number };

function AdminWelcomeOffer() {
  const [settings, setSettings] = useState<WelcomeOfferSettings | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, t, st] = await Promise.all([
      supabase.from("welcome_offer_settings").select("*").limit(1).maybeSingle(),
      supabase.from("welcome_offer_tiers").select("*").order("sort_order"),
      supabase.rpc("welcome_offer_stats" as never),
    ]);
    if (s.error) toast.error(s.error.message);
    setSettings((s.data as WelcomeOfferSettings) ?? null);
    setTiers(((t.data as WelcomeOfferTier[]) ?? []).map(({ id, label, discount_type, discount_value, target_percent, is_active }) =>
      ({ id, label, discount_type, discount_value: Number(discount_value), target_percent: Number(target_percent), is_active })));
    setStats(((st.data as unknown as Stat[]) ?? []).map((r) => ({ ...r, issued: Number(r.issued), redeemed: Number(r.redeemed) })));
    setRemoved([]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activeTotal = tiers.filter((t) => t.is_active).reduce((s, t) => s + (Number(t.target_percent) || 0), 0);
  const totalIssued = stats.reduce((s, r) => s + r.issued, 0);
  const statFor = (id?: string) => stats.find((r) => r.tier_id === id);

  const updateTier = (i: number, patch: Partial<TierDraft>) => setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const removeTier = (i: number) => {
    const t = tiers[i];
    if (t.id) setRemoved((r) => [...r, t.id!]);
    setTiers((ts) => ts.filter((_, j) => j !== i));
  };

  const save = async () => {
    if (!settings) return;
    if (Math.abs(activeTotal - 100) > 0.001) return toast.error(`Active targets must add up to 100% (now ${activeTotal}%)`);
    for (const t of tiers) {
      if (!t.label.trim()) return toast.error("Every tier needs a label");
      if (!(t.discount_value > 0)) return toast.error(`${t.label}: discount must be more than 0`);
      if (t.discount_type === "percent" && t.discount_value > 100) return toast.error(`${t.label}: percent can't be over 100`);
    }
    if (!/^[A-Z0-9]{1,10}$/.test(settings.code_prefix)) return toast.error("Code prefix: 1–10 capital letters or numbers");

    setSaving(true);
    const { id, created_at, updated_at, ...fields } = settings;
    const results = await Promise.all([
      supabase.from("welcome_offer_settings").update(fields).eq("id", id),
      ...removed.map((rid) => supabase.from("welcome_offer_tiers").delete().eq("id", rid)),
      ...tiers.map((t, i) => {
        const row = { label: t.label.trim(), discount_type: t.discount_type, discount_value: t.discount_value, target_percent: t.target_percent, is_active: t.is_active, sort_order: i + 1 };
        return t.id ? supabase.from("welcome_offer_tiers").update(row).eq("id", t.id) : supabase.from("welcome_offer_tiers").insert(row);
      }),
    ]);
    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return toast.error(failed.error.message);
    toast.success("Welcome offer saved");
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!settings) return <div className="text-mono text-xs">No welcome offer settings found — run the migration first.</div>;

  const setS = (patch: Partial<WelcomeOfferSettings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">WELCOME OFFER.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        EVERY NEW ACCOUNT GETS ONE UNIQUE CODE. THE DISCOUNT IS PICKED AT RANDOM USING YOUR TARGET SPLIT.
      </p>

      <div className="max-w-3xl space-y-6">
        <div className="border border-border bg-surface p-4 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setS({ enabled: e.target.checked })} className="size-4" />
            <span className="lbl !mb-0">GIVE NEW USERS A WELCOME CODE</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block"><div className="lbl">CODE PREFIX (E.G. DENY → DENY-7KX2QM)</div>
              <input value={settings.code_prefix} onChange={(e) => setS({ code_prefix: e.target.value.toUpperCase() })} className="inp uppercase" maxLength={10} /></label>
            <label className="block"><div className="lbl">VALID FOR (DAYS, BLANK = NEVER EXPIRES)</div>
              <input type="number" min={1} value={settings.valid_days ?? ""} onChange={(e) => setS({ valid_days: numOrNull(e.target.value) })} className="inp" /></label>
            <label className="block"><div className="lbl">MIN ORDER ₹ (BLANK = NONE)</div>
              <input type="number" min={0} value={settings.min_order ?? ""} onChange={(e) => setS({ min_order: numOrNull(e.target.value) })} className="inp" /></label>
            <label className="block"><div className="lbl">MAX DISCOUNT ₹ (BLANK = NO CAP)</div>
              <input type="number" min={1} value={settings.max_discount ?? ""} onChange={(e) => setS({ max_discount: numOrNull(e.target.value) })} className="inp" /></label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.first_order_only} onChange={(e) => setS({ first_order_only: e.target.checked })} className="size-4" />
            <span className="lbl !mb-0">ONLY ON THE CUSTOMER'S FIRST ORDER</span>
          </label>
          <p className="text-[11px] text-muted-foreground">Changes apply to codes issued from now on. Codes already handed out keep their original terms (edit them under Coupons).</p>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="lbl !mb-0">DISCOUNT TIERS</div>
            <div className={`text-mono text-[11px] tracking-widest ${Math.abs(activeTotal - 100) < 0.001 ? "text-emerald-600" : "text-red-500"}`}>
              TARGETS TOTAL {activeTotal}% {Math.abs(activeTotal - 100) < 0.001 ? "✓" : "— MUST BE 100%"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-mono text-[10px] tracking-widest text-muted-foreground">
                <tr><th className="text-left p-2">LABEL</th><th className="text-left p-2">TYPE</th><th className="text-left p-2">VALUE</th><th className="text-left p-2">TARGET %</th><th className="text-left p-2">ACTUAL</th><th className="text-left p-2">ON</th><th /></tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const st = statFor(t.id);
                  const actual = totalIssued > 0 && st ? Math.round((st.issued / totalIssued) * 1000) / 10 : 0;
                  return (
                    <tr key={t.id ?? `new-${i}`} className="border-t border-border">
                      <td className="p-2"><input value={t.label} onChange={(e) => updateTier(i, { label: e.target.value })} className="inp" /></td>
                      <td className="p-2">
                        <select value={t.discount_type} onChange={(e) => updateTier(i, { discount_type: e.target.value as TierDraft["discount_type"] })} className="inp">
                          <option value="percent">%</option><option value="fixed">₹</option>
                        </select>
                      </td>
                      <td className="p-2"><input type="number" min={0} value={t.discount_value} onChange={(e) => updateTier(i, { discount_value: Number(e.target.value) })} className="inp !w-24" /></td>
                      <td className="p-2"><input type="number" min={0} max={100} value={t.target_percent} onChange={(e) => updateTier(i, { target_percent: Number(e.target.value) })} className="inp !w-24" /></td>
                      <td className="p-2 text-mono text-xs whitespace-nowrap">{actual}% · {st?.issued ?? 0} issued · {st?.redeemed ?? 0} used</td>
                      <td className="p-2"><input type="checkbox" checked={t.is_active} onChange={(e) => updateTier(i, { is_active: e.target.checked })} className="size-4" /></td>
                      <td className="p-2"><button type="button" onClick={() => removeTier(i)} className="text-muted-foreground hover:text-red-500" aria-label="Remove tier"><Trash2 className="size-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setTiers((ts) => [...ts, { label: "", discount_type: "percent", discount_value: 5, target_percent: 0, is_active: true }])}
            className="border border-border h-9 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2">
            <Plus className="size-3" /> ADD TIER
          </button>
        </div>

        <button type="button" onClick={save} disabled={saving} className="h-11 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
        </button>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
```

Deleting a tier that already issued codes is safe: `coupons.welcome_tier_id` is `ON DELETE SET NULL`; those codes keep working.

- [ ] **Step 2: Nav + search** — `src/routes/admin.tsx` coreLinks after COUPONS:

```ts
    { to: "/admin/welcome-offer" as const, label: "WELCOME OFFER", icon: Gift },
```

`src/lib/adminSearchIndex.ts`:

```ts
  {
    id: "welcome-offer",
    name: "Welcome Offer",
    description: "Discount tiers and target split for the unique code every new customer gets",
    route: "/admin/welcome-offer",
    breadcrumb: "Admin → Welcome Offer",
    keywords: ["welcome", "new user", "signup coupon", "tiers", "split"],
    synonyms: ["new customer discount", "first order coupon", "80 15 5", "random discount", "signup offer"],
    priority: 7,
    category: "core",
  },
```

- [ ] **Step 3: Type-check and build** — `npx tsc --noEmit -p .` → no output; `npm run build` → completes.

- [ ] **Step 4: Manual check**

1. Page shows 3 seeded tiers, "TARGETS TOTAL 100% ✓".
2. Change 80 → 70 → indicator turns red, SAVE refuses with the total in the message.
3. Add tier ₹100 flat, target 10 → total 100 → saves; reload shows it.
4. Sign up a test user → ACTUAL column counts one more issued.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.welcome-offer.tsx src/routes/admin.tsx src/lib/adminSearchIndex.ts src/routeTree.gen.ts
git commit -m "feat(admin): welcome offer — tiers, target split, live stats"
```

---

### Task 6: Signup popup — table, storefront popup, loyalty popup for logged-in only

**Files:**
- Create: `supabase/migrations/20261007000003_signup_popup.sql`
- Create: `src/lib/signupPopup.ts`
- Create: `src/components/signup/SignupPopupView.tsx`
- Create: `src/components/signup/SignupPopup.tsx`
- Modify: `src/types/database.ts` (Tables entry)
- Modify: `src/routes/__root.tsx:99-104` (mount)
- Modify: `src/components/home/LoyaltyModal.tsx:70-93` (logged-in only)
- Modify: `src/context/AuthContext.tsx` (`signup` stays the same signature; no change needed)

**Interfaces:**
- Consumes: `useAuth().signup(email, password, name, phone)`, `myWelcomeCoupon()`, `couponLabel()`, `MediaField` not used here.
- Produces:
  - `type SignupPopupConfig` (all columns below), `DEFAULT_SIGNUP_POPUP: SignupPopupConfig`, `fetchSignupPopup(): Promise<SignupPopupConfig>`
  - `shouldShowSignupPopup(a: { pathname: string; showOn: "all" | "home"; dismissedAt: number | null; reshowAfterHours: number; now: number }): boolean`
  - `fillTokens(text: string, t: { code: string; discount: string }): string`
  - `<SignupPopupView cfg stage code discountLabel error submitting onSubmit onClose onCopy preview? device? />`

- [ ] **Step 1: Migration** — `supabase/migrations/20261007000003_signup_popup.sql`:

```sql
-- ============================================================
-- Migration: signup popup for logged-out visitors — every word,
-- colour, background and timing admin-editable (singleton row).
-- ============================================================

CREATE TABLE IF NOT EXISTS signup_popup (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled              boolean NOT NULL DEFAULT true,
  delay_seconds        integer NOT NULL DEFAULT 8 CHECK (delay_seconds >= 0),
  show_on              text NOT NULL DEFAULT 'all' CHECK (show_on IN ('all', 'home')),
  reshow_after_hours   integer NOT NULL DEFAULT 24 CHECK (reshow_after_hours >= 0),
  layout               text NOT NULL DEFAULT 'media_left' CHECK (layout IN ('media_left', 'media_right', 'form_only')),
  show_media_on_mobile boolean NOT NULL DEFAULT false,

  bg_type              text NOT NULL DEFAULT 'color' CHECK (bg_type IN ('color', 'image', 'video')),
  bg_color             text NOT NULL DEFAULT '#000000',
  bg_image_url         text,
  bg_video_url         text,
  overlay_color        text NOT NULL DEFAULT '#000000',
  overlay_opacity      integer NOT NULL DEFAULT 40 CHECK (overlay_opacity BETWEEN 0 AND 100),
  logo_url             text,
  heading              text NOT NULL DEFAULT 'Welcome!',
  heading_color        text NOT NULL DEFAULT '#FFFFFF',
  subheading           text NOT NULL DEFAULT 'Sign up and unlock a surprise discount on your first order.',
  subheading_color     text NOT NULL DEFAULT '#FFFFFF',

  form_bg_color        text NOT NULL DEFAULT '#FFFFFF',
  form_text_color      text NOT NULL DEFAULT '#111111',
  form_title           text NOT NULL DEFAULT 'Sign up',
  form_subtitle        text NOT NULL DEFAULT 'Get your welcome code instantly',
  name_placeholder     text NOT NULL DEFAULT 'Full name',
  email_placeholder    text NOT NULL DEFAULT 'Email',
  phone_placeholder    text NOT NULL DEFAULT '10-digit mobile number',
  password_placeholder text NOT NULL DEFAULT 'Create a password (min 6)',
  submit_text          text NOT NULL DEFAULT 'SIGN UP & GET MY CODE',
  submit_bg_color      text NOT NULL DEFAULT '#111111',
  submit_text_color    text NOT NULL DEFAULT '#FFFFFF',
  login_link_text      text NOT NULL DEFAULT 'Already have an account? Log in',
  terms_text           text NOT NULL DEFAULT 'By signing up you agree to our Privacy Policy and Terms.',

  success_heading      text NOT NULL DEFAULT 'You''re in!',
  success_body         text NOT NULL DEFAULT 'Here''s {discount} on your first order. Use this code at checkout:',
  copy_button_text     text NOT NULL DEFAULT 'COPY CODE',
  cta_text             text NOT NULL DEFAULT 'START SHOPPING',
  cta_href             text NOT NULL DEFAULT '/shop',

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_signup_popup_updated_at
    BEFORE UPDATE ON signup_popup
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO signup_popup (id)
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM signup_popup);

ALTER TABLE signup_popup ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "signup_popup: public read" ON signup_popup FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signup_popup: staff write" ON signup_popup
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Apply it in the SQL Editor.

- [ ] **Step 2: Config lib** — `src/lib/signupPopup.ts`:

```ts
import { supabase } from "@/lib/supabase";

export type SignupPopupConfig = {
  id: string;
  enabled: boolean;
  delay_seconds: number;
  show_on: "all" | "home";
  reshow_after_hours: number;
  layout: "media_left" | "media_right" | "form_only";
  show_media_on_mobile: boolean;
  bg_type: "color" | "image" | "video";
  bg_color: string;
  bg_image_url: string | null;
  bg_video_url: string | null;
  overlay_color: string;
  overlay_opacity: number;
  logo_url: string | null;
  heading: string;
  heading_color: string;
  subheading: string;
  subheading_color: string;
  form_bg_color: string;
  form_text_color: string;
  form_title: string;
  form_subtitle: string;
  name_placeholder: string;
  email_placeholder: string;
  phone_placeholder: string;
  password_placeholder: string;
  submit_text: string;
  submit_bg_color: string;
  submit_text_color: string;
  login_link_text: string;
  terms_text: string;
  success_heading: string;
  success_body: string;
  copy_button_text: string;
  cta_text: string;
  cta_href: string;
  created_at: string;
  updated_at: string;
};

// Mirrors the migration defaults so the popup renders even if the fetch fails.
export const DEFAULT_SIGNUP_POPUP: SignupPopupConfig = {
  id: "", enabled: true, delay_seconds: 8, show_on: "all", reshow_after_hours: 24,
  layout: "media_left", show_media_on_mobile: false,
  bg_type: "color", bg_color: "#000000", bg_image_url: null, bg_video_url: null,
  overlay_color: "#000000", overlay_opacity: 40, logo_url: null,
  heading: "Welcome!", heading_color: "#FFFFFF",
  subheading: "Sign up and unlock a surprise discount on your first order.", subheading_color: "#FFFFFF",
  form_bg_color: "#FFFFFF", form_text_color: "#111111",
  form_title: "Sign up", form_subtitle: "Get your welcome code instantly",
  name_placeholder: "Full name", email_placeholder: "Email",
  phone_placeholder: "10-digit mobile number", password_placeholder: "Create a password (min 6)",
  submit_text: "SIGN UP & GET MY CODE", submit_bg_color: "#111111", submit_text_color: "#FFFFFF",
  login_link_text: "Already have an account? Log in",
  terms_text: "By signing up you agree to our Privacy Policy and Terms.",
  success_heading: "You're in!",
  success_body: "Here's {discount} on your first order. Use this code at checkout:",
  copy_button_text: "COPY CODE", cta_text: "START SHOPPING", cta_href: "/shop",
  created_at: "", updated_at: "",
};

export async function fetchSignupPopup(): Promise<SignupPopupConfig> {
  try {
    const { data } = await supabase.from("signup_popup").select("*").limit(1).maybeSingle();
    return data ? { ...DEFAULT_SIGNUP_POPUP, ...(data as SignupPopupConfig) } : DEFAULT_SIGNUP_POPUP;
  } catch {
    return DEFAULT_SIGNUP_POPUP;
  }
}

export const DISMISSED_KEY = "sd_signup_popup_dismissed_at";
const BLOCKED_PREFIXES = ["/login", "/signup", "/checkout", "/admin"];

export function shouldShowSignupPopup(a: {
  pathname: string;
  showOn: "all" | "home";
  dismissedAt: number | null;
  reshowAfterHours: number;
  now: number;
}): boolean {
  if (BLOCKED_PREFIXES.some((p) => a.pathname === p || a.pathname.startsWith(p + "/"))) return false;
  if (a.showOn === "home" && a.pathname !== "/") return false;
  if (a.dismissedAt != null && a.now - a.dismissedAt < a.reshowAfterHours * 3600_000) return false;
  return true;
}

export const fillTokens = (text: string, t: { code: string; discount: string }) =>
  text.replaceAll("{code}", t.code).replaceAll("{discount}", t.discount);

export function readDismissedAt(): number | null {
  try {
    const v = localStorage.getItem(DISMISSED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function writeDismissedAt(now: number) {
  try { localStorage.setItem(DISMISSED_KEY, String(now)); } catch { /* private mode */ }
}
```

Add to `Database.public.Tables` in `src/types/database.ts` (import nothing — define inline via `import type` is circular; instead add the entry using the type from the lib):

```ts
      signup_popup: {
        Row: import("@/lib/signupPopup").SignupPopupConfig;
        Insert: Partial<import("@/lib/signupPopup").SignupPopupConfig>;
        Update: Partial<Omit<import("@/lib/signupPopup").SignupPopupConfig, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
```

- [ ] **Step 3: Presentational view** — `src/components/signup/SignupPopupView.tsx` (used by the storefront AND the admin preview):

```tsx
import { useState, type FormEvent } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";
import type { SignupPopupConfig } from "@/lib/signupPopup";
import { fillTokens } from "@/lib/signupPopup";

export type SignupValues = { name: string; email: string; phone: string; password: string };

type Props = {
  cfg: SignupPopupConfig;
  stage: "form" | "success";
  code: string | null;
  discountLabel: string;
  error: string | null;
  submitting: boolean;
  onSubmit: (v: SignupValues) => void;
  onClose: () => void;
  onLogin: () => void;
  onCta: () => void;
  /** Admin preview: render inline (no fixed overlay) and force a device width. */
  preview?: boolean;
  device?: "desktop" | "mobile";
};

function validate(v: SignupValues): string | null {
  if (v.name.trim().length < 2) return "Enter your name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return "Enter a valid email";
  if (!/^[0-9]{10}$/.test(v.phone.trim())) return "Enter a 10-digit phone number";
  if (v.password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function SignupPopupView(p: Props) {
  const { cfg } = p;
  const [v, setV] = useState<SignupValues>({ name: "", email: "", phone: "", password: "" });
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isMobile = p.device === "mobile";
  const showMedia = cfg.layout !== "form_only";
  // On real phones the media panel follows show_media_on_mobile via CSS;
  // in the admin mobile preview we apply the same rule directly.
  const mediaClass = !showMedia ? "hidden" : isMobile ? (cfg.show_media_on_mobile ? "block h-40" : "hidden") : cfg.show_media_on_mobile ? "block h-40 md:h-auto" : "hidden md:block";
  const rowClass = isMobile ? "flex flex-col" : `flex flex-col md:flex-row ${cfg.layout === "media_right" ? "md:flex-row-reverse" : ""}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(v);
    setLocalError(problem);
    if (!problem) p.onSubmit(v);
  };

  const copy = async () => {
    if (!p.code) return;
    try { await navigator.clipboard.writeText(p.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const field = (key: keyof SignupValues, placeholder: string, type = "text") => (
    <input
      value={v[key]}
      onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))}
      placeholder={placeholder}
      type={type}
      inputMode={key === "phone" ? "numeric" : undefined}
      autoComplete={key === "password" ? "new-password" : key === "phone" ? "tel" : key}
      className="w-full h-11 px-3 border bg-transparent outline-none text-sm"
      style={{ borderColor: `${cfg.form_text_color}33`, color: cfg.form_text_color }}
    />
  );

  const card = (
    <div
      className={`relative w-full ${isMobile ? "max-w-[380px]" : "max-w-[880px]"} max-h-[92vh] overflow-y-auto ${rowClass}`}
      style={{ background: cfg.form_bg_color }}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.form_title}
    >
      <button type="button" onClick={p.onClose} aria-label="Close" className="absolute top-2 right-2 z-10 size-9 flex items-center justify-center" style={{ color: cfg.form_text_color }}>
        <X className="size-5" />
      </button>

      {/* Media / brand panel */}
      <div className={`relative overflow-hidden md:w-1/2 md:min-h-[440px] ${mediaClass}`} style={{ background: cfg.bg_color }}>
        {cfg.bg_type === "image" && cfg.bg_image_url && <img src={cfg.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {cfg.bg_type === "video" && cfg.bg_video_url && <video src={cfg.bg_video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />}
        {cfg.bg_type !== "color" && <div className="absolute inset-0" style={{ background: cfg.overlay_color, opacity: cfg.overlay_opacity / 100 }} />}
        <div className="relative h-full flex flex-col items-center justify-center text-center p-6 md:p-10 gap-3">
          {cfg.logo_url && <img src={cfg.logo_url} alt="" className="h-10 md:h-14 object-contain" />}
          <h2 className="text-display text-2xl md:text-4xl leading-tight" style={{ color: cfg.heading_color }}>{cfg.heading}</h2>
          <p className="text-sm md:text-base" style={{ color: cfg.subheading_color }}>{cfg.subheading}</p>
        </div>
      </div>

      {/* Form / success panel */}
      <div className={`${showMedia && !isMobile ? "md:w-1/2" : "w-full"} p-6 md:p-10 flex flex-col justify-center`} style={{ color: cfg.form_text_color }}>
        {p.stage === "form" ? (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div className="text-center mb-2">
              <h3 className="text-xl font-bold">{cfg.form_title}</h3>
              <p className="text-sm opacity-70">{cfg.form_subtitle}</p>
            </div>
            {field("name", cfg.name_placeholder)}
            {field("email", cfg.email_placeholder, "email")}
            {field("phone", cfg.phone_placeholder, "tel")}
            {field("password", cfg.password_placeholder, "password")}
            {(localError || p.error) && <p className="text-xs text-red-600">{localError || p.error}</p>}
            <button type="submit" disabled={p.submitting} className="w-full h-11 font-semibold text-sm tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: cfg.submit_bg_color, color: cfg.submit_text_color }}>
              {p.submitting && <Loader2 className="size-4 animate-spin" />} {cfg.submit_text}
            </button>
            <button type="button" onClick={p.onLogin} className="w-full text-xs underline opacity-80">{cfg.login_link_text}</button>
            <p className="text-[11px] opacity-60 text-center">{cfg.terms_text}</p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">{cfg.success_heading}</h3>
            <p className="text-sm opacity-80">{fillTokens(cfg.success_body, { code: p.code ?? "", discount: p.discountLabel })}</p>
            {p.code && (
              <div className="flex items-stretch border" style={{ borderColor: `${cfg.form_text_color}55` }}>
                <span className="flex-1 text-mono text-lg tracking-[0.2em] py-3">{p.code}</span>
                <button type="button" onClick={copy} className="px-4 text-xs font-semibold tracking-widest inline-flex items-center gap-2" style={{ background: cfg.submit_bg_color, color: cfg.submit_text_color }}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "COPIED" : cfg.copy_button_text}
                </button>
              </div>
            )}
            <button type="button" onClick={p.onCta} className="w-full h-11 border font-semibold text-sm tracking-wider" style={{ borderColor: cfg.form_text_color }}>
              {cfg.cta_text}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (p.preview) return <div className="flex justify-center p-4 bg-black/60">{card}</div>;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      {card}
    </div>
  );
}
```

- [ ] **Step 4: Container** — `src/components/signup/SignupPopup.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { myWelcomeCoupon, couponLabel } from "@/lib/coupons";
import {
  DEFAULT_SIGNUP_POPUP, fetchSignupPopup, readDismissedAt, shouldShowSignupPopup, writeDismissedAt,
  type SignupPopupConfig,
} from "@/lib/signupPopup";
import { SignupPopupView, type SignupValues } from "./SignupPopupView";

/** Signup popup for logged-out visitors. Everything it shows comes from admin → Signup Popup. */
export function SignupPopup() {
  const { user, loading, signup } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<SignupPopupConfig>(DEFAULT_SIGNUP_POPUP);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [discountLabel, setDiscountLabel] = useState("");

  useEffect(() => { fetchSignupPopup().then((c) => { setCfg(c); setLoaded(true); }); }, []);

  // Schedule the popup for logged-out visitors on allowed pages.
  useEffect(() => {
    if (!loaded || loading || user || open || !cfg.enabled) return;
    if (!shouldShowSignupPopup({ pathname, showOn: cfg.show_on, dismissedAt: readDismissedAt(), reshowAfterHours: cfg.reshow_after_hours, now: Date.now() })) return;
    const t = setTimeout(() => setOpen(true), Math.max(0, cfg.delay_seconds) * 1000);
    return () => clearTimeout(t);
  }, [loaded, loading, user, open, cfg, pathname]);

  // Logging in some other way closes the form (but not the success screen).
  useEffect(() => { if (user && stage === "form") setOpen(false); }, [user, stage]);

  const close = () => { writeDismissedAt(Date.now()); setOpen(false); setStage("form"); setError(null); };

  const onSubmit = async (v: SignupValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await signup(v.email.trim(), v.password, v.name.trim(), v.phone.trim());
      // The signup trigger issues the code synchronously, so it exists now.
      const c = await myWelcomeCoupon();
      setCode(c?.code ?? null);
      setDiscountLabel(c ? couponLabel(c).toLowerCase() : "");
      setStage("success");
      writeDismissedAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      setError(/already registered|already exists/i.test(msg) ? "You already have an account — log in instead." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <SignupPopupView
      cfg={cfg}
      stage={stage}
      code={code}
      discountLabel={discountLabel}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      onClose={close}
      onLogin={() => { close(); navigate({ to: "/login" }); }}
      onCta={() => { close(); navigate({ to: cfg.cta_href as never }); }}
    />
  );
}
```

- [ ] **Step 5: Mount + loyalty popup for logged-in only**

`src/routes/__root.tsx`: add `import { SignupPopup } from "@/components/signup/SignupPopup";` and inside the `{!isAdmin && (<> … </>)}` block after `<CartDrawer />`:

```tsx
                <SignupPopup />
```

`src/components/home/LoyaltyModal.tsx`: replace the scheduling effect and `dismiss` (lines 70–93) with:

```tsx
  // Logged-out visitors get the signup popup instead; this one is for members.
  useEffect(() => {
    if (typeof window === "undefined" || !cfg.enabled || !user) return;

    const seenKey = `deny_popup_seen_${user.id}`;
    if (localStorage.getItem(seenKey)) return;

    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(seenKey, "true");
    }, Math.max(0, cfg.delay_seconds) * 1000);

    return () => clearTimeout(timer);
  }, [cfg.enabled, cfg.delay_seconds, user]);

  const dismiss = () => {
    if (typeof window !== "undefined" && user) localStorage.setItem(`deny_popup_seen_${user.id}`, "true");
    setOpen(false);
  };
```

Also change its doc comment to: `/** Loyalty popup for logged-in members — once per account per browser. */` and update the admin subtitle in `src/routes/admin.popup.tsx:166` to `THE LOYALTY POPUP LOGGED-IN MEMBERS SEE AFTER THE DELAY BELOW — NO CODE REQUIRED.`

- [ ] **Step 6: Type-check and build** — `npx tsc --noEmit -p .` → no output; `npm run build` → completes.

- [ ] **Step 7: Manual check** (private window, phone width and desktop)

1. Logged out on `/` → popup after the delay; on `/checkout` and `/login` → never.
2. Close → doesn't return for `reshow_after_hours`; clear site data → returns.
3. Sign up with new email + 10-digit phone → success screen shows a `DENY-XXXXXX` code and "5% off"/"10% off"/"15% off" text; COPY copies it; account is logged in.
4. Sign up with an existing email → "You already have an account — log in instead."
5. Logged in → signup popup never shows; loyalty popup shows once.
6. 360px wide → form fits, no sideways scroll; media panel hidden unless "show on mobile" is ticked.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261007000003_signup_popup.sql src/lib/signupPopup.ts src/components/signup src/types/database.ts src/routes/__root.tsx src/components/home/LoyaltyModal.tsx src/routes/admin.popup.tsx
git commit -m "feat(store): signup popup with welcome code; loyalty popup for members only"
```

---

### Task 7: Admin — Signup Popup editor with live preview

**Files:**
- Create: `src/routes/admin.signup-popup.tsx`
- Modify: `src/routes/admin.tsx` (cmsLinks), `src/lib/adminSearchIndex.ts`

**Interfaces:**
- Consumes: `SignupPopupConfig`, `DEFAULT_SIGNUP_POPUP` from `src/lib/signupPopup.ts`; `SignupPopupView`; `MediaField` (`value: { url, type: "image" | "video" }`, `onChange(next)`) and `uploadToCloudinary` as used in `admin.popup.tsx`.
- Produces: route `/admin/signup-popup`.

- [ ] **Step 1: Write the editor** — `src/routes/admin.signup-popup.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SIGNUP_POPUP, type SignupPopupConfig } from "@/lib/signupPopup";
import { SignupPopupView } from "@/components/signup/SignupPopupView";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin/signup-popup")({
  component: AdminSignupPopup,
});

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="border border-border bg-surface p-4 space-y-3">
    <div className="lbl">{title}</div>
    {children}
  </div>
);

function AdminSignupPopup() {
  const [row, setRow] = useState<SignupPopupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewStage, setPreviewStage] = useState<"form" | "success">("form");

  useEffect(() => {
    supabase.from("signup_popup").select("*").limit(1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRow(data ? { ...DEFAULT_SIGNUP_POPUP, ...(data as SignupPopupConfig) } : null);
      setLoading(false);
    });
  }, []);

  const update = (patch: Partial<SignupPopupConfig>) => setRow((r) => (r ? { ...r, ...patch } : r));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = row;
    const { error } = await supabase.from("signup_popup").update(fields).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Signup popup saved");
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!row) return <div className="text-mono text-xs">No signup popup config found — run the migration first.</div>;

  const text = (key: keyof SignupPopupConfig, label: string, area = false) => (
    <label className="block">
      <div className="lbl">{label}</div>
      {area ? (
        <textarea value={String(row[key] ?? "")} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} rows={2} className="inp" />
      ) : (
        <input value={String(row[key] ?? "")} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="inp" />
      )}
    </label>
  );

  const color = (key: keyof SignupPopupConfig, label: string) => (
    <label className="block">
      <div className="lbl">{label}</div>
      <div className="flex gap-2">
        <input type="color" value={String(row[key])} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="h-10 w-12 border border-border bg-background p-1" />
        <input value={String(row[key])} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="inp" />
      </div>
    </label>
  );

  const bgMedia: MediaValue = {
    url: row.bg_type === "video" ? row.bg_video_url ?? "" : row.bg_image_url ?? "",
    type: row.bg_type === "video" ? "video" : "image",
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">SIGNUP POPUP.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        SHOWN TO LOGGED-OUT VISITORS. NEW SIGNUPS SEE THEIR WELCOME CODE RIGHT AWAY.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title="BEHAVIOUR">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={row.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="size-4" />
              <span className="lbl !mb-0">ENABLED</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block"><div className="lbl">DELAY (SECONDS)</div>
                <input type="number" min={0} value={row.delay_seconds} onChange={(e) => update({ delay_seconds: Math.max(0, Number(e.target.value) || 0) })} className="inp" /></label>
              <label className="block"><div className="lbl">SHOW AGAIN AFTER CLOSE (HOURS)</div>
                <input type="number" min={0} value={row.reshow_after_hours} onChange={(e) => update({ reshow_after_hours: Math.max(0, Number(e.target.value) || 0) })} className="inp" /></label>
              <label className="block"><div className="lbl">SHOW ON</div>
                <select value={row.show_on} onChange={(e) => update({ show_on: e.target.value as SignupPopupConfig["show_on"] })} className="inp">
                  <option value="all">ALL STORE PAGES</option><option value="home">HOME PAGE ONLY</option>
                </select></label>
            </div>
          </Card>

          <Card title="LAYOUT & BACKGROUND">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><div className="lbl">LAYOUT</div>
                <select value={row.layout} onChange={(e) => update({ layout: e.target.value as SignupPopupConfig["layout"] })} className="inp">
                  <option value="media_left">PICTURE LEFT, FORM RIGHT</option>
                  <option value="media_right">FORM LEFT, PICTURE RIGHT</option>
                  <option value="form_only">FORM ONLY</option>
                </select></label>
              <label className="flex items-center gap-2 cursor-pointer pt-5">
                <input type="checkbox" checked={row.show_media_on_mobile} onChange={(e) => update({ show_media_on_mobile: e.target.checked })} className="size-4" />
                <span className="lbl !mb-0">SHOW PICTURE PANEL ON PHONES</span>
              </label>
            </div>
            <div className="inline-flex border border-border overflow-hidden">
              {(["color", "image", "video"] as const).map((t) => (
                <button key={t} type="button" onClick={() => update({ bg_type: t })}
                  className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase ${row.bg_type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                  {t === "color" ? "PLAIN COLOUR" : t}
                </button>
              ))}
            </div>
            {color("bg_color", "BACKGROUND COLOUR")}
            {row.bg_type !== "color" && (
              <>
                <MediaField value={bgMedia} onChange={(next) => update({
                  bg_type: next.type,
                  bg_image_url: next.type === "image" ? next.url : row.bg_image_url,
                  bg_video_url: next.type === "video" ? next.url : row.bg_video_url,
                })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {color("overlay_color", "DARKEN/TINT COLOUR")}
                  <label className="block"><div className="lbl">TINT STRENGTH ({row.overlay_opacity}%)</div>
                    <input type="range" min={0} max={100} value={row.overlay_opacity} onChange={(e) => update({ overlay_opacity: Number(e.target.value) })} className="w-full" /></label>
                </div>
              </>
            )}
            {text("logo_url", "LOGO IMAGE URL (OPTIONAL — PASTE FROM MEDIA)")}
          </Card>

          <Card title="PICTURE PANEL TEXT">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
              {text("heading", "HEADING")}{color("heading_color", "HEADING COLOUR")}
              {text("subheading", "SUBHEADING", true)}{color("subheading_color", "SUBHEADING COLOUR")}
            </div>
          </Card>

          <Card title="FORM">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {color("form_bg_color", "FORM BACKGROUND")}{color("form_text_color", "FORM TEXT COLOUR")}
              {text("form_title", "TITLE")}{text("form_subtitle", "SUBTITLE")}
              {text("name_placeholder", "NAME PLACEHOLDER")}{text("email_placeholder", "EMAIL PLACEHOLDER")}
              {text("phone_placeholder", "PHONE PLACEHOLDER")}{text("password_placeholder", "PASSWORD PLACEHOLDER")}
              {text("submit_text", "BUTTON TEXT")}{text("login_link_text", "LOG-IN LINK TEXT")}
              {color("submit_bg_color", "BUTTON COLOUR")}{color("submit_text_color", "BUTTON TEXT COLOUR")}
            </div>
            {text("terms_text", "SMALL PRINT", true)}
          </Card>

          <Card title="AFTER SIGNUP">
            {text("success_heading", "HEADING")}
            {text("success_body", "MESSAGE — {discount} AND {code} ARE FILLED IN", true)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {text("copy_button_text", "COPY BUTTON")}{text("cta_text", "SHOP BUTTON")}{text("cta_href", "SHOP BUTTON LINK")}
            </div>
          </Card>

          <button type="button" onClick={save} disabled={saving} className="h-11 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
          </button>
        </div>

        <div className="xl:sticky xl:top-6 min-w-0 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={`h-8 px-3 border text-mono text-[10px] tracking-widest inline-flex items-center gap-1 ${device === d ? "border-primary text-primary" : "border-border"}`}>
                {d === "desktop" ? <Monitor className="size-3" /> : <Smartphone className="size-3" />} {d.toUpperCase()}
              </button>
            ))}
            {(["form", "success"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setPreviewStage(s)} className={`h-8 px-3 border text-mono text-[10px] tracking-widest ${previewStage === s ? "border-primary text-primary" : "border-border"}`}>
                {s === "form" ? "SIGNUP FORM" : "AFTER SIGNUP"}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto border border-border">
            <SignupPopupView
              cfg={row}
              stage={previewStage}
              code="DENY-7KX2QM"
              discountLabel="10% off"
              error={null}
              submitting={false}
              onSubmit={() => toast.message("Preview only")}
              onClose={() => {}}
              onLogin={() => {}}
              onCta={() => {}}
              preview
              device={device}
            />
          </div>
        </div>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Nav + search** — `src/routes/admin.tsx` cmsLinks after POPUP (`UserPlus` added to the lucide import):

```ts
    { to: "/admin/signup-popup", label: "SIGNUP POPUP", icon: UserPlus },
```

and rename the existing `{ to: "/admin/popup", label: "POPUP", … }` label to `"LOYALTY POPUP"`.

`src/lib/adminSearchIndex.ts` (cms section):

```ts
  {
    id: "signup-popup",
    name: "Signup Popup",
    description: "Popup that asks logged-out visitors to sign up and shows their welcome code",
    route: "/admin/signup-popup",
    breadcrumb: "Admin → CMS → Signup Popup",
    keywords: ["signup popup", "register popup", "welcome popup", "new user popup"],
    synonyms: ["sign up modal", "login popup", "welcome code popup", "popup colour", "popup video"],
    priority: 7,
    category: "cms",
  },
```

- [ ] **Step 3: Type-check and build** — `npx tsc --noEmit -p .` → no output; `npm run build` → completes.

- [ ] **Step 4: Manual check**

1. Change heading text + colour → preview updates live; SAVE; storefront popup shows the change.
2. Switch background to image (upload) and video → both preview; tint slider darkens.
3. Mobile preview: media hidden; tick "show on phones" → appears on top.
4. AFTER SIGNUP preview shows `DENY-7KX2QM` and "10% off" filled into the message.
5. At 375px admin width the editor and preview stack with no sideways page scroll.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.signup-popup.tsx src/routes/admin.tsx src/lib/adminSearchIndex.ts src/routeTree.gen.ts
git commit -m "feat(admin): signup popup editor with live desktop/mobile preview"
```

---

### Task 8: Account — edit name/phone, addresses in the database, my coupons; checkout address picker

**Files:**
- Create: `supabase/migrations/20261007000004_address_label.sql`
- Create: `src/lib/addresses.ts`
- Create: `src/lib/profile.ts`
- Modify: `src/types/database.ts` (`Address.label`)
- Modify: `src/routes/account.tsx` (lines 27–86 address logic, 251–332 address UI; new profile + coupons sections)
- Modify: `src/routes/checkout.tsx` (saved-address picker + "save this address")

**Interfaces:**
- Consumes: `myWelcomeCoupon`, `couponLabel`, `couponStatus`; `CouponRedemption` type.
- Produces:
  - `type SavedAddress = Address` (DB row incl. `label`)
  - `listAddresses(): Promise<SavedAddress[]>`, `saveAddress(a: AddressInput & { id?: string }): Promise<void>`, `deleteAddress(id: string)`, `setDefaultAddress(id: string)`, `importLocalAddresses(): Promise<number>`
  - `type AddressInput = { label: string; name: string; phone: string; line1: string; city: string; state: string; pincode: string; is_default?: boolean }`
  - `getMyProfile(): Promise<{ name: string; phone: string }>`, `updateMyProfile(p: { name: string; phone: string }): Promise<void>`

- [ ] **Step 1: Migration** — `supabase/migrations/20261007000004_address_label.sql`:

```sql
-- Saved addresses move from localStorage to the addresses table; the
-- storefront lets customers label them (Home / Work …).
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS label text;
```

Apply in SQL Editor. In `src/types/database.ts` add `label: string | null;` to `Address` after `user_id`.

- [ ] **Step 2: Address lib** — `src/lib/addresses.ts`:

```ts
import { supabase } from "@/lib/supabase";
import type { Address } from "@/types/database";

export type SavedAddress = Address;
export type AddressInput = {
  label: string; name: string; phone: string; line1: string;
  city: string; state: string; pincode: string; is_default?: boolean;
};

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not logged in");
  return data.user.id;
}

export async function listAddresses(): Promise<SavedAddress[]> {
  const { data, error } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  if (error) { console.warn("listAddresses:", error.message); return []; }
  return (data as SavedAddress[]) ?? [];
}

export function validateAddress(a: AddressInput): string | null {
  if (a.name.trim().length < 2) return "Enter the name";
  if (!/^\+?[0-9 -]{10,15}$/.test(a.phone.trim())) return "Enter a valid phone number";
  if (a.line1.trim().length < 5) return "Enter the full address";
  if (a.city.trim().length < 2) return "Enter the city";
  if (a.state.trim().length < 2) return "Enter the state";
  if (!/^[0-9]{6}$/.test(a.pincode.trim())) return "Enter a 6-digit PIN code";
  return null;
}

export async function saveAddress(a: AddressInput & { id?: string }): Promise<void> {
  const row = {
    label: a.label.trim() || null, name: a.name.trim(), phone: a.phone.trim(), line1: a.line1.trim(),
    line2: null, city: a.city.trim(), state: a.state.trim(), pincode: a.pincode.trim(),
    is_default: a.is_default ?? false,
  };
  const { error } = a.id
    ? await supabase.from("addresses").update(row).eq("id", a.id)
    : await supabase.from("addresses").insert({ ...row, user_id: await uid() });
  if (error) throw new Error(error.message);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** The DB trigger trg_single_default_address clears the others. */
export async function setDefaultAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

const LEGACY_KEY = "sd_addresses";
type LegacyAddress = { label: string; name: string; line1: string; city: string; state: string; pin: string; phone: string; isDefault: boolean };

/** One-time move of addresses saved in this browser by the old account page. */
export async function importLocalAddresses(): Promise<number> {
  let legacy: LegacyAddress[] = [];
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]"); } catch { return 0; }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;
  let moved = 0;
  for (const a of legacy) {
    try {
      await saveAddress({ label: a.label ?? "", name: a.name ?? "", phone: a.phone ?? "", line1: a.line1 ?? "", city: a.city ?? "", state: a.state ?? "", pincode: a.pin ?? "", is_default: !!a.isDefault });
      moved++;
    } catch { /* skip rows the DB rejects (e.g. missing phone) */ }
  }
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  return moved;
}
```

Note: `addresses.state` and `phone` are NOT NULL in the DB. Legacy rows with an empty phone/state insert as empty strings and succeed; that's acceptable — the customer can edit them.

- [ ] **Step 3: Profile lib** — `src/lib/profile.ts`:

```ts
import { supabase } from "@/lib/supabase";

export async function getMyProfile(): Promise<{ name: string; phone: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { name: "", phone: "" };
  const { data } = await supabase.from("profiles").select("name, phone").eq("user_id", u.user.id).maybeSingle();
  return {
    name: (data?.name as string | null) ?? (u.user.user_metadata?.name as string | undefined) ?? "",
    phone: (data?.phone as string | null) ?? (u.user.user_metadata?.phone as string | undefined) ?? "",
  };
}

export async function updateMyProfile(p: { name: string; phone: string }): Promise<void> {
  const name = p.name.trim();
  const phone = p.phone.trim();
  if (name.length < 2) throw new Error("Enter your name");
  if (!/^[0-9]{10}$/.test(phone)) throw new Error("Enter a 10-digit phone number");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not logged in");
  const { error } = await supabase.from("profiles").update({ name, phone }).eq("user_id", u.user.id);
  if (error) throw new Error(error.message);
  // Keeps the "HELLO, NAME" header in sync (AuthContext reads user_metadata.name;
  // onAuthStateChange fires USER_UPDATED and refreshes `user`).
  const { error: metaErr } = await supabase.auth.updateUser({ data: { name, phone } });
  if (metaErr) throw new Error(metaErr.message);
}
```

- [ ] **Step 4: Account page** — in `src/routes/account.tsx`:

Remove lines 27–37 (local `Address` type, `ADDR_KEY`, `getAddresses`, `saveAddresses`, `BLANK`) and the `saveAddr`/`removeAddr`/`setDefault` functions (lines 64–86). Add imports:

```tsx
import { listAddresses, saveAddress, deleteAddress, setDefaultAddress, importLocalAddresses, validateAddress, type SavedAddress, type AddressInput } from "@/lib/addresses";
import { getMyProfile, updateMyProfile } from "@/lib/profile";
import { myWelcomeCoupon, couponLabel, couponStatus } from "@/lib/coupons";
import type { Coupon, CouponRedemption } from "@/types/database";
import { supabase } from "@/lib/supabase";
```

Add `Pencil, Tag, Copy` to the lucide import. Replace the address state lines (48–50) and add new state:

```tsx
  const BLANK: AddressInput = { label: "", name: "", phone: "", line1: "", city: "", state: "", pincode: "" };
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrForm, setAddrForm] = useState<(AddressInput & { id?: string }) | null>(null);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [welcome, setWelcome] = useState<Coupon | null>(null);
  const [used, setUsed] = useState<CouponRedemption[]>([]);

  const reloadAddresses = () => listAddresses().then(setAddresses);
```

In the load effect replace `setAddresses(getAddresses());` with:

```tsx
      importLocalAddresses().then((n) => { if (n) toast.success(`Moved ${n} saved address${n > 1 ? "es" : ""} to your account`); }).finally(reloadAddresses);
      getMyProfile().then(setProfile);
      myWelcomeCoupon().then(setWelcome);
      supabase.from("coupon_redemptions").select("*").order("created_at", { ascending: false }).then(({ data }) => setUsed((data as CouponRedemption[]) ?? []));
```

Add handlers after the effect:

```tsx
  const submitAddr = async () => {
    if (!addrForm) return;
    const problem = validateAddress(addrForm);
    if (problem) return toast.error(problem);
    try {
      await saveAddress({ ...addrForm, is_default: addrForm.id ? addrForm.is_default : addresses.length === 0 });
      setAddrForm(null);
      toast.success("Address saved");
      reloadAddresses();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save address"); }
  };
  const removeAddr = async (id: string) => {
    try { await deleteAddress(id); reloadAddresses(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
  };
  const makeDefault = async (id: string) => {
    try { await setDefaultAddress(id); reloadAddresses(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
  };
  const saveProfile = async () => {
    try { await updateMyProfile(profile); setEditingProfile(false); toast.success("Profile updated"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update profile"); }
  };
```

Insert a PROFILE section directly above `{/* Saved Addresses */}`:

```tsx
      {/* Profile */}
      <div id="profile" className="scroll-mt-24 mb-12">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-display text-3xl tracking-wider">PROFILE</h2>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary">
              <Pencil className="size-3.5" /> EDIT
            </button>
          )}
        </div>
        {editingProfile ? (
          <div className="border border-border bg-surface p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone" inputMode="numeric" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            <div className="sm:col-span-2 flex gap-3">
              <button onClick={saveProfile} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground">SAVE</button>
              <button onClick={() => { setEditingProfile(false); getMyProfile().then(setProfile); }} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest">CANCEL</button>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Email: {user.email} (can't be changed here)</p>
          </div>
        ) : (
          <div className="border border-border bg-surface p-5 text-sm max-w-2xl">
            <div className="font-semibold">{profile.name || user.name}</div>
            <div className="text-muted-foreground">{profile.phone || "No phone added"}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>
        )}
      </div>

      {/* My coupons */}
      <div id="coupons" className="scroll-mt-24 mb-12">
        <h2 className="text-display text-3xl tracking-wider mb-4">MY COUPONS</h2>
        {!welcome && used.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-muted-foreground">No coupons yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {welcome && (
              <div className={`border p-5 ${couponStatus(welcome) === "active" ? "border-primary" : "border-border opacity-70"}`}>
                <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">WELCOME OFFER · {couponLabel(welcome)}</div>
                <div className="flex items-center gap-3">
                  <span className="text-mono text-xl tracking-[0.2em]">{welcome.code}</span>
                  {couponStatus(welcome) === "active" && (
                    <button onClick={() => navigator.clipboard?.writeText(welcome.code).then(() => toast.success("Code copied"))} aria-label="Copy code" className="text-muted-foreground hover:text-primary"><Copy className="size-4" /></button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {couponStatus(welcome) === "active" ? (welcome.expires_at ? `Valid till ${new Date(welcome.expires_at).toLocaleDateString("en-IN")}` : "No expiry") : couponStatus(welcome).toUpperCase()}
                </div>
              </div>
            )}
            {used.map((r) => (
              <div key={r.id} className="border border-border p-5 text-sm">
                <div className="flex items-center gap-2 text-mono"><Tag className="size-3.5" /> {r.code}</div>
                <div className="text-muted-foreground text-xs mt-1">Saved {formatINR(r.discount_amount)} on order {r.order_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
```

Replace the Saved Addresses section (lines 251–332) with:

```tsx
      {/* Saved Addresses */}
      <div id="addresses" className="scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-display text-3xl tracking-wider">SAVED ADDRESSES</h2>
          {!addrForm && (
            <button onClick={() => setAddrForm({ ...BLANK, phone: profile.phone })} className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary transition-colors">
              <Plus className="size-3.5" /> ADD ADDRESS
            </button>
          )}
        </div>

        {addrForm && (
          <div className="border border-border bg-surface p-6 mb-5">
            <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-5">{addrForm.id ? "EDIT ADDRESS" : "NEW ADDRESS"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {([
                { key: "label", placeholder: "Label (Home / Work…)", full: false },
                { key: "name", placeholder: "Full Name *", full: false },
                { key: "phone", placeholder: "Phone for delivery *", full: false },
                { key: "line1", placeholder: "Address Line *", full: true },
                { key: "city", placeholder: "City *", full: false },
                { key: "state", placeholder: "State *", full: false },
                { key: "pincode", placeholder: "PIN Code *", full: false },
              ] as { key: keyof AddressInput; placeholder: string; full: boolean }[]).map(({ key, placeholder, full }) => (
                <input
                  key={key}
                  value={String(addrForm[key] ?? "")}
                  onChange={(e) => setAddrForm((f) => (f ? { ...f, [key]: e.target.value } : f))}
                  placeholder={placeholder}
                  className={`bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none ${full ? "sm:col-span-2" : ""}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={submitAddr} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">SAVE</button>
              <button onClick={() => setAddrForm(null)} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest hover:border-primary transition-colors">CANCEL</button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !addrForm ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No saved addresses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addresses.map((a) => (
              <div key={a.id} className={`border bg-surface p-5 relative ${a.is_default ? "border-primary" : "border-border"}`}>
                {a.is_default && (
                  <span className="absolute top-3 right-3 text-mono text-[9px] tracking-widest text-primary flex items-center gap-1">
                    <Star className="size-2.5 fill-primary" /> DEFAULT
                  </span>
                )}
                {a.label && <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2 uppercase">{a.label}</div>}
                <div className="text-sm font-semibold mb-1">{a.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {a.line1}<br />{a.city}{a.state ? `, ${a.state}` : ""} — {a.pincode}
                  {a.phone && <><br />{a.phone}</>}
                </div>
                <div className="flex gap-3 mt-4 items-center">
                  {!a.is_default && (
                    <button onClick={() => makeDefault(a.id)} className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors">SET DEFAULT</button>
                  )}
                  <button onClick={() => setAddrForm({ id: a.id, label: a.label ?? "", name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode, is_default: a.is_default })}
                    className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary">EDIT</button>
                  <button onClick={() => removeAddr(a.id)} className="text-muted-foreground hover:text-red-500 transition-colors ml-auto" aria-label="Delete address">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
```

Also add `{ href: "#profile", … }` and `{ href: "#coupons", … }` tiles next to the existing `#addresses` tile at line 135 if that tile list is a fixed array — copy the `#addresses` entry shape: `{ href: "#profile", Icon: Pencil, label: "PROFILE", meta: "NAME · PHONE", color: "hover:border-primary hover:text-primary" }` and `{ href: "#coupons", Icon: Tag, label: "MY COUPONS", meta: welcome && couponStatus(welcome) === "active" ? "1 TO USE" : "—", color: "hover:border-primary hover:text-primary" }`.

- [ ] **Step 5: Checkout address picker** — in `src/routes/checkout.tsx`:

Imports: `import { listAddresses, saveAddress, type SavedAddress } from "@/lib/addresses";`. `useForm` destructure adds `setValue`. State:

```tsx
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [pickedId, setPickedId] = useState<string | "new">("new");
  const [saveNew, setSaveNew] = useState(true);

  const fillFrom = (a: SavedAddress) => {
    setValue("name", a.name); setValue("phone", a.phone); setValue("line1", a.line1);
    setValue("city", a.city); setValue("state", a.state); setValue("pincode", a.pincode);
  };

  useEffect(() => {
    if (!user) return;
    listAddresses().then((list) => {
      setSaved(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) { setPickedId(def.id); fillFrom(def); }
    });
  }, [user]);
```

Above the SHIPPING ADDRESS field grid insert:

```tsx
            {saved.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {saved.map((a) => (
                  <button key={a.id} type="button" onClick={() => { setPickedId(a.id); fillFrom(a); }}
                    className={`text-left border p-3 text-sm ${pickedId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}>
                    <div className="font-semibold">{a.label ? `${a.label} · ` : ""}{a.name}</div>
                    <div className="text-muted-foreground text-xs">{a.line1}, {a.city} — {a.pincode}</div>
                    <div className="text-muted-foreground text-xs">{a.phone}</div>
                  </button>
                ))}
                <button type="button" onClick={() => { setPickedId("new"); (["name", "phone", "line1", "city", "state", "pincode"] as const).forEach((k) => setValue(k, "")); }}
                  className={`border border-dashed p-3 text-sm text-mono tracking-widest ${pickedId === "new" ? "border-primary text-primary" : "border-border"}`}>
                  + USE A NEW ADDRESS
                </button>
              </div>
            )}
```

Below the field grid, when `pickedId === "new"`:

```tsx
            {pickedId === "new" && (
              <label className="mt-3 flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="accent-primary" />
                SAVE THIS ADDRESS TO MY ACCOUNT
              </label>
            )}
```

In `onSubmit`, right after `const address = {…}` add:

```tsx
    if (pickedId === "new" && saveNew) {
      saveAddress({ label: "", name: data.name, phone: data.phone, line1: data.line1, city: data.city, state: data.state, pincode: data.pincode, is_default: saved.length === 0 })
        .catch(() => { /* saving the address is a convenience; never block payment */ });
    }
```

- [ ] **Step 6: Type-check and build** — `npx tsc --noEmit -p .` → no output; `npm run build` → completes.

- [ ] **Step 7: Manual check**

1. Account → PROFILE → edit name/phone → header greeting updates; reload keeps it.
2. Browser with old localStorage addresses → toast "Moved N saved addresses…", they appear; `localStorage.sd_addresses` is gone.
3. Add two addresses with different phones; set second as default → only it shows DEFAULT.
4. Edit an address phone → saved.
5. Checkout → default address pre-filled; tapping the other fills its phone; "+ USE A NEW ADDRESS" clears; paying with "save" ticked adds it to the account.
6. MY COUPONS shows the welcome code; after using it, it shows USED and the redemption card.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261007000004_address_label.sql src/lib/addresses.ts src/lib/profile.ts src/types/database.ts src/routes/account.tsx src/routes/checkout.tsx
git commit -m "feat(account): edit name/phone, DB-backed addresses with own phone, my coupons; checkout address picker"
```

---

### Task 9: Shiprocket — declare discounts so COD collects the right amount

**Files:**
- Modify: `supabase/functions/shiprocket-sync/index.ts:150-151`

**Interfaces:**
- Consumes: `orders.discount`, `orders.coupon_discount`, `orders.shipping`, `orders.cod_advance_amount`.

Today the Shiprocket order declares only `sub_total`, so a COD parcel collects the full item subtotal — ignoring loyalty discount, any coupon and the advance already paid. Shiprocket's adhoc order API accepts `shipping_charges` and `total_discount`; for COD it collects `sub_total + shipping_charges − total_discount`.

- [ ] **Step 1: Change the payload** — replace lines 150–151:

```ts
        payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
        sub_total: Number(order.subtotal),
        shipping_charges: Number(order.shipping ?? 0),
        // For COD the advance already paid online is treated as a discount so
        // the courier collects only the balance (total − advance).
        total_discount:
          Number(order.discount ?? 0) +
          Number(order.coupon_discount ?? 0) +
          (order.payment_method === "cod" ? Number(order.cod_advance_amount ?? 0) : 0),
```

- [ ] **Step 2: Deploy and verify** — `npx supabase functions deploy shiprocket-sync`. Place one COD test order with a coupon; in the Shiprocket dashboard the order's "COD amount" must equal the order page's PAY ON DELIVERY figure. If Shiprocket shows a different figure, revert this task (`git revert`) and raise it with the owner — do not guess another formula.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/shiprocket-sync/index.ts
git commit -m "fix(shiprocket): declare shipping and discounts so COD collects the balance"
```

---

### Task 10: Final verification

- [ ] **Step 1:** `npx tsc --noEmit -p .` → no output.
- [ ] **Step 2:** `npm run build` → completes.
- [ ] **Step 3:** Re-run both SQL test files in the SQL Editor → both end in `ROLLBACK` without assertion errors.
- [ ] **Step 4:** End-to-end in a private window (Razorpay test mode): popup → sign up → copy code → add item → checkout shows "Your welcome offer" → apply → pay → order page shows COUPON line → admin Coupons shows the welcome code USED with the redemption → admin Welcome Offer ACTUAL counts updated.
- [ ] **Step 5:** Phone width (360–414px): home, product page, checkout, account, signup popup — no sideways scroll.
