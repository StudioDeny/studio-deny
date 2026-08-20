-- ============================================================
-- Migration: add return-flow tracking columns to `orders`.
-- Mirrors the shiprocket_* shipping fields added in
-- 20260811000001_add_shiprocket_fields.sql, but for the reverse
-- (customer → warehouse) shipment created once a DELIVERED order's
-- return is requested.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS return_status text
    CHECK (return_status IN ('REQUESTED', 'PICKUP_SCHEDULED', 'PICKUP_FAILED', 'RECEIVED')),
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS return_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS shiprocket_return_order_id text,
  ADD COLUMN IF NOT EXISTS shiprocket_return_shipment_id text,
  ADD COLUMN IF NOT EXISTS return_awb_number text,
  ADD COLUMN IF NOT EXISTS return_courier_name text,
  ADD COLUMN IF NOT EXISTS return_tracking_url text,
  ADD COLUMN IF NOT EXISTS return_received_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_return_awb_number_idx ON orders (return_awb_number);
