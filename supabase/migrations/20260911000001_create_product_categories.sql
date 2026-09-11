-- ============================================================
-- Migration: product_categories join table so one product can belong
-- to multiple categories. products.category_id stays as-is (the
-- "primary" category, used for breadcrumbs/badges/size lookup) — this
-- table is the full membership list, including the primary, so any
-- "which categories is this product in" / "which products are in this
-- category" query has one source of truth.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_slug, category_id)
);

CREATE INDEX IF NOT EXISTS product_categories_category_idx ON product_categories (category_id);
CREATE INDEX IF NOT EXISTS product_categories_product_idx ON product_categories (product_slug);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read product categories" ON product_categories
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage product categories" ON product_categories
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: every product's existing primary category becomes its first
-- explicit membership row, so nothing currently visible in a category
-- listing disappears once listing code switches to reading this table.
INSERT INTO product_categories (product_slug, category_id)
SELECT slug, category_id FROM products WHERE category_id IS NOT NULL
ON CONFLICT (product_slug, category_id) DO NOTHING;
