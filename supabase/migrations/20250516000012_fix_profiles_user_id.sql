-- ============================================================
-- Migration: Fix profiles table for production
-- Adds user_id column if pre-existing table lacked it,
-- then ensures trigger is correctly wired.
-- ============================================================

-- Add user_id column if it doesn't already exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint idempotently
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);

-- Recreate trigger function (idempotent — OR REPLACE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Drop and recreate trigger to guarantee it's pointing at the right function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
