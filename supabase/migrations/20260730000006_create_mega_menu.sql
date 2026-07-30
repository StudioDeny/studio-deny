-- ============================================================
-- Mega menu: an independent nav structure (top-level categories ->
-- link column -> image tiles), each link/tile optionally pointing at
-- a real product category (resolved to /collections/{slug}) or a
-- plain custom URL. Deliberately separate from the `categories` table
-- so marketing can add tabs/links that aren't real product categories
-- (e.g. a "SALE" tab) without touching product categorization.
-- ============================================================

CREATE TABLE IF NOT EXISTS mega_menu_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  href        text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  position    integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mega_menu_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_category_id  uuid NOT NULL REFERENCES mega_menu_categories(id) ON DELETE CASCADE,
  label             text NOT NULL,
  href              text,
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  position          integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mega_menu_tiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_category_id  uuid NOT NULL REFERENCES mega_menu_categories(id) ON DELETE CASCADE,
  label             text NOT NULL,
  href              text,
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url         text NOT NULL,
  image_type        text NOT NULL DEFAULT 'image',
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mega_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mega_menu_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mega_menu_tiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read active mega menu categories" ON mega_menu_categories
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage mega menu categories" ON mega_menu_categories
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read active mega menu links" ON mega_menu_links
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage mega menu links" ON mega_menu_links
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read mega menu tiles" ON mega_menu_tiles
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage mega menu tiles" ON mega_menu_tiles
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed with today's actual hardcoded navbar content (Women/Men/Accessories +
-- Accessories' Rings/Chains/Socks) so the live navbar isn't blank after this
-- ships — admin edits from here. Guarded so re-running this migration is safe.
DO $$
DECLARE
  v_women_cat_id uuid; v_men_cat_id uuid; v_acc_cat_id uuid;
  v_rings_id uuid; v_chains_id uuid; v_socks_id uuid;
  v_women_id uuid; v_men_id uuid; v_acc_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mega_menu_categories LIMIT 1) THEN
    SELECT id INTO v_women_cat_id FROM categories WHERE slug = 'women';
    SELECT id INTO v_men_cat_id FROM categories WHERE slug = 'men';
    SELECT id INTO v_acc_cat_id FROM categories WHERE slug = 'accessories';
    SELECT id INTO v_rings_id FROM categories WHERE slug = 'rings';
    SELECT id INTO v_chains_id FROM categories WHERE slug = 'chains';
    SELECT id INTO v_socks_id FROM categories WHERE slug = 'socks';

    INSERT INTO mega_menu_categories (label, category_id, position) VALUES ('WOMEN', v_women_cat_id, 0) RETURNING id INTO v_women_id;
    INSERT INTO mega_menu_categories (label, category_id, position) VALUES ('MEN', v_men_cat_id, 1) RETURNING id INTO v_men_id;
    INSERT INTO mega_menu_categories (label, category_id, position) VALUES ('ACCESSORIES', v_acc_cat_id, 2) RETURNING id INTO v_acc_id;

    INSERT INTO mega_menu_links (menu_category_id, label, href, position) VALUES
      (v_women_id, 'NEW ARRIVALS', '/collections/women?sort=new', 0),
      (v_women_id, 'SHOP ALL WOMEN', '/collections/women', 1),
      (v_men_id, 'NEW ARRIVALS', '/collections/men?sort=new', 0),
      (v_men_id, 'SHOP ALL MEN', '/collections/men', 1);

    INSERT INTO mega_menu_links (menu_category_id, label, category_id, position) VALUES
      (v_acc_id, 'SHOP ALL ACCESSORIES', v_acc_cat_id, 0),
      (v_acc_id, 'RINGS', v_rings_id, 1),
      (v_acc_id, 'CHAINS', v_chains_id, 2),
      (v_acc_id, 'SOCKS', v_socks_id, 3);
  END IF;
END $$;
