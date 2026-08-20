-- ============================================================
-- Migration: track Meta's real approval status per template, and
-- schedule a daily pull from Meta so notification_templates stops
-- drifting from what's actually registered there. Editing body_text
-- locally never affected what Meta actually sends (Meta always uses
-- its own approved copy, matched by template_name) — meta_status
-- now makes that visible instead of implying local edits do anything.
-- ============================================================

ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS meta_status text;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-whatsapp-templates') THEN
    PERFORM cron.unschedule('sync-whatsapp-templates');
  END IF;
END $$;

-- NOTE: same as the other cron-driven functions — needs "Enforce JWT
-- Verification" turned OFF for sync-whatsapp-templates in the Dashboard.
SELECT cron.schedule(
  'sync-whatsapp-templates',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/sync-whatsapp-templates',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
