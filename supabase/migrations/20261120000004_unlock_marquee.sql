-- The Marquee Bar was seeded as locked, which stops the admin from hiding it.
-- Unlock it so its visibility switch works like every other homepage section.
UPDATE website_sections
SET is_locked = false
WHERE page_slug = 'home' AND section_type = 'marquee';
