ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'image';

CREATE INDEX IF NOT EXISTS media_assets_resource_type_idx ON media_assets (resource_type);
