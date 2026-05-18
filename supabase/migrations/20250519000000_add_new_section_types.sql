-- Add new section type enum values
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'why_us';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'instagram_feed';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'newsletter';

-- Seed default Why Us section
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'why_us', 'Why Studio Deny', true, 10,
  '{
    "eyebrow": "WHY STUDIO DENY",
    "title": "BUILT DIFFERENT.",
    "subtitle": "STAYS DIFFERENT.",
    "features": [
      { "label": "PREMIUM GSM FABRIC", "desc": "300+ GSM heavyweight cotton. Structured, substantial, and built to outlast trends by decades." },
      { "label": "LIMITED DROPS ONLY", "desc": "Every piece ships in limited quantities. Own something not everyone has — because that''s the point." },
      { "label": "BUILT TO LAST", "desc": "Reinforced stitching, pre-shrunk cotton, stress-tested hardware. Wear it hard for years." },
      { "label": "RESPONSIBLE CRAFT", "desc": "Ethically produced in small-batch facilities. Quality you can feel and a process you can stand behind." }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'why_us'
);

-- Seed default Instagram Feed section
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'instagram_feed', 'Community Feed', true, 11,
  '{
    "eyebrow": "THE COMMUNITY",
    "title": "@STUDIODENY",
    "handle": "studiodeny",
    "image_urls": [
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80",
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&q=80",
      "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&q=80"
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'instagram_feed'
);

-- Seed default Newsletter section
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'newsletter', 'Drop Alerts', true, 12,
  '{
    "eyebrow": "DROP ALERTS",
    "title": "READY FOR THE NEXT DROP?",
    "subtitle": "Be first in line when new pieces launch. No spam, just early access.",
    "cta_label": "GET EARLY ACCESS"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'newsletter'
);
