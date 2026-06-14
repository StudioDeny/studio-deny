-- ============================================================
-- Migration: WhatsApp / notification infrastructure
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- notification_templates — Meta WA Business message templates
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  template_name text NOT NULL UNIQUE,  -- exact name registered with Meta
  body_text     text NOT NULL,
  variables     text[] NOT NULL DEFAULT '{}',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- notification_queue — outbound WA messages pending send
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notif_status AS ENUM ('pending','sent','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notification_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  recipient_phone  text NOT NULL,
  order_id         text,
  variables        jsonb NOT NULL DEFAULT '{}',
  status           notif_status NOT NULL DEFAULT 'pending',
  error_message    text,
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_queue_status_idx ON notification_queue (status);
CREATE INDEX IF NOT EXISTS notif_queue_order_id_idx ON notification_queue (order_id) WHERE order_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- whatsapp_logs — delivery receipts from Meta webhook
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE wa_log_status AS ENUM ('sent','delivered','read','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id        uuid REFERENCES notification_queue(id) ON DELETE SET NULL,
  order_id        text,
  recipient_phone text NOT NULL,
  message_id      text,  -- Meta message ID
  status          wa_log_status NOT NULL DEFAULT 'sent',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_logs_order_id_idx ON whatsapp_logs (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_logs_created_idx  ON whatsapp_logs (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- marketing_campaigns — bulk WA sends
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft','scheduled','running','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  template_id     uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  target_segment  text,
  scheduled_at    timestamptz,
  status          campaign_status NOT NULL DEFAULT 'draft',
  sent_count      integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- admin_notifications — in-app bell notifications
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL,      -- 'new_order', 'low_stock', 'refund_request', etc.
  title      text NOT NULL,
  body       text,
  is_read    boolean NOT NULL DEFAULT false,
  ref_id     text,               -- order ID, product slug, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifs_unread_idx ON admin_notifications (is_read, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- customer_notification_preferences
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wa_order_updates    boolean NOT NULL DEFAULT true,
  wa_promotions       boolean NOT NULL DEFAULT false,
  wa_abandoned_cart   boolean NOT NULL DEFAULT true,
  email_order_updates boolean NOT NULL DEFAULT true,
  email_promotions    boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_cust_notif_pref_updated_at
    BEFORE UPDATE ON customer_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
