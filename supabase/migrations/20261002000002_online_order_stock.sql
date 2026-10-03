-- ============================================================
-- Migration: online orders move the same per-size stock the POS uses.
--   * order item inserted (after payment)   -> variant stock goes down
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

-- Payment is already captured when items are inserted, so this never
-- fails the insert: stock is clamped at 0 and the oversell is flagged.
CREATE OR REPLACE FUNCTION trg_order_item_take_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old integer;
  v_new integer;
BEGIN
  IF NEW.variant_id IS NULL THEN RETURN NULL; END IF;
  SELECT stock INTO v_old FROM product_variants WHERE id = NEW.variant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_new := greatest(0, v_old - NEW.qty);
  UPDATE product_variants SET stock = v_new WHERE id = NEW.variant_id;
  INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
  VALUES (NEW.variant_id, NEW.product_slug, -NEW.qty, v_new, 'ONLINE_SALE',
          'Order ' || NEW.order_id
            || CASE WHEN v_old < NEW.qty THEN ' - OVERSOLD (had ' || v_old || ')' ELSE '' END);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS order_item_take_stock ON order_items;
CREATE TRIGGER order_item_take_stock
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_order_item_take_stock();

CREATE OR REPLACE FUNCTION trg_order_restore_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_new integer;
BEGIN
  IF NEW.stock_restored_at IS NOT NULL THEN RETURN NULL; END IF;
  IF NOT (
    (NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED')
    OR (NEW.return_status = 'RECEIVED' AND OLD.return_status IS DISTINCT FROM 'RECEIVED')
  ) THEN
    RETURN NULL;
  END IF;

  FOR r IN SELECT * FROM order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL LOOP
    UPDATE product_variants SET stock = stock + r.qty WHERE id = r.variant_id RETURNING stock INTO v_new;
    IF FOUND THEN
      INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
      VALUES (r.variant_id, r.product_slug, r.qty, v_new, 'ONLINE_RESTOCK',
              'Order ' || NEW.id || CASE WHEN NEW.status = 'CANCELLED' THEN ' cancelled' ELSE ' return received' END);
    END IF;
  END LOOP;

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
