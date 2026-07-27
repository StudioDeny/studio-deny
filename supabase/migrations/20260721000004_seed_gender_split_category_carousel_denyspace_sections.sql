-- ============================================================
-- Migration: seed default rows for the 3 section types added in
-- 20260721000003_add_gender_split_category_carousel_denyspace_sections.sql
--
-- RUN THIS ONLY AFTER that file has been run and committed
-- separately — see the note at the top of that file for why.
-- ============================================================

-- Seed default Gender Split section
-- (positions 15/16/17 — verified live `website_sections` rows already
-- occupy 0,2,4,6,8,10,12,13,14, so this continues right after them)
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'gender_split', 'Men / Women Split', true, 15,
  '{
    "cards": [
      { "media_type": "image", "src": "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&q=80&w=1200", "label": "SHOP MEN", "cta_href": "/collections/men" },
      { "media_type": "image", "src": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200", "label": "SHOP WOMEN", "cta_href": "/collections/women" }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'gender_split'
);

-- Seed default Category Carousel section
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'category_carousel', 'Category Carousel', true, 16,
  '{
    "slides": [
      { "media_type": "image", "src": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1600", "label": "BEST SELLERS", "href": "/shop?sort=best" },
      { "media_type": "image", "src": "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1600", "label": "NEW DROPS", "href": "/shop?sort=new" }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'category_carousel'
);

-- Seed default DenySpace section
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'denyspace', 'DenySpace', true, 17,
  '{
    "logo_url": "https://res.cloudinary.com/dsqeawg67/image/upload/v1783356678/WhatsApp_Image_2026-07-03_at_15.50.55-removebg-preview_i8wcnb.png",
    "description": "One qualifying order unlocks you into our private pool. After that, every rupee you spend earns points — and every point is real money off your next order.",
    "benefits": [
      { "icon": "Truck", "label": "FREE SHIPPING", "desc": "On every qualifying order" },
      { "icon": "RotateCcw", "label": "EASY RETURNS", "desc": "7-day no-questions returns" },
      { "icon": "ShieldCheck", "label": "SECURE CHECKOUT", "desc": "Your payments, protected" },
      { "icon": "Gift", "label": "EARLY ACCESS", "desc": "48hr head start on new drops" }
    ],
    "cta_label": "JOIN DENYSPACE",
    "cta_href": "/rewards"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'denyspace'
);
