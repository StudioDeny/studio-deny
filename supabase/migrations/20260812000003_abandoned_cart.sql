-- ============================================================
-- Migration: abandoned-cart infrastructure.
--
-- 1. Signup now also captures a phone number (src/routes/signup.tsx) —
--    populate profiles.phone from it, same as name/email already are.
-- 2. Stage-tracking columns on `carts` so the scan job knows which nudge
--    (1h/24h/48h) was last sent for a user's cart, and doesn't resend it.
-- 3. The abandoned_cart_1h/24h/48h templates, properly defined (SETUP.md
--    documented these but they may never have actually been seeded/run).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _name text;
  _phone text;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  _phone := NEW.raw_user_meta_data->>'phone';

  BEGIN
    INSERT INTO public.profiles (id, user_id, name, email, phone)
    VALUES (NEW.id, NEW.id, _name, NEW.email, _phone)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.profiles (user_id, name, email, phone)
      VALUES (NEW.id, _name, NEW.email, _phone)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] profile insert failed uid=% err=%', NEW.id, SQLERRM;
    END;
  END;

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

ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS last_abandoned_stage text CHECK (last_abandoned_stage IN ('1h', '24h', '48h')),
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('Abandoned Cart 1h', 'abandoned_cart_1h',
   'Hey {{1}}, you left something in your bag! Come finish checking out: {{2}}',
   ARRAY['customer_name','cart_url'], true),
  ('Abandoned Cart 24h', 'abandoned_cart_24h',
   'Still thinking it over, {{1}}? Your bag is still waiting for you: {{2}}',
   ARRAY['customer_name','cart_url'], true),
  ('Abandoned Cart 48h', 'abandoned_cart_48h',
   'Last call, {{1}} — your bag is about to expire. Grab it before it sells out: {{2}}',
   ARRAY['customer_name','cart_url'], true)
ON CONFLICT (template_name) DO UPDATE SET
  body_text = EXCLUDED.body_text,
  variables = EXCLUDED.variables,
  is_active = true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned-cart-scan') THEN
    PERFORM cron.unschedule('abandoned-cart-scan');
  END IF;
END $$;

-- NOTE: same as send-whatsapp-queue — needs "Enforce JWT Verification"
-- turned OFF for the abandoned-cart-scan function in the Dashboard.
SELECT cron.schedule(
  'abandoned-cart-scan',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/abandoned-cart-scan',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
