-- ============================================================
-- Migration: two real fixes.
--
-- 1. `brands` — src/lib/catalog.ts's own comment says brands are
--    "still localStorage-backed," yet products.brand_id (added by
--    20250516000001) references a `brands` table that has never
--    actually been created anywhere. That ALTER almost certainly
--    no-op'd anyway (it ran before `categories` existed either, in
--    the same atomic statement — see 20260719000001's own comment),
--    so brand_id doesn't exist live. This creates the real table,
--    matching the categories pattern exactly, so brands finally sync
--    across browsers/admins instead of being per-device localStorage.
--
-- 2. `invoice_settings` — the admin's Invoice Template page and the
--    customer-facing invoice page both read/wrote the SAME
--    localStorage key (sd_settings_v1.invoice). Since localStorage is
--    per-browser, a customer viewing their own invoice on their own
--    device was reading their OWN blank localStorage (falling back to
--    hardcoded defaults), never the admin's actual configured brand
--    name/GSTIN/tagline/etc. — real invoices never reflected the
--    store's real configuration except when the admin viewed one on
--    their own browser. Moves this to a real Supabase singleton row,
--    matching brand_settings/theme_settings/popup_promo.
-- ============================================================

CREATE TABLE IF NOT EXISTS brands (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read active brands" ON brands
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage brands" ON brands
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO brands (name, slug) VALUES ('Studio Deny', 'studio-deny')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS invoice_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL DEFAULT 'STUDIO DENY',
  tagline    text NOT NULL DEFAULT 'STREETWEAR · MUMBAI · INDIA',
  gstin      text NOT NULL DEFAULT '27ABCDE1234F1Z5',
  email      text NOT NULL DEFAULT 'support@studiodeny.in',
  phone      text NOT NULL DEFAULT '+91 98765 43210',
  address    text NOT NULL DEFAULT 'Studio Deny HQ, Kala Ghoda, Mumbai 400001, India',
  accent     text NOT NULL DEFAULT '#0a0a0a',
  terms      text NOT NULL DEFAULT 'All sales final after 7 days. Returns accepted within 7 days of delivery in unworn condition with tags attached. Subject to Mumbai jurisdiction.',
  footer     text NOT NULL DEFAULT 'THANK YOU FOR REPPING STUDIO DENY',
  signatory  text NOT NULL DEFAULT 'Studio Deny',
  tax_label  text NOT NULL DEFAULT 'TAX INVOICE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_invoice_settings_updated_at
    BEFORE UPDATE ON invoice_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO invoice_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM invoice_settings);

ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "invoice_settings: public read" ON invoice_settings
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "invoice_settings: admins write" ON invoice_settings
    FOR ALL USING (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
