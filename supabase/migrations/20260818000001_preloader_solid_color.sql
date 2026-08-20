-- ============================================================
-- Migration: preloader backdrop can now also be a plain solid colour,
-- not just image/video.
-- ============================================================

ALTER TABLE preloader_settings ADD COLUMN IF NOT EXISTS bg_color text NOT NULL DEFAULT '#0a0a0a';

ALTER TABLE preloader_settings DROP CONSTRAINT IF EXISTS preloader_settings_bg_type_check;

ALTER TABLE preloader_settings ADD CONSTRAINT preloader_settings_bg_type_check
  CHECK (bg_type IN ('image', 'video', 'color'));
