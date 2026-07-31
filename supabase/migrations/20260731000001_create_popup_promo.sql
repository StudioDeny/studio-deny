-- ============================================================
-- Migration: Homepage loyalty popup — fully admin-editable (singleton row)
-- ============================================================

CREATE TABLE IF NOT EXISTS popup_promo (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled             boolean NOT NULL DEFAULT true,
  delay_seconds       integer NOT NULL DEFAULT 15,
  bg_type             text NOT NULL DEFAULT 'none' CHECK (bg_type IN ('none', 'image', 'video')),
  bg_image_url        text,
  bg_video_url        text,
  logo_url            text,
  badge_text          text NOT NULL DEFAULT 'DENY WORLD',
  headline_line1      text NOT NULL DEFAULT 'EARN WHILE',
  headline_line2      text NOT NULL DEFAULT 'YOU DROP.',
  body_text           text NOT NULL DEFAULT 'Join Deny World — our private loyalty pool. One qualifying order unlocks you. After that, every rupee earns.',
  rule_unlock_label   text NOT NULL DEFAULT 'UNLOCK',
  rule_earn_label     text NOT NULL DEFAULT 'EARN',
  rule_redeem_label   text NOT NULL DEFAULT 'REDEEM',
  tier_1_label        text NOT NULL DEFAULT 'ROOKIE',
  tier_2_label        text NOT NULL DEFAULT 'RUNNER',
  tier_3_label        text NOT NULL DEFAULT 'RIOT',
  tier_4_label        text NOT NULL DEFAULT 'LEGEND',
  cta_primary_text    text NOT NULL DEFAULT 'LEARN MORE',
  cta_primary_href    text NOT NULL DEFAULT '/rewards',
  cta_secondary_text  text NOT NULL DEFAULT 'LATER',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_popup_promo_updated_at
    BEFORE UPDATE ON popup_promo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO popup_promo (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM popup_promo);

ALTER TABLE popup_promo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "popup_promo: public read" ON popup_promo
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "popup_promo: admins write" ON popup_promo
    FOR ALL USING (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
