-- ============================================================
-- Migration: create categories table with parent/child hierarchy,
-- add products.category_id, seed the new nav hierarchy.
-- The categories table does not exist in production today (verified
-- live) — this creates it from scratch rather than altering it.
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  parent_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read active categories" ON categories
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage categories" ON categories
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed hierarchy: Men, Women, Accessories (-> Rings, Chains, Socks), Sneakers.
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Men', 'men', NULL),
  ('Women', 'women', NULL),
  ('Sneakers', 'sneakers', NULL),
  ('Accessories', 'accessories', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Rings', 'rings', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Chains', 'chains', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Socks', 'socks', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

-- Also seed top-level rows for the existing flat category strings already
-- in use by live product data, so existing products can be re-pointed at
-- category_id without losing their current grouping.
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Tops', 'tops', NULL),
  ('Bottoms', 'bottoms', NULL),
  ('Outerwear', 'outerwear', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Re-point existing products at their matching category by the old flat
-- `category` text column (case-insensitive match). Verified live: only
-- Bottoms/Outerwear/Accessories/Tops are in use today, so this is a
-- straightforward name match, not a fuzzy/heuristic mapping.
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE lower(p.category) = lower(c.name)
  AND p.category_id IS NULL;
