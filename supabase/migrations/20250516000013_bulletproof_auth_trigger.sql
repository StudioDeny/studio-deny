-- ================================================================
-- Migration: Bulletproof auth trigger + profiles/user_roles fix
-- Safe to re-run. Preserves all existing data.
-- ================================================================

-- Ensure all needed columns exist on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS name       text,
  ADD COLUMN IF NOT EXISTS email      text,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Backfill user_id for any existing rows created by the Supabase tutorial pattern
UPDATE public.profiles
  SET user_id = id
  WHERE user_id IS NULL
    AND id IN (SELECT id FROM auth.users);

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'customer'
               CHECK (role IN ('admin', 'staff', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_roles: read own"
    ON public.user_roles FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_roles: admins manage"
    ON public.user_roles FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bulletproof trigger function — never throws, so auth signup never returns 500
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  -- Try with explicit id=NEW.id first (handles Supabase tutorial schema where id=auth_uuid)
  BEGIN
    INSERT INTO public.profiles (id, user_id, name, email)
    VALUES (NEW.id, NEW.id, _name, NEW.email)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.profiles (user_id, name, email)
      VALUES (NEW.id, _name, NEW.email)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] profile insert failed uid=% err=%', NEW.id, SQLERRM;
    END;
  END;

  -- Default customer role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] role insert failed uid=% err=%', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX IF NOT EXISTS profiles_user_id_idx   ON public.profiles  (user_id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx  ON public.user_roles (user_id);
