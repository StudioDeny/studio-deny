-- The gender_split section already has a live config row (seeded before the
-- Accessories card was added to the design) with only 2 cards — the
-- application code's new 3-card default never applies once a real row
-- exists, so this directly rewrites the live row to Men / Accessories / Women.
UPDATE website_sections
SET config = '{
  "cards": [
    { "media_type": "image", "src": "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&q=80&w=1200", "label": "MEN", "cta_href": "/collections/men" },
    { "media_type": "image", "src": "https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&q=80&w=1200", "label": "ACCESSORIES", "cta_href": "/collections/accessories" },
    { "media_type": "image", "src": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200", "label": "WOMEN", "cta_href": "/collections/women" }
  ]
}'::jsonb
WHERE page_slug = 'home' AND section_type = 'gender_split';
