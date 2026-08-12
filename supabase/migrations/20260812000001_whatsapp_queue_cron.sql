-- ============================================================
-- Migration: schedule send-whatsapp to actually flush the
-- notification_queue every 5 minutes (nothing was triggering it
-- before this — the 3 working triggers, order_shipped/
-- order_delivered/return_requested, just piled up as "pending"
-- rows with nothing ever picking them up), and add the missing
-- return_requested template row (queued by shiprocket-return but
-- never defined here).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-whatsapp-queue') THEN
    PERFORM cron.unschedule('send-whatsapp-queue');
  END IF;
END $$;

-- NOTE: this only works once "Enforce JWT Verification" is turned OFF for
-- the send-whatsapp function in the Supabase Dashboard (Edge Functions →
-- send-whatsapp) — pg_net's plain POST here carries no Supabase auth token.
SELECT cron.schedule(
  'send-whatsapp-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/send-whatsapp',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('Return Requested',
   'return_requested',
   'Your return for order {{1}} has been picked up. Track it here: {{2}}',
   ARRAY['order_number','tracking_url'],
   true)
ON CONFLICT (template_name) DO NOTHING;
