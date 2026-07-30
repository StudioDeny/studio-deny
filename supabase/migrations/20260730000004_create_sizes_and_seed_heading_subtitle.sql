-- ============================================================
-- Category-scoped Sizes catalog: admin defines the size list per
-- leaf category (e.g. "Tops" -> S/M/L/XL, "Rings" -> 6/7/8/9). The
-- product form and variant modal read this instead of free-text entry.
-- ============================================================

CREATE TABLE IF NOT EXISTS sizes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  label       text NOT NULL,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, label)
);

ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read sizes" ON sizes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage sizes" ON sizes
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Product Specifications' second heading line ("UNCOMPROMISED QUALITY.")
-- was hardcoded in the component; it now reads the existing generic
-- `subtitle_text` column (already used by other sections for a line
-- under the heading) instead of a new column.
INSERT INTO section_headings (key, label, heading_text, eyebrow_text, subtitle_text) VALUES
  ('product_specifications', 'Product Specifications', 'PREMIUM FABRIC.', 'THE DETAILS', 'UNCOMPROMISED QUALITY.')
ON CONFLICT (key) DO UPDATE SET subtitle_text = EXCLUDED.subtitle_text WHERE section_headings.subtitle_text IS NULL;
