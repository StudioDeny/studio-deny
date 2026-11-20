-- ============================================================
-- Migration: add manual per-product "New Arrival" flag.
-- Same single-column pattern as 20260721000001_add_product_best_seller.sql.
-- The homepage New Arrivals section lists every active product with this flag,
-- newest first, so admins opt products in with one tick in the product form.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_new_arrival_idx ON products (is_new_arrival) WHERE is_new_arrival = true;
