-- ============================================================
-- Migration: store_exclusive flag on products.
--
-- Marks a product as sold in-person only at the physical store,
-- never visible/purchasable on studiodeny.com. The POS app
-- (billing.studiodeny.com, separate repo) is unaffected by this
-- migration — it reads/writes products under a staff-authenticated
-- session, which the accompanying RLS policy update (applied
-- separately, pending live-policy verification) exempts via
-- is_admin_or_staff(). This migration only adds the column; it does
-- not touch any RLS policy.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_exclusive boolean NOT NULL DEFAULT false;
