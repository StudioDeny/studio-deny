-- ============================================================
-- Migration: CMS tables (announcements, sections, navigation,
--            FAQ, testimonials)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- announcement_bars
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_bars (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message    text NOT NULL,
  cta_label  text,
  cta_href   text,
  bg_color   text NOT NULL DEFAULT '#c8f135',
  text_color text NOT NULL DEFAULT '#0a0a0a',
  is_active  boolean NOT NULL DEFAULT true,
  position   integer NOT NULL DEFAULT 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcement_bars_active_idx ON announcement_bars (is_active, position);

-- ────────────────────────────────────────────────────────────
-- website_sections
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE section_type AS ENUM ('hero','marquee','new_arrivals','lookbook','testimonials','faq');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS website_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug    text NOT NULL DEFAULT 'home',
  section_type section_type NOT NULL,
  title        text NOT NULL,
  is_visible   boolean NOT NULL DEFAULT true,
  is_locked    boolean NOT NULL DEFAULT false,
  position     integer NOT NULL DEFAULT 0,
  config       jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_sections_page_idx ON website_sections (page_slug, position);

-- ────────────────────────────────────────────────────────────
-- navigation_menus
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE nav_location AS ENUM ('header','footer','mobile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS navigation_menus (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location   nav_location NOT NULL UNIQUE,
  items      jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_nav_updated_at
    BEFORE UPDATE ON navigation_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- faq_items
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE faq_category AS ENUM ('general','orders','shipping','returns','sizing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS faq_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  answer     text NOT NULL,
  category   faq_category NOT NULL DEFAULT 'general',
  is_active  boolean NOT NULL DEFAULT true,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_items_active_idx ON faq_items (is_active, position);

-- ────────────────────────────────────────────────────────────
-- testimonials
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  role       text,
  avatar     text,
  body       text NOT NULL,
  rating     smallint NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_active  boolean NOT NULL DEFAULT true,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_active_idx ON testimonials (is_active, position);

-- ────────────────────────────────────────────────────────────
-- content_versions — audit log for CMS changes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text NOT NULL,
  record_id    uuid NOT NULL,
  changed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot     jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_versions_record_idx ON content_versions (table_name, record_id);
