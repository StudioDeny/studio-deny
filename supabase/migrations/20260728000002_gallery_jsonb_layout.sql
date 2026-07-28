ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_v2 jsonb NOT NULL DEFAULT '[]';

-- `gallery` is already stored as jsonb live (a JSON array of plain URL
-- strings), not a native Postgres array — unnest() doesn't apply to jsonb,
-- so this uses jsonb_array_elements_text() instead.
UPDATE products SET gallery_v2 = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', g, 'layout', 'standalone')), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE(gallery, '[]'::jsonb)) AS g
);

ALTER TABLE products DROP COLUMN gallery;
ALTER TABLE products RENAME COLUMN gallery_v2 TO gallery;
