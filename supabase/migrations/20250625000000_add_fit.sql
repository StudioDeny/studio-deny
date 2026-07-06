-- Add fit field to products (slim-fit, regular-fit, relaxed-fit, oversized)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fit text;
