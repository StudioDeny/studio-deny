-- Most sections follow an eyebrow / heading / subtitle pattern (e.g. "THE
-- DETAILS" eyebrow above "PREMIUM FABRIC.", or a one-line subtitle under
-- "LOOKBOOK"). Extending the existing section_headings registry to cover all
-- three, rather than adding a one-off admin field per section.
ALTER TABLE section_headings
  ADD COLUMN IF NOT EXISTS eyebrow_text text,
  ADD COLUMN IF NOT EXISTS subtitle_text text;

INSERT INTO section_headings (key, label, heading_text, eyebrow_text) VALUES
  ('product_specifications', 'Product Specifications', 'PREMIUM FABRIC.', 'THE DETAILS')
ON CONFLICT (key) DO UPDATE SET eyebrow_text = EXCLUDED.eyebrow_text WHERE section_headings.eyebrow_text IS NULL;

INSERT INTO section_headings (key, label, heading_text, eyebrow_text) VALUES
  ('influencer_picks', 'Influencer Picks', 'INFLUENCER PICKS', 'AS SEEN ON')
ON CONFLICT (key) DO UPDATE SET eyebrow_text = EXCLUDED.eyebrow_text WHERE section_headings.eyebrow_text IS NULL;

INSERT INTO section_headings (key, label, heading_text, subtitle_text) VALUES
  ('lookbook', 'Lookbook', 'LOOKBOOK', 'Swipe through curated fits built for daily movement.')
ON CONFLICT (key) DO UPDATE SET subtitle_text = EXCLUDED.subtitle_text WHERE section_headings.subtitle_text IS NULL;

INSERT INTO section_headings (key, label, heading_text, eyebrow_text, subtitle_text) VALUES
  ('worn_by_community', 'Worn By Our Community', 'WORN BY OUR COMMUNITY', 'THE STREETS SPEAK', 'Real people, real fits. Tag us @studiodeny')
ON CONFLICT (key) DO UPDATE SET
  eyebrow_text = EXCLUDED.eyebrow_text,
  subtitle_text = EXCLUDED.subtitle_text
WHERE section_headings.eyebrow_text IS NULL AND section_headings.subtitle_text IS NULL;

INSERT INTO section_headings (key, label, heading_text, eyebrow_text) VALUES
  ('contact_support', 'Contact Support', 'CONTACT SUPPORT', 'WE''RE HERE')
ON CONFLICT (key) DO NOTHING;
