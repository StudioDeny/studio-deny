ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'popular_now';

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'popular_now', 'Popular Now', true, 18,
  '{
    "title": "POPULAR NOW",
    "product_slugs": ["tactical-cargo-pant", "afterhours-bomber", "static-trucker-cap", "ringer-graphic-tee", "grit-denim-baggy"]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'popular_now'
);
