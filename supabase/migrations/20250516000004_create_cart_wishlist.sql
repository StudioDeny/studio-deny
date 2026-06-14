-- ============================================================
-- Migration: Cart and Wishlist (DB-persisted)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- carts — one cart per user
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carts_user_id_idx ON carts (user_id);

DO $$ BEGIN
  CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- cart_items
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  qty        integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items (cart_id);

-- ────────────────────────────────────────────────────────────
-- wishlist_items — replaces localStorage sd_wish
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON wishlist_items (user_id);

-- ────────────────────────────────────────────────────────────
-- abandoned_carts — for re-engagement tracking
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id       text,
  cart_snapshot    jsonb NOT NULL DEFAULT '[]',
  total_value      numeric(10,2),
  recovery_sent_at timestamptz,
  recovered_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
