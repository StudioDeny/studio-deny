-- ============================================================
-- Migration: online orders move the same per-size stock the POS uses.
--   * paid order inserted                   -> variant stock goes down
--   * order CANCELLED / return RECEIVED      -> stock goes back, once
--   * check_cart_stock()                      -> checkout asks before payment
-- Every movement is written to pos_inventory_logs so the billing app's
-- inventory history shows online and in-store sales together.
-- ============================================================
BEGIN;

ALTER TABLE pos_inventory_logs DROP CONSTRAINT IF EXISTS pos_inventory_logs_reason_check;
ALTER TABLE pos_inventory_logs ADD CONSTRAINT pos_inventory_logs_reason_check
  CHECK (reason IN ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN_RESTOCK', 'DAMAGED', 'VOID', 'EDIT',
                    'ONLINE_SALE', 'ONLINE_RESTOCK'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz;
-- true once this order has reduced stock; orders placed before this
-- migration stay false, so cancelling them never adds stock that was never taken.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_taken boolean NOT NULL DEFAULT false;

-- Stock moves from orders.items - the item list the customer paid for.
-- orders can only be inserted with a verified, single-use payment and
-- customers cannot update them, so extra rows a customer adds to
-- order_items afterwards can never reduce stock. Payment is already
-- captured at insert time, so this never fails the insert: stock is
-- clamped at 0 and an oversell is flagged in the log.
CREATE OR REPLACE FUNCTION trg_order_take_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb;
  v_variant uuid;
  v_qty integer;
  v_slug text;
  v_old integer;
  v_new integer;
BEGIN
  IF jsonb_typeof(NEW.items::jsonb) <> 'array' THEN RETURN NULL; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(NEW.items::jsonb) LOOP
    v_variant := CASE WHEN coalesce(it->>'variantId', '') ~* '^[0-9a-f-]{36}$' THEN (it->>'variantId')::uuid END;
    v_qty := CASE WHEN coalesce(it->>'qty', '') ~ '^[0-9]+$' THEN (it->>'qty')::integer ELSE 0 END;
    CONTINUE WHEN v_variant IS NULL OR v_qty <= 0;
    SELECT stock, product_id INTO v_old, v_slug FROM product_variants WHERE id = v_variant FOR UPDATE;
    CONTINUE WHEN NOT FOUND;
    v_new := greatest(0, v_old - v_qty);
    UPDATE product_variants SET stock = v_new WHERE id = v_variant;
    INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
    VALUES (v_variant, v_slug, -v_qty, v_new, 'ONLINE_SALE',
            'Order ' || NEW.id || CASE WHEN v_old < v_qty THEN ' - OVERSOLD (had ' || v_old || ')' ELSE '' END);
  END LOOP;
  UPDATE orders SET stock_taken = true WHERE id = NEW.id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS order_take_stock ON orders;
CREATE TRIGGER order_take_stock
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_order_take_stock();

CREATE OR REPLACE FUNCTION trg_order_restore_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb;
  v_variant uuid;
  v_qty integer;
  v_slug text;
  v_new integer;
BEGIN
  IF NEW.stock_restored_at IS NOT NULL THEN RETURN NULL; END IF;
  IF NOT (
    (NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED')
    OR (NEW.return_status = 'RECEIVED' AND OLD.return_status IS DISTINCT FROM 'RECEIVED')
  ) THEN
    RETURN NULL;
  END IF;
  -- Orders placed before this migration never took stock - nothing to give back.
  IF NOT NEW.stock_taken THEN RETURN NULL; END IF;

  IF jsonb_typeof(NEW.items::jsonb) = 'array' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(NEW.items::jsonb) LOOP
      v_variant := CASE WHEN coalesce(it->>'variantId', '') ~* '^[0-9a-f-]{36}$' THEN (it->>'variantId')::uuid END;
      v_qty := CASE WHEN coalesce(it->>'qty', '') ~ '^[0-9]+$' THEN (it->>'qty')::integer ELSE 0 END;
      CONTINUE WHEN v_variant IS NULL OR v_qty <= 0;
      UPDATE product_variants SET stock = stock + v_qty WHERE id = v_variant RETURNING stock, product_id INTO v_new, v_slug;
      CONTINUE WHEN NOT FOUND;
      INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
      VALUES (v_variant, v_slug, v_qty, v_new, 'ONLINE_RESTOCK',
              'Order ' || NEW.id || CASE WHEN NEW.status = 'CANCELLED' THEN ' cancelled' ELSE ' return received' END);
    END LOOP;
  END IF;

  UPDATE orders SET stock_restored_at = now() WHERE id = NEW.id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS order_restore_stock ON orders;
CREATE TRIGGER order_restore_stock
  AFTER UPDATE OF status, return_status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_order_restore_stock();

-- Checkout calls this before opening payment. Returns only the lines
-- that do not have enough stock. p_items: [{"variant_id": uuid, "qty": int}]
CREATE OR REPLACE FUNCTION check_cart_stock(p_items jsonb)
RETURNS TABLE (variant_id uuid, size text, color text, available integer, requested integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.size, v.color, v.stock, (i->>'qty')::integer
  FROM jsonb_array_elements(p_items) i
  JOIN product_variants v ON v.id = (i->>'variant_id')::uuid
  WHERE v.stock < (i->>'qty')::integer;
$$;
GRANT EXECUTE ON FUNCTION check_cart_stock(jsonb) TO anon, authenticated;

COMMIT;
