-- ============================================================
-- Migration: Auth, profiles, roles, and addresses
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- App role enum
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'staff', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- profiles — auto-created on signup via trigger
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  email      text,
  phone      text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure user_id column exists even if table was pre-created without it
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure unique constraint on user_id
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- user_roles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);

-- Helper function used by RLS policies
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- addresses
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text NOT NULL,
  line1      text NOT NULL,
  line2      text,
  city       text NOT NULL,
  state      text NOT NULL,
  pincode    text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);

-- Only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_single_default_address
    AFTER INSERT OR UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
