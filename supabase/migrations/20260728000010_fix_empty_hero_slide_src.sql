-- The live hero slide has media_type "video" but src "" (empty) — that's why
-- the hero renders no image/video at all. It was set before the Hero editor
-- could actually upload a file (MediaUrlField). Filling it with a real image
-- as a working placeholder; the admin can replace it via the now-working
-- upload button in /admin/website-sections at any time.
UPDATE website_sections
SET config = jsonb_set(
  config,
  '{slides,0}',
  (config->'slides'->0) || '{"media_type": "image", "src": "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1600"}'::jsonb
)
WHERE page_slug = 'home' AND section_type = 'hero'
  AND (config->'slides'->0->>'src') = '';
