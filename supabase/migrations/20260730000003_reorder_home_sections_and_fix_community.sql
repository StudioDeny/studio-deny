-- ============================================================
-- Migration (step 2 of 2 — run 20260730000002_add_new_section_types.sql
-- FIRST, on its own): new canonical homepage section order, remove the
-- Instagram Feed section, and add Influencer Picks / Worn By
-- Community / Contact Support into the reorderable website_sections
-- system (they previously had no row at all — their content stays
-- managed on their own existing admin pages / brand settings; this
-- just gives each a position + visibility toggle).
-- ============================================================

-- New canonical order:
-- hero, marquee, gender_split, category_carousel, popular_now, why_us,
-- lookbook, new_arrivals, fabric_tabs, denyspace, influencer_picks,
-- motion_picture, community, contact_support, testimonials, newsletter, faq
UPDATE website_sections SET position = 0  WHERE page_slug = 'home' AND section_type = 'hero';
UPDATE website_sections SET position = 1  WHERE page_slug = 'home' AND section_type = 'marquee';
UPDATE website_sections SET position = 2  WHERE page_slug = 'home' AND section_type = 'gender_split';
UPDATE website_sections SET position = 3  WHERE page_slug = 'home' AND section_type = 'category_carousel';
UPDATE website_sections SET position = 4  WHERE page_slug = 'home' AND section_type = 'popular_now';
UPDATE website_sections SET position = 5  WHERE page_slug = 'home' AND section_type = 'why_us';
UPDATE website_sections SET position = 6  WHERE page_slug = 'home' AND section_type = 'lookbook';
UPDATE website_sections SET position = 7  WHERE page_slug = 'home' AND section_type = 'new_arrivals';
UPDATE website_sections SET position = 8  WHERE page_slug = 'home' AND section_type = 'fabric_tabs';
UPDATE website_sections SET position = 9  WHERE page_slug = 'home' AND section_type = 'denyspace';
UPDATE website_sections SET position = 11 WHERE page_slug = 'home' AND section_type = 'motion_picture';
UPDATE website_sections SET position = 14 WHERE page_slug = 'home' AND section_type = 'testimonials';
UPDATE website_sections SET position = 15 WHERE page_slug = 'home' AND section_type = 'newsletter';
-- FAQ gets a real homepage teaser section built this round, so it's turned on.
UPDATE website_sections SET position = 16, is_visible = true WHERE page_slug = 'home' AND section_type = 'faq';

-- New rows: position + visibility only, no config UI (content lives on
-- their own dedicated admin pages / brand settings).
INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'influencer_picks', 'Influencer Picks', true, 10, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'influencer_picks');

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'community', 'Worn By Community', true, 12, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'community');

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'contact_support', 'Contact Support', true, 13, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'contact_support');

-- Instagram Feed is being removed completely per product decision.
DELETE FROM website_sections WHERE page_slug = 'home' AND section_type = 'instagram_feed';
