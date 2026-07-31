-- ============================================================
-- Migration: popup_promo — editable icons + static rule-row text
-- ============================================================

ALTER TABLE popup_promo
  ADD COLUMN IF NOT EXISTS rule_unlock_icon text NOT NULL DEFAULT 'Lock',
  ADD COLUMN IF NOT EXISTS rule_earn_icon   text NOT NULL DEFAULT 'Zap',
  ADD COLUMN IF NOT EXISTS rule_redeem_icon text NOT NULL DEFAULT 'Gift',
  ADD COLUMN IF NOT EXISTS rule_earn_value  text NOT NULL DEFAULT '1 PT',
  ADD COLUMN IF NOT EXISTS rule_unlock_sub  text NOT NULL DEFAULT 'single order';
