-- ============================================================
-- Migration: Row Level Security policies
-- All frontend queries use the anon key with RLS.
-- Service key (used only in API routes) bypasses RLS.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Helper: is current user an admin or staff?
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','staff')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own row" ON profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "profiles: admins read all" ON profiles
  FOR SELECT USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- user_roles
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles: read own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles: admins manage" ON user_roles
  FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- addresses
-- ────────────────────────────────────────────────────────────
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses: own rows" ON addresses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "addresses: admins read" ON addresses
  FOR SELECT USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- product_variants (public read, admin write)
-- ────────────────────────────────────────────────────────────
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants: public read" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "variants: admins write" ON product_variants
  FOR ALL USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- order_items
-- ────────────────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items: admins all" ON order_items
  FOR ALL USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- carts + cart_items
-- ────────────────────────────────────────────────────────────
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts: own" ON carts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "cart_items: own via cart" ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- wishlist_items
-- ────────────────────────────────────────────────────────────
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist: own rows" ON wishlist_items
  FOR ALL USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- loyalty_balances + loyalty_transactions
-- ────────────────────────────────────────────────────────────
ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_balances: read own" ON loyalty_balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "loyalty_balances: admins all" ON loyalty_balances
  FOR ALL USING (is_admin_or_staff());

CREATE POLICY "loyalty_transactions: read own" ON loyalty_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "loyalty_transactions: admins all" ON loyalty_transactions
  FOR ALL USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- CMS tables — public read, admin write
-- ────────────────────────────────────────────────────────────
ALTER TABLE announcement_bars       ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus        ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials            ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings            ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'announcement_bars','website_sections','navigation_menus','faq_items',
    'testimonials','media_assets','brand_settings','theme_settings','seo_settings'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "cms_%1$s_public_read" ON %1$s FOR SELECT USING (true)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "cms_%1$s_admin_write" ON %1$s FOR ALL USING (is_admin_or_staff())',
      t
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- settings tables — public read, admin write
-- ────────────────────────────────────────────────────────────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings: public read"  ON settings FOR SELECT USING (true);
CREATE POLICY "settings: admins write" ON settings FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- notification tables — admin only
-- ────────────────────────────────────────────────────────────
ALTER TABLE notification_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue              ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications             ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'notification_templates','notification_queue','whatsapp_logs',
    'marketing_campaigns','admin_notifications'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "notif_%1$s_admin" ON %1$s FOR ALL USING (is_admin_or_staff())',
      t
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- customer_notification_preferences
-- ────────────────────────────────────────────────────────────
ALTER TABLE customer_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cust_notif_pref: own" ON customer_notification_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "cust_notif_pref: admins read" ON customer_notification_preferences
  FOR SELECT USING (is_admin_or_staff());

-- ────────────────────────────────────────────────────────────
-- coupons — public read (anon can validate), admin write
-- ────────────────────────────────────────────────────────────
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons: public read"  ON coupons FOR SELECT USING (true);
CREATE POLICY "coupons: admins write" ON coupons FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- rate_limits — service key only (no anon access)
-- ────────────────────────────────────────────────────────────
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no anon/auth access; only service_role bypasses RLS

-- ────────────────────────────────────────────────────────────
-- abandoned_carts + content_versions — admin only
-- ────────────────────────────────────────────────────────────
ALTER TABLE abandoned_carts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abandoned_carts: admin"   ON abandoned_carts   FOR ALL USING (is_admin_or_staff());
CREATE POLICY "content_versions: admin"  ON content_versions  FOR ALL USING (is_admin_or_staff());
