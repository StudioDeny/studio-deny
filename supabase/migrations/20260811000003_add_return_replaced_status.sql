-- ============================================================
-- Migration: support "sent a replacement" as a return outcome,
-- alongside the existing refund outcome.
-- ============================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_return_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_return_status_check
  CHECK (return_status IN ('REQUESTED', 'PICKUP_SCHEDULED', 'PICKUP_FAILED', 'RECEIVED', 'REPLACED'));

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS replacement_order_id text REFERENCES orders(id) ON DELETE SET NULL;
