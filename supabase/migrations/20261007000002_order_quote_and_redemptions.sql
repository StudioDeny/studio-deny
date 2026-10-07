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

-- Order-insensitive fingerprint of a cart: "slug|variant|qty|price" sorted.
-- Price is rounded to 2dp so 1199 (from the browser) and 1199.00 (from
-- Postgres) produce the same key; a line without a price keys as "-".
CREATE OR REPLACE FUNCTION order_items_key(p_items jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(string_agg(k, ',' ORDER BY k), '')
  FROM (
    SELECT format('%s|%s|%s|%s',
                  e->>'slug',
                  COALESCE(NULLIF(e->>'variantId', ''), '-'),
                  (e->>'qty')::int,
                  COALESCE(round((e->>'price')::numeric, 2)::text, '-')) AS k
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
  v_lines jsonb := '[]'::jsonb;
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
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'slug', e->>'slug', 'variantId', NULLIF(e->>'variantId', ''), 'qty', qty, 'price', price));
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
    'lines', v_lines,
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
--    the direct loyalty, catalog-price and verified_payments checks.
--    Line prices are now bound to the prices the server quoted and the
--    customer paid (order_items_key includes price), so an admin price
--    edit while a customer is in Razorpay no longer rejects their paid
--    order. ──────────────────────────────────────────────────
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
