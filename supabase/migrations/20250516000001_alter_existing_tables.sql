-- ============================================================
-- Migration: Alter existing tables to add new columns
-- Wrapped in DO blocks so fresh databases skip gracefully.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- products
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE products
    ADD COLUMN IF NOT EXISTS id          uuid DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS brand_id    uuid REFERENCES brands(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS care        text,
    ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- orders
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10000001;

DO $$ BEGIN
  ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_number       text UNIQUE DEFAULT 'SD-' || lpad(nextval('order_number_seq')::text, 8, '0'),
    ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_method     text CHECK (payment_method IN ('RAZORPAY','COD')) DEFAULT 'RAZORPAY',
    ADD COLUMN IF NOT EXISTS payment_status     text CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED')) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS cod_advance_amount numeric(10,2),
    ADD COLUMN IF NOT EXISTS cod_advance_paid   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS razorpay_order_id  text,
    ADD COLUMN IF NOT EXISTS coupon_code        text,
    ADD COLUMN IF NOT EXISTS refund_status      text CHECK (refund_status IN ('NONE','REQUESTED','APPROVED','COMPLETED','REJECTED')) DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS refund_notes       text,
    ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- categories
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS parent_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- brands
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE brands
    ADD COLUMN IF NOT EXISTS id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS brand_id   uuid,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- settings (COD columns)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ADD COLUMN IF NOT EXISTS cod_advance_percent  integer NOT NULL DEFAULT 20 CHECK (cod_advance_percent BETWEEN 1 AND 100),
    ADD COLUMN IF NOT EXISTS cod_min_order        integer NOT NULL DEFAULT 500,
    ADD COLUMN IF NOT EXISTS cod_enabled          boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
       WHEN undefined_table    THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
       WHEN undefined_table    THEN NULL; END $$;
