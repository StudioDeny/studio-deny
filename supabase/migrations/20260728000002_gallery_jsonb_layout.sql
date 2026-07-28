ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_v2 jsonb NOT NULL DEFAULT '[]';

UPDATE products SET gallery_v2 = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', g, 'layout', 'standalone')), '[]'::jsonb)
  FROM unnest(gallery) AS g
);

ALTER TABLE products DROP COLUMN gallery;
ALTER TABLE products RENAME COLUMN gallery_v2 TO gallery;
