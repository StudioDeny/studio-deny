-- ============================================================
-- Migration: add manual per-product "Best Seller" flag.
-- Follows the same safe single-column pattern as
-- 20250624000000_add_gallery_material_care.sql / 20250625000000_add_fit.sql
-- (i.e. NOT bundled into the risky multi-column products ALTER in
-- 20250516000001_alter_existing_tables.sql, which silently no-op'd live).
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_best_seller_idx ON products (is_best_seller) WHERE is_best_seller = true;
