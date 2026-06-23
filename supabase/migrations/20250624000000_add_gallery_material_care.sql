-- Add gallery (array of image URLs) and material_care to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gallery       jsonb    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS material_care text;
