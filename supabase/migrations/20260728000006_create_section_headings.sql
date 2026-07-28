-- ============================================================
-- Global "Headings" registry: lets admins rename and recolor any
-- site-wide section heading without a code change. Rows are looked
-- up by a stable `key` from the frontend component that owns that
-- heading; a missing row means the component's hardcoded default text
-- and theme color are used.
-- ============================================================

CREATE TABLE IF NOT EXISTS section_headings (
  key          text PRIMARY KEY,
  label        text NOT NULL,
  heading_text text NOT NULL,
  text_color   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE section_headings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read section headings" ON section_headings
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage section headings" ON section_headings
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO section_headings (key, label, heading_text) VALUES
  ('product_specifications', 'Product Specifications (eyebrow: THE DETAILS)', 'PREMIUM FABRIC.'),
  ('motion_picture',         'Motion Picture', 'MOTION
PICTURE'),
  ('influencer_picks',       'Influencer Picks', 'INFLUENCER PICKS'),
  ('lookbook',               'Lookbook', 'LOOKBOOK'),
  ('worn_by_community',      'Worn By Our Community', 'WORN BY OUR COMMUNITY'),
  ('testimonials',           'Testimonials', 'WORN IN
EVERY CITY')
ON CONFLICT (key) DO NOTHING;
