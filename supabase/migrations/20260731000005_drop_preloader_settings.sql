-- ============================================================
-- Migration: drop preloader_settings — the Preloader component was
-- redesigned (no text, fixed backdrop) and no longer reads this config.
-- Safe no-op if 20260731000003_create_preloader_settings.sql was never run.
-- ============================================================

DROP TABLE IF EXISTS preloader_settings;
