-- ============================================================
-- Migration: hide store_exclusive products from anonymous/customer
-- reads at the RLS level, not just in frontend code.
--
-- Verified live before writing this (2026-09-16) via direct pg_policy
-- query against the production DB: the current products SELECT policy
-- is exactly `"products: public read" FOR SELECT USING (true)` — no
-- drift from what was assumed. This migration only replaces that one
-- policy; the existing write policy
-- ("products: write requires PRODUCTS permission") is untouched.
--
-- is_admin_or_staff() is already the universal read-gate on every
-- pos_* table (pos_bills, pos_staff, pos_settings, pos_customers,
-- pos_inventory_logs, pos_payment_transactions, pos_returns) — a
-- logged-in POS staff session already needs a user_roles row with
-- role IN ('admin','staff') just to use the POS app today, so this
-- change does not affect billing.studiodeny.com: staff continue to
-- see every product regardless of store_exclusive.
-- ============================================================

DROP POLICY IF EXISTS "products: public read" ON products;

CREATE POLICY "products: public read" ON products
  FOR SELECT USING (store_exclusive = false OR is_admin_or_staff());
