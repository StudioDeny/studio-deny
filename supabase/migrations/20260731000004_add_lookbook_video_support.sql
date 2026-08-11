-- ============================================================
-- Migration: lookbook_slides — support video slides, not just images
-- ============================================================

ALTER TABLE lookbook_slides
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
