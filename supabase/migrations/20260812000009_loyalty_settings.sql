-- ============================================================
-- Migration: move loyalty/shop settings off localStorage into a real
-- Supabase singleton, and use it to close the last order-forgery gap.
--
-- 20260812000008 bounded `discount <= subtotal` because there was no
-- server-side source of truth for what a customer's *real* discount
-- should be — LoyaltySettings (the per-tier discount %) lived only in
-- the admin's own browser (sd_settings_v1), same broken pattern
-- Invoice Template and Brands had before 20260812000006. That meant a
-- customer could still pair a qty-inflated order with a plausible
-- discount and get away with it, as long as the resulting total still
-- matched a real payment.
--
-- loyalty_settings is the real Supabase singleton (public read — the
-- storefront needs entryThreshold/freeShipping/discount% to render
-- checkout math client-side, admin/staff write). customer_loyalty_discount()
-- computes what a customer's discount *should* be, server-side, from
-- their real order history — mirroring src/lib/loyalty.ts's
-- isLoyaltyMember/pointsFromOrders/tierFor exactly (tier point
-- thresholds 0/1000/3000/8000 aren't admin-configurable there either,
-- so they're hardcoded here too, not read from loyalty_settings).
-- The orders INSERT policy now requires an EXACT match instead of just
-- an upper bound.
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount                 jsonb NOT NULL DEFAULT '{"ROOKIE":0,"RUNNER":5,"RIOT":10,"LEGEND":15}'::jsonb,
  entry_threshold          numeric(10,2) NOT NULL DEFAULT 5000,
  rupees_per_earned_point  numeric(10,2) NOT NULL DEFAULT 50,
  rupees_per_point         numeric(10,2) NOT NULL DEFAULT 1,
  free_shipping            numeric(10,2) NOT NULL DEFAULT 2499,
  filter_colors            jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_loyalty_settings_updated_at
    BEFORE UPDATE ON loyalty_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO loyalty_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM loyalty_settings);

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "loyalty_settings: public read" ON loyalty_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "loyalty_settings: admins write" ON loyalty_settings FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION customer_loyalty_discount(customer_id uuid, order_subtotal numeric)
RETURNS numeric AS $$
DECLARE
  ls RECORD;
  is_member boolean;
  points numeric;
  tier text;
  pct numeric;
BEGIN
  SELECT entry_threshold, rupees_per_earned_point, discount INTO ls FROM loyalty_settings LIMIT 1;
  IF ls IS NULL THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE user_id = customer_id
      AND status NOT IN ('CANCELLED', 'REFUNDED')
      AND total >= ls.entry_threshold
  ) INTO is_member;

  IF NOT is_member THEN
    RETURN round(order_subtotal * (ls.discount->>'ROOKIE')::numeric / 100);
  END IF;

  SELECT floor(COALESCE(SUM(total), 0) / ls.rupees_per_earned_point) INTO points
  FROM orders
  WHERE user_id = customer_id AND status NOT IN ('CANCELLED', 'REFUNDED');

  tier := CASE
    WHEN points >= 8000 THEN 'LEGEND'
    WHEN points >= 3000 THEN 'RIOT'
    WHEN points >= 1000 THEN 'RUNNER'
    ELSE 'ROOKIE'
  END;

  pct := (ls.discount->>tier)::numeric;
  RETURN round(order_subtotal * pct / 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
      AND discount = customer_loyalty_discount(auth.uid(), subtotal)
      AND items_match_catalog_prices(items)
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
