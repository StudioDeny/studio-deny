-- ============================================================
-- Migration: product_variants is the single stock source.
-- One variant row per colour x size. products.stock / products.sizes
-- become derived values so legacy readers (SEO, storefront fallbacks,
-- analytics) stay correct without edits. The POS and the website both
-- read and write variant rows only.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION recompute_product_stock(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_slug) THEN
    UPDATE products SET stock = 0 WHERE slug = p_slug AND stock <> 0;
    RETURN;
  END IF;
  UPDATE products p
  SET stock = (SELECT coalesce(sum(v.stock), 0) FROM product_variants v WHERE v.product_id = p_slug),
      sizes = coalesce((
        SELECT array_agg(s.size ORDER BY s.pos, s.size)
        FROM (
          SELECT v.size, min(coalesce(sz.position, 9999)) AS pos
          FROM product_variants v
          LEFT JOIN sizes sz ON sz.label = v.size AND sz.category_id = p.category_id
          WHERE v.product_id = p_slug AND v.size IS NOT NULL
          GROUP BY v.size
        ) s
      ), '{}')
  WHERE p.slug = p_slug;
END $$;

CREATE OR REPLACE FUNCTION trg_variants_sync_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recompute_product_stock(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id) THEN
    PERFORM recompute_product_stock(OLD.product_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS variants_sync_product ON product_variants;
CREATE TRIGGER variants_sync_product
  AFTER INSERT OR DELETE OR UPDATE OF stock, size, product_id ON product_variants
  FOR EACH ROW EXECUTE FUNCTION trg_variants_sync_product();

-- Variants that use the product price (price equal to the old product
-- price) follow product price changes, whether made in the website admin
-- or the POS. Colours with their own custom price keep it.
CREATE OR REPLACE FUNCTION trg_products_sync_variant_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    UPDATE product_variants SET price = NEW.price
    WHERE product_id = NEW.slug AND price = OLD.price;
  END IF;
  IF NEW.compare_at IS DISTINCT FROM OLD.compare_at THEN
    UPDATE product_variants SET compare_price = NEW.compare_at
    WHERE product_id = NEW.slug AND compare_price IS NOT DISTINCT FROM OLD.compare_at;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS products_sync_variant_price ON products;
CREATE TRIGGER products_sync_variant_price
  AFTER UPDATE OF price, compare_at ON products
  FOR EACH ROW EXECUTE FUNCTION trg_products_sync_variant_price();

-- Backfill: size-less products with no variants get one exact ONE SIZE
-- row carrying their current stock. Products that list sizes but have no
-- variants are left alone - the admin is asked for per-size counts
-- ("NEEDS SIZE COUNTS"); nothing is split or guessed.
INSERT INTO product_variants (product_id, size, color, color_hex, stock, price, compare_price)
SELECT p.slug, 'ONE SIZE', NULL, NULL, greatest(coalesce(p.stock, 0), 0), p.price, p.compare_at
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.slug)
  AND (p.sizes IS NULL OR cardinality(p.sizes) = 0);

-- Products that already had variants: realign the derived columns once.
SELECT recompute_product_stock(p.slug)
FROM products p
WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.slug);

COMMIT;
