-- ============================================================
-- Migration: Site preloader — admin-editable backdrop (image/video) and
-- main content (logo image OR glitching text + its colour). Singleton row.
-- Supersedes 20260731000003 (dropped in 20260731000005) — this is a
-- narrower, re-scoped version matching the redesigned Preloader component.
-- ============================================================

CREATE TABLE IF NOT EXISTS preloader_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bg_type            text NOT NULL DEFAULT 'image' CHECK (bg_type IN ('image', 'video')),
  bg_image_url       text,
  bg_video_url       text,
  content_type       text NOT NULL DEFAULT 'image' CHECK (content_type IN ('image', 'text')),
  content_image_url  text NOT NULL DEFAULT '/deny-space-preloader.png',
  content_text       text NOT NULL DEFAULT 'STUDIO DENY',
  text_color         text NOT NULL DEFAULT '#000000',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
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
