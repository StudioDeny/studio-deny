-- ============================================================
-- Migration: store pickup.
--
-- At checkout a shopper can choose Store Pickup: no shipping fee, paid in
-- full with Razorpay (no COD), collected at the store. The collect-by date
-- is set here (order time + 7 days), never by the browser. Pickup orders
-- stay status PLACED and never go to Shiprocket, so no shipped/delivered
-- step or message happens; the admin marks them collected (collected_at).
--
-- quote_order() gains p_fulfillment (default 'delivery', so callers that
-- don't send it behave exactly as before), and the paid quote remembers
-- it: an order saved as delivery can't use a pickup (free-shipping) quote.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment   text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS pickup_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS collected_at  timestamptz;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_check CHECK (fulfillment IN ('delivery', 'pickup'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS orders_pickup_due_idx ON orders (pickup_due_at) WHERE fulfillment = 'pickup';

ALTER TABLE payment_quotes ADD COLUMN IF NOT EXISTS fulfillment text NOT NULL DEFAULT 'delivery';

-- Collect-by date: order time + 7 days, for pickup orders only.
CREATE OR REPLACE FUNCTION set_pickup_due_date()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.pickup_due_at := CASE WHEN NEW.fulfillment = 'pickup'
                            THEN COALESCE(NEW.created_at, now()) + interval '7 days' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_pickup_due ON orders;
CREATE TRIGGER trg_orders_pickup_due
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_pickup_due_date();

-- ── quote_order: + p_fulfillment ────────────────────────────
-- Replaced (not overloaded): two quote_order()s would make the API's
-- 2-argument call ambiguous.
DROP FUNCTION IF EXISTS quote_order(jsonb, text);
CREATE OR REPLACE FUNCTION quote_order(p_items jsonb, p_coupon_code text DEFAULT NULL, p_fulfillment text DEFAULT 'delivery')
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
  IF p_fulfillment IS NULL OR p_fulfillment NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'bad_fulfillment';
  END IF;

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
  v_shipping := CASE
    WHEN p_fulfillment = 'pickup' THEN 0
    WHEN v_subtotal - v_loyalty - v_coupon_discount >= v_free_ship THEN 0
    ELSE 99 END;
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
    'fulfillment', p_fulfillment,
    'shipping', v_shipping,
    'total', v_total,
    -- Store pickup is paid in full online; no cash on delivery.
    'cod_available', p_fulfillment = 'delivery' AND COALESCE(st.cod_enabled, true) AND v_total >= COALESCE(st.cod_min_order, 0),
    'cod_advance', round(v_total * COALESCE(st.cod_advance_percent, 20) / 100),
    'cod_advance_percent', COALESCE(st.cod_advance_percent, 20)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION quote_order(jsonb, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION quote_order(jsonb, text, text) TO authenticated;

-- ── paid-quote check: + fulfillment ─────────────────────────
CREATE OR REPLACE FUNCTION order_matches_payment_quote(
  p_payment_id text, p_items jsonb, p_coupon_code text,
  p_subtotal numeric, p_discount numeric, p_coupon_discount numeric,
  p_shipping numeric, p_total numeric, p_payment_method text, p_cod_advance numeric,
  p_fulfillment text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM verified_payments vp
    JOIN payment_quotes q ON q.razorpay_order_id = vp.razorpay_order_id
    WHERE vp.payment_id = p_payment_id
      AND vp.used = false
      AND q.user_id = auth.uid()
      AND q.items_key = order_items_key(p_items)
      AND q.coupon_code IS NOT DISTINCT FROM p_coupon_code
      AND q.subtotal = p_subtotal
      AND q.loyalty_discount = p_discount
      AND q.coupon_discount = p_coupon_discount
      AND q.shipping = p_shipping
      AND q.total = p_total
      AND q.fulfillment = p_fulfillment
      AND (
        (p_payment_method = 'razorpay' AND q.payment_type = 'full'
          AND vp.amount_paise = round(q.total * 100)::integer)
        OR (p_payment_method = 'cod' AND q.payment_type = 'cod_advance'
          AND p_fulfillment = 'delivery'
          AND p_cod_advance = q.cod_advance
          AND vp.amount_paise = round(q.cod_advance * 100)::integer)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION order_matches_payment_quote(text, jsonb, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION order_matches_payment_quote(text, jsonb, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text) TO authenticated;

-- ── orders INSERT policy: 20261007000002's list + collected_at and
--    the fulfillment-aware quote check ───────────────────────
DROP POLICY IF EXISTS "orders: customers insert own" ON orders;
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
    AND collected_at IS NULL
    AND payment_id IS NOT NULL
    AND order_matches_payment_quote(
      payment_id, items, coupon_code,
      subtotal, discount, coupon_discount, shipping, total,
      payment_method, cod_advance_amount, fulfillment
    )
  );

DROP FUNCTION IF EXISTS order_matches_payment_quote(text, jsonb, text, numeric, numeric, numeric, numeric, numeric, text, numeric);
