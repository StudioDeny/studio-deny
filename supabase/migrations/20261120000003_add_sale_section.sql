-- Step 2 of 2 — run after 20261120000002_add_sale_section_type.sql.
-- Manual per-product "On Sale" flag (ticked in the product form), plus the
-- homepage Sale section row, placed directly after New Arrivals.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_on_sale_idx ON products (is_on_sale) WHERE is_on_sale = true;

-- Make room at position 8 for the Sale section (everything from 8 down moves one step).
UPDATE website_sections SET position = position + 1
WHERE page_slug = 'home' AND position >= 8;

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'sale', 'Sale', true, 8, '{"cta_label": "EXPLORE COLLECTION"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'sale'
);
