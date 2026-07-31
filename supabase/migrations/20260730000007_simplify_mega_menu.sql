-- ============================================================
-- Simplify the mega menu: no free-text labels or custom URLs anywhere.
-- Every level resolves through something that already exists:
--   - a top-level tab IS an existing category (label = category name)
--   - a sublink IS an existing category (admin's pick, any category —
--     Men/Women have no real child categories today, so this can't be
--     restricted to direct children or Men/Women would have nothing)
--   - a tile IS an existing product (image/label/link all come from it,
--     capped at 2 per top-level tab, shown side by side, enforced in the admin UI)
-- ============================================================

-- Clean up seed rows that don't fit the new "must be a real category"
-- rule before adding the NOT NULL constraint that would reject them.
-- Guarded on the column still existing so this migration is safe to
-- re-run against a branch where a previous run already got this far
-- (e.g. a retried Supabase preview build).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mega_menu_links' AND column_name = 'label') THEN
    UPDATE mega_menu_links l
    SET category_id = c.id
    FROM mega_menu_categories mc
    JOIN categories c ON c.id = mc.category_id
    WHERE l.menu_category_id = mc.id
      AND l.category_id IS NULL
      AND l.label ILIKE 'SHOP ALL %';
  END IF;
END $$;

DELETE FROM mega_menu_links WHERE category_id IS NULL;
DELETE FROM mega_menu_categories WHERE category_id IS NULL;

ALTER TABLE mega_menu_categories
  ALTER COLUMN category_id SET NOT NULL,
  DROP COLUMN IF EXISTS href,
  DROP COLUMN IF EXISTS label;
DO $$ BEGIN
  ALTER TABLE mega_menu_categories ADD CONSTRAINT mega_menu_categories_category_id_key UNIQUE (category_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

ALTER TABLE mega_menu_links
  ALTER COLUMN category_id SET NOT NULL,
  DROP COLUMN IF EXISTS href,
  DROP COLUMN IF EXISTS label;

DROP TABLE IF EXISTS mega_menu_tiles;

CREATE TABLE IF NOT EXISTS mega_menu_products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_category_id  uuid NOT NULL REFERENCES mega_menu_categories(id) ON DELETE CASCADE,
  product_slug      text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_category_id, product_slug)
);

ALTER TABLE mega_menu_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read mega menu products" ON mega_menu_products
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage mega menu products" ON mega_menu_products
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
