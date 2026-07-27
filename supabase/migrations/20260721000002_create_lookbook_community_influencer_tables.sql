-- ============================================================
-- Migration: dedicated Supabase tables for Lookbook slides,
-- Worn By Community photos, and Influencer Picks (+ tagged products).
-- These sections were localStorage-only (src/lib/homeSections.ts,
-- key sd_home_sections_v1) — moving them to real tables so content
-- survives across devices/browsers and admins can manage them properly.
-- Follows the exact id/is_active/position/created_at + RLS convention
-- from 20250516000005_create_cms_tables.sql + 20250516000010_rls_policies.sql.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- lookbook_slides
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lookbook_slides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url  text NOT NULL,
  caption    text,
  link_href  text,
  is_active  boolean NOT NULL DEFAULT true,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lookbook_slides_active_idx ON lookbook_slides (is_active, position);

-- ────────────────────────────────────────────────────────────
-- community_photos (bento grid — admin-curated, no click-through)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE bento_size AS ENUM ('sm', 'md', 'lg', 'wide', 'tall');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS community_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url  text NOT NULL,
  handle     text,
  bento_size bento_size NOT NULL DEFAULT 'md',
  is_active  boolean NOT NULL DEFAULT true,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_photos_active_idx ON community_photos (is_active, position);

-- ────────────────────────────────────────────────────────────
-- influencer_picks — video source is either an uploaded file
-- (Cloudinary video_url, hover-autoplay in the grid) or a pasted
-- reel link (link_url, opens the source post/embed on click instead).
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE influencer_video_source AS ENUM ('upload', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS influencer_picks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  handle       text,
  video_source influencer_video_source NOT NULL DEFAULT 'upload',
  video_url    text,
  link_url     text,
  thumbnail_url text,
  quote        text,
  is_active    boolean NOT NULL DEFAULT true,
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_picks_source_data CHECK (
    (video_source = 'upload' AND video_url IS NOT NULL) OR
    (video_source = 'link' AND link_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS influencer_picks_active_idx ON influencer_picks (is_active, position);

-- Join table: which catalog products are tagged on a given influencer
-- pick. References products by slug (the natural key already used
-- everywhere in this app — products has no uuid id column live today).
-- Intentionally a plain text column with no FK constraint, matching
-- wishlist_items.product_slug (20250516000004_create_cart_wishlist.sql)
-- — products.slug isn't confirmed to have a live unique constraint,
-- so a hard FK here risks the migration failing outright; integrity is
-- enforced at the app layer (admin product picker) instead, same as
-- wishlist already does.
CREATE TABLE IF NOT EXISTS influencer_pick_products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_pick_id uuid NOT NULL REFERENCES influencer_picks(id) ON DELETE CASCADE,
  product_slug       text NOT NULL,
  position           integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (influencer_pick_id, product_slug)
);

CREATE INDEX IF NOT EXISTS influencer_pick_products_pick_idx ON influencer_pick_products (influencer_pick_id, position);

-- ────────────────────────────────────────────────────────────
-- RLS — public read, admin/staff write (same pattern as other CMS tables)
-- ────────────────────────────────────────────────────────────
ALTER TABLE lookbook_slides          ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_picks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_pick_products ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lookbook_slides', 'community_photos', 'influencer_picks', 'influencer_pick_products'
  ] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "cms_%1$s_public_read" ON %1$s FOR SELECT USING (true)',
        t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY "cms_%1$s_admin_write" ON %1$s FOR ALL USING (is_admin_or_staff())',
        t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;
