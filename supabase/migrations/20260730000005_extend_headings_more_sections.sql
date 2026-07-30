-- Consolidate a few more section headings (previously edited only from
-- each section's own config form in Website Sections) into the central
-- section_headings registry, so the admin Headings page covers them too.
INSERT INTO section_headings (key, label, heading_text, eyebrow_text, subtitle_text) VALUES
  ('new_arrivals', 'New Arrivals', 'NEW ARRIVALS', 'FRESH OFF THE PRESS', NULL),
  ('why_us',       'Why Us', 'BUILT DIFFERENT.', 'WHY STUDIO DENY', 'STAYS DIFFERENT.'),
  ('newsletter',   'Newsletter', 'READY FOR THE NEXT DROP?', 'DROP ALERTS', 'Be first in line when new pieces launch. No spam, just early access.'),
  ('faq',          'FAQ', 'WE''VE GOT ANSWERS.', 'GOT QUESTIONS?', NULL),
  ('popular_now',  'Popular Now', 'POPULAR NOW', NULL, NULL)
ON CONFLICT (key) DO NOTHING;
