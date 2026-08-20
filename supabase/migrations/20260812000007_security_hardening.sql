-- ============================================================
-- Migration: security hardening pass.
--
-- 1. `orders` RLS was `FOR ALL USING (user_id = auth.uid())` — any
--    customer could UPDATE their own order's status/refund_amount/
--    payment_id, or DELETE it outright, straight through the anon key.
--    Every legitimate customer-side mutation (cancel, return, ship)
--    already goes through a service-role edge function, so customers
--    never actually need UPDATE/DELETE — only SELECT (their own rows)
--    and INSERT (creating the order at checkout).
-- 2. INSERT itself trusted whatever total/status the browser sent, with
--    no link back to a real, captured Razorpay payment. `verified_payments`
--    is written by razorpay-verify-payment (server-side, after confirming
--    the payment actually captured for a specific amount) and the new
--    INSERT policy requires a matching, unused row there — so a forged
--    order (fake total, already-DELIVERED, already-REFUNDED, etc.)
--    can no longer be inserted at all.
-- 3. A handful of missing CHECK constraints (refund_amount bounds,
--    compare_price vs price, unit_price) added as NOT VALID so this
--    migration can't fail against any pre-existing rows — validate them
--    later once confirmed clean.
-- 4. `coupons` was fully public-readable (used_count, max_uses, every
--    code including inactive ones) — now admin-only, with a narrow view
--    exposing just the fields needed to validate a code someone already
--    has.
-- 5. Re-point the three pg_cron jobs added in earlier migrations
--    (send-whatsapp-queue, abandoned-cart-scan, sync-whatsapp-templates)
--    at their functions with a shared-secret header, since those
--    functions now check it (see supabase/functions/*/index.ts).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- verified_payments — bridges the client-forgeable `orders` INSERT to a
-- real, server-confirmed Razorpay payment. Intentionally policy-less
-- (RLS enabled, zero policies): only the service-role key razorpay-
-- verify-payment runs under can read/write it, same pattern as
-- rate_limits. `used` is flipped by a trigger the moment an order
-- successfully consumes it, so the same payment can't back two orders.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verified_payments (
  payment_id         text PRIMARY KEY,
  razorpay_order_id  text NOT NULL,
  amount_paise       integer NOT NULL,
  used               boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verified_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mark_payment_used()
RETURNS trigger AS $$
BEGIN
  UPDATE verified_payments SET used = true WHERE payment_id = NEW.payment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_orders_mark_payment_used
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION mark_payment_used();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- orders — replace the single "own rows, do anything" policy with
-- SELECT-own + a tightly-scoped INSERT-own. No customer UPDATE/DELETE.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders: own rows" ON orders;

DO $$ BEGIN
  CREATE POLICY "orders: customers select own" ON orders
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
      AND EXISTS (
        SELECT 1 FROM verified_payments vp
        WHERE vp.payment_id = orders.payment_id
          AND vp.used = false
          AND (
            (orders.payment_method = 'cod' AND vp.amount_paise = round(orders.cod_advance_amount * 100)::integer)
            OR (orders.payment_method = 'razorpay' AND vp.amount_paise = round(orders.total * 100)::integer)
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- "orders: admins all" (is_admin_or_staff()) is untouched — admin actions
-- (refund, ship, status changes, replacement orders) still go through it.

-- ────────────────────────────────────────────────────────────
-- Missing CHECK constraints. NOT VALID so existing rows (if any violate
-- them) can't fail this migration — run VALIDATE CONSTRAINT later once
-- confirmed clean.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_refund_amount_check
    CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= total)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_compare_price_check
    CHECK (compare_price IS NULL OR compare_price >= price) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_price_upper_bound_check
    CHECK (price < 10000000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT order_items_unit_price_check
    CHECK (unit_price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- coupons — was fully public-readable (used_count, max_uses, every code
-- including inactive ones — scrapeable promo calendar). Base table now
-- admin-only; a view exposes just what's needed to validate a code
-- someone already has, for currently-valid coupons only.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "coupons: public read" ON coupons;

DO $$ BEGIN
  CREATE POLICY "coupons: admin read" ON coupons FOR SELECT USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW public_coupons AS
SELECT code, discount_type, discount_value, min_order
FROM coupons
WHERE is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR used_count < max_uses);

GRANT SELECT ON public_coupons TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- Re-point the cron jobs at their functions with a shared-secret header
-- — the functions themselves now reject requests without it (except
-- sync-whatsapp-templates, which also accepts an admin JWT for the
-- "Sync now" button in /admin/notifications). Set this exact value as
-- the CRON_SECRET edge function secret in the Supabase dashboard.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-whatsapp-queue') THEN
    PERFORM cron.unschedule('send-whatsapp-queue');
  END IF;
END $$;

SELECT cron.schedule(
  'send-whatsapp-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/send-whatsapp',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "1e0a94a0d46b84691a3d8dcf44744c8a6744cf73abb28ef0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned-cart-scan') THEN
    PERFORM cron.unschedule('abandoned-cart-scan');
  END IF;
END $$;

SELECT cron.schedule(
  'abandoned-cart-scan',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/abandoned-cart-scan',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "1e0a94a0d46b84691a3d8dcf44744c8a6744cf73abb28ef0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-whatsapp-templates') THEN
    PERFORM cron.unschedule('sync-whatsapp-templates');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-whatsapp-templates',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/sync-whatsapp-templates',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "1e0a94a0d46b84691a3d8dcf44744c8a6744cf73abb28ef0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
