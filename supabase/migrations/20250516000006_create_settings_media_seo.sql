-- ============================================================
-- Migration: Brand settings, theme settings, SEO, media assets
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- brand_settings (singleton row)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name         text NOT NULL DEFAULT 'STUDIO/DENY',
  tagline           text,
  logo_url          text,
  favicon_url       text,
  og_default_image  text,
  social_instagram  text,
  social_twitter    text,
  social_facebook   text,
  contact_email     text,
  contact_phone     text,
  address           text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_brand_settings_updated_at
    BEFORE UPDATE ON brand_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- theme_settings (singleton row)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS theme_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accent_color       text NOT NULL DEFAULT '#c8f135',
  font_display       text,
  font_ui            text,
  border_radius      text,
  animations_enabled boolean NOT NULL DEFAULT true,
  custom_css         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_theme_settings_updated_at
    BEFORE UPDATE ON theme_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- seo_settings — one row per page_slug
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text NOT NULL UNIQUE,
  title           text,
  description     text,
  og_image        text,
  og_title        text,
  og_description  text,
  canonical_url   text,
  no_index        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_seo_settings_updated_at
    BEFORE UPDATE ON seo_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- media_assets — Cloudinary upload metadata
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id  text NOT NULL UNIQUE,
  secure_url text NOT NULL,
  alt_text   text,
  folder     text,
  width      integer,
  height     integer,
  bytes      integer,
  format     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_folder_idx ON media_assets (folder) WHERE folder IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_created_idx ON media_assets (created_at DESC);
