-- ============================================================
-- Migration: close the remaining order-forgery gap from 20260812000007.
--
-- That migration pinned orders.total to a real, captured Razorpay
-- payment — but never checked that the individual line items (orders.
-- items jsonb, and the separate order_items rows) actually cost what
-- the catalog says they cost. A customer could still pay the real,
-- correct total for a cheap item while forging `items` to claim they
-- bought something expensive — and shiprocket-sync reads `items`
-- directly to build the shipment and declares that forged price to the
-- courier as `selling_price`, so this wasn't just a bookkeeping gap.
--
-- items_match_catalog_prices() validates every element of orders.items
-- against the live product/variant price; the order_items INSERT
-- policy gets the equivalent check inline (it's flat columns, not a
-- jsonb array, so no loop function needed there).
--
-- Also adds `discount <= subtotal` — without it, a customer could pair
-- a correctly-priced but qty-inflated order with an oversized discount
-- to still land on a `total` that matches a real (smaller) payment,
-- effectively claiming extra quantity for free. This bounds the worst
-- of that, though closing it fully would require the loyalty discount
-- % itself to be verified server-side against a real tier — today
-- LoyaltySettings is still localStorage-only (see 03-ADMIN-PANEL.md),
-- so there's no server-side source of truth to check a claimed discount
-- against yet. That's a separate, larger fix, not covered here.
-- ============================================================

CREATE OR REPLACE FUNCTION items_match_catalog_prices(items jsonb)
RETURNS boolean AS $$
DECLARE
  item jsonb;
  item_price numeric;
  item_slug text;
  item_variant_id text;
  real_price numeric;
BEGIN
  IF items IS NULL OR jsonb_array_length(items) = 0 THEN
    RETURN false;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    item_slug := item->>'slug';
    item_variant_id := item->>'variantId';
    item_price := (item->>'price')::numeric;
    real_price := NULL;

    IF item_variant_id IS NOT NULL AND item_variant_id <> '' THEN
      SELECT price INTO real_price FROM product_variants
        WHERE id::text = item_variant_id AND product_id = item_slug;
    ELSE
      SELECT price INTO real_price FROM products WHERE slug = item_slug;
    END IF;

    IF real_price IS NULL OR item_price IS DISTINCT FROM real_price THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
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
      AND discount <= subtotal
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

DROP POLICY IF EXISTS "order_items: insert own via order" ON order_items;

DO $$ BEGIN
  CREATE POLICY "order_items: insert own via order" ON order_items
    FOR INSERT WITH CHECK (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
      AND (
        (variant_id IS NOT NULL AND unit_price = (SELECT price FROM product_variants WHERE id = variant_id AND product_id = product_slug))
        OR (variant_id IS NULL AND unit_price = (SELECT price FROM products WHERE slug = product_slug))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_discount_bound_check
    CHECK (discount >= 0 AND discount <= subtotal) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
