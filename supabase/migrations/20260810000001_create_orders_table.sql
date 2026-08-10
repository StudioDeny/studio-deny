-- ============================================================
-- Migration: create the `orders` table — it never actually existed live
-- (confirmed via direct REST query: PGRST205 "Could not find the table
-- 'public.orders'"). Every order until now only ever lived in the
-- customer's own browser sessionStorage; admin never saw a single one.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10000001;

CREATE TABLE IF NOT EXISTS orders (
  id                 text PRIMARY KEY,
  order_number       text UNIQUE NOT NULL DEFAULT ('SD-' || lpad(nextval('order_number_seq')::text, 8, '0')),
  invoice_no         text,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email         text NOT NULL,
  items              jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal           numeric(10,2) NOT NULL DEFAULT 0,
  shipping           numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate           numeric(5,2) NOT NULL DEFAULT 0,
  tax                numeric(10,2) NOT NULL DEFAULT 0,
  discount           numeric(10,2) NOT NULL DEFAULT 0,
  extra_lines        jsonb NOT NULL DEFAULT '[]'::jsonb,
  total              numeric(10,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'PLACED'
                       CHECK (status IN ('PLACED','PACKED','SHIPPED','DELIVERED','CANCELLED','REFUNDED')),
  address            jsonb NOT NULL,
  payment_id         text,
  payment_method     text NOT NULL DEFAULT 'razorpay' CHECK (payment_method IN ('razorpay','cod')),
  cod_advance_paid   boolean NOT NULL DEFAULT false,
  cod_advance_amount numeric(10,2),
  notes              text,
  refund_amount      numeric(10,2),
  refunded_at        timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_user_email_idx ON orders (user_email);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- order_items.order_id was always a bare text column with a comment
-- claiming an FK that was never enforced. A handful of rows already exist
-- from earlier test checkouts (written by an admin-role test account,
-- which the old admin-only RLS policy let through) but they reference an
-- order that was never actually recorded anywhere, since `orders` didn't
-- exist — drop those orphans before the FK can be added.
DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);

DO $$ BEGIN
  ALTER TABLE order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "orders: own rows" ON orders
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "orders: admins all" ON orders
    FOR ALL USING (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- order_items previously had an admin-only policy, meaning a customer's
-- own order_items insert (fired from checkout) was always silently
-- rejected by RLS — this is the other half of why the table stayed empty.
DO $$ BEGIN
  CREATE POLICY "order_items: read own via order" ON order_items
    FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "order_items: insert own via order" ON order_items
    FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
