-- ============================================================
-- Migration: add 3 new website_sections section types for the
-- homepage rebuild — follows the exact pattern already proven live
-- in 20250519000000_add_new_section_types.sql (why_us/instagram_feed/
-- newsletter), which the frontend already knows how to consume via
-- src/routes/admin.website-sections.tsx's per-type config editor.
--
-- gender_split      — the Men/Women full-bleed split cards section.
-- category_carousel — the full-screen themed-collection carousel
--                      (replaces the old standalone Best Sellers grid;
--                      "Best Sellers" now only lives here as a slide,
--                      plus as a per-product badge — see
--                      20260721000001_add_product_best_seller.sql).
-- denyspace          — replaces the hardcoded "Loyalty Has Its
--                      Rewards" section with an admin-editable
--                      logo/description/4-benefit-icons/single-CTA
--                      layout. The underlying point-earning numbers
--                      (entry threshold, rupees-per-point, etc.) are
--                      untouched and stay in src/lib/settings.ts.
--
-- IMPORTANT — run this file ALONE first, then run
-- 20260721000004_seed_gender_split_category_carousel_denyspace_sections.sql
-- as a SEPARATE query execution. Postgres will not let a brand-new enum
-- value be compared/used (e.g. in a WHERE clause) in the same transaction
-- it was added in ("unsafe use of new value ... of enum type"), and the
-- Supabase SQL Editor runs a whole pasted script as one transaction. The
-- ALTER TYPE has to actually commit before the seed INSERTs can reference
-- the new values.
-- ============================================================

ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'gender_split';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'category_carousel';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'denyspace';
