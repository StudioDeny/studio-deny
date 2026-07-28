ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'popular_now';

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'popular_now', 'Popular Now', true, 18,
  '{
    "title": "POPULAR NOW",
    "items": [
      { "slug": "tactical-cargo-pant", "tag": "BEST SELLER" },
      { "slug": "afterhours-bomber", "tag": "NEW ARRIVAL" },
      { "slug": "static-trucker-cap" },
      { "slug": "ringer-graphic-tee", "tag": "BEST SELLER" },
      { "slug": "grit-denim-baggy" }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'popular_now'
);
