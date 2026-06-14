-- ============================================================
-- Migration: Coupons, rate limits, and app settings singleton
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- coupons — table exists, UI not wired (per spec)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  discount_type  text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order      numeric(10,2),
  max_uses       integer,
  used_count     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupons_code_idx ON coupons (lower(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons (is_active);

-- ────────────────────────────────────────────────────────────
-- rate_limits — API endpoint abuse protection
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text NOT NULL,        -- e.g. "ip:1.2.3.4:checkout"
  count      integer NOT NULL DEFAULT 1,
  window_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, window_end)
);

CREATE INDEX IF NOT EXISTS rate_limits_key_window_idx ON rate_limits (key, window_end);

-- Clean up expired rate limit rows automatically (via periodic vacuum)
CREATE OR REPLACE FUNCTION purge_expired_rate_limits()
RETURNS void AS $$
  DELETE FROM rate_limits WHERE window_end < now();
$$ LANGUAGE sql;

-- ────────────────────────────────────────────────────────────
-- Ensure settings table has a single default row
-- ────────────────────────────────────────────────────────────
INSERT INTO settings (cod_enabled, cod_advance_percent, cod_min_order)
VALUES (false, 20, 500)
ON CONFLICT DO NOTHING;

-- Ensure brand_settings has a single default row
INSERT INTO brand_settings (site_name)
VALUES ('STUDIO/DENY')
ON CONFLICT DO NOTHING;

-- Ensure theme_settings has a single default row
INSERT INTO theme_settings (accent_color)
VALUES ('#c8f135')
ON CONFLICT DO NOTHING;
