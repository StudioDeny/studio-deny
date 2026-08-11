-- ============================================================
-- Migration: lookbook_slides — link to exactly one real product instead
-- of a free-text caption + arbitrary link. Plain text column (no hard FK),
-- matching the sibling influencer_pick_products convention in the same
-- original migration file — integrity enforced by the admin product
-- picker, not the database.
-- ============================================================

ALTER TABLE lookbook_slides
  ADD COLUMN IF NOT EXISTS product_slug text;
