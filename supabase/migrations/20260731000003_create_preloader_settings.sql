-- ============================================================
-- Migration: Site preloader — admin-editable typography + backdrop (singleton row)
-- ============================================================

CREATE TABLE IF NOT EXISTS preloader_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  font_size_px   integer NOT NULL DEFAULT 14,
  font_weight    integer NOT NULL DEFAULT 800,
  font_family    text NOT NULL DEFAULT '',
  font_color     text NOT NULL DEFAULT '#FFFFFF',
  bg_type        text NOT NULL DEFAULT 'color' CHECK (bg_type IN ('color', 'image', 'video')),
  bg_color       text NOT NULL DEFAULT '#000000',
  bg_image_url   text,
  bg_video_url   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_preloader_settings_updated_at
    BEFORE UPDATE ON preloader_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO preloader_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM preloader_settings);

ALTER TABLE preloader_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "preloader_settings: public read" ON preloader_settings
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "preloader_settings: admins write" ON preloader_settings
    FOR ALL USING (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
