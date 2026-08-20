-- ============================================================
-- Migration: Shiprocket shipping/tracking fields on orders
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id    text,
  ADD COLUMN IF NOT EXISTS shiprocket_shipment_id text,
  ADD COLUMN IF NOT EXISTS awb_number             text,
  ADD COLUMN IF NOT EXISTS courier_name           text,
  ADD COLUMN IF NOT EXISTS tracking_url           text,
  ADD COLUMN IF NOT EXISTS shipped_at             timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at           timestamptz,
  ADD COLUMN IF NOT EXISTS rto_initiated_at       timestamptz;

CREATE INDEX IF NOT EXISTS orders_awb_number_idx ON orders (awb_number) WHERE awb_number IS NOT NULL;
