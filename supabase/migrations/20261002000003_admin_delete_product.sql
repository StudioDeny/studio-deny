-- ============================================================
-- Migration: permanent product delete from the website admin.
-- Refused (PRODUCT_SOLD:<n>) when the product appears on any POS bill or
-- online order, so bill and invoice history is never broken. Products
-- that were never sold (e.g. test products) are removed with everything
-- that points at them.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION admin_delete_product(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sold integer;
BEGIN
  IF NOT is_admin_or_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'product % not found', p_slug;
  END IF;

  SELECT (SELECT count(*) FROM order_items WHERE product_slug = p_slug)
       + (SELECT count(*) FROM pos_bill_items WHERE product_slug = p_slug)
       + (SELECT count(*) FROM orders o
          WHERE o.items @> jsonb_build_array(jsonb_build_object('slug', p_slug))
            AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_slug = p_slug))
  INTO v_sold;
  IF v_sold > 0 THEN
    RAISE EXCEPTION 'PRODUCT_SOLD:%', v_sold;
  END IF;

  -- Tables that reference the slug without a cascading foreign key.
  DELETE FROM wishlist_items WHERE product_slug = p_slug;
  DELETE FROM influencer_pick_products WHERE product_slug = p_slug;
  UPDATE lookbook_slides SET product_slug = NULL WHERE product_slug = p_slug;
  -- cart_items cascade from variants; product_categories, mega menu items,
  -- stock notifications and inventory logs cascade from products.
  DELETE FROM product_variants WHERE product_id = p_slug;
  DELETE FROM products WHERE slug = p_slug;
END $$;

REVOKE ALL ON FUNCTION admin_delete_product(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION admin_delete_product(text) TO authenticated;

COMMIT;
