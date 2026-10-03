-- ============================================================
-- Migration: old stock rows saved without a colour get one, so every
-- variant the POS sells, receipts print and the admin edits has a colour.
--   * product lists colours -> its first colour
--   * product lists none    -> "White" (#FFFFFF), also added to products.colors
-- A row is skipped if the product already has a row with that colour and
-- size (no duplicates are created). Run after 20261002000001.
-- ============================================================
BEGIN;

WITH target AS (
  SELECT
    v.id,
    v.product_id,
    v.size,
    coalesce(nullif(btrim(to_jsonb(p.colors) -> 0 ->> 'name'), ''), 'White') AS colour,
    coalesce(nullif(btrim(to_jsonb(p.colors) -> 0 ->> 'hex'), ''), '#FFFFFF') AS hex
  FROM product_variants v
  JOIN products p ON p.slug = v.product_id
  WHERE v.color IS NULL OR btrim(v.color) = ''
)
UPDATE product_variants v
SET color = t.colour,
    color_hex = t.hex
FROM target t
WHERE v.id = t.id
  AND NOT EXISTS (
    SELECT 1 FROM product_variants o
    WHERE o.product_id = t.product_id
      AND o.id <> t.id
      AND lower(btrim(o.color)) = lower(t.colour)
      AND o.size IS NOT DISTINCT FROM t.size
  );

-- Products that had no colours and now carry White stock: list White so
-- the storefront swatch and the admin colour card match the stock rows.
UPDATE products p
SET colors = '[{"name": "White", "hex": "#FFFFFF"}]'
WHERE coalesce(jsonb_array_length(to_jsonb(p.colors)), 0) = 0
  AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.slug AND v.color = 'White');

COMMIT;
