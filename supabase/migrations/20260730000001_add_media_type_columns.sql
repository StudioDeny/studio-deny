-- ============================================================
-- Migration: media type columns for the universal image/video
-- MediaField rollout. Every field that previously assumed "this is
-- always an image" gets a paired `_type` column so the admin can mark
-- it as a video instead. Existing rows default to 'image' (their
-- current, unchanged behavior).
-- ============================================================

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS avatar_type text NOT NULL DEFAULT 'image'
  CHECK (avatar_type IN ('image', 'video'));

ALTER TABLE community_photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image', 'video'));

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS logo_type text NOT NULL DEFAULT 'image'
  CHECK (logo_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS favicon_type text NOT NULL DEFAULT 'image'
  CHECK (favicon_type IN ('image', 'video'));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_type text NOT NULL DEFAULT 'image'
  CHECK (image_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS hover_image_type text NOT NULL DEFAULT 'image'
  CHECK (hover_image_type IN ('image', 'video'));

ALTER TABLE influencer_picks
  ADD COLUMN IF NOT EXISTS thumbnail_type text NOT NULL DEFAULT 'image'
  CHECK (thumbnail_type IN ('image', 'video'));

-- products.gallery is already a flexible jsonb array of {url, layout} —
-- no column needed; each item gains an optional "type" key at the
-- application layer, defaulting to "image" when absent on old rows.
