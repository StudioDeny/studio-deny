-- ============================================================
-- Migration: Product variants and order line items
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- product_variants — replaces flat sizes[] + single stock
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    text NOT NULL,  -- references product slug (existing schema uses text PKs)
  size          text,
  color         text,
  color_hex     text,
  stock         integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_price numeric(10,2),
  sku           text UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_variants_sku_idx ON product_variants (sku) WHERE sku IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- order_items — normalised line items (supplements items JSONB)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     text NOT NULL,   -- FK to orders.id (text in existing schema)
  variant_id   uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  size         text,
  color        text,
  qty          integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price   numeric(10,2) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON order_items (variant_id) WHERE variant_id IS NOT NULL;
