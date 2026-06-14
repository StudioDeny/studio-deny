-- ============================================================
-- Migration: Loyalty system (balances + transaction history)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- loyalty_balances — current points + tier per user
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE loyalty_tier AS ENUM ('ROOKIE','RUNNER','RIOT','LEGEND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS loyalty_balances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points          integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_spent  numeric(12,2) NOT NULL DEFAULT 0,
  tier            loyalty_tier NOT NULL DEFAULT 'ROOKIE',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_balances_user_id_idx ON loyalty_balances (user_id);

DO $$ BEGIN
  CREATE TRIGGER trg_loyalty_balances_updated_at
    BEFORE UPDATE ON loyalty_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-calculate tier from lifetime_spent
CREATE OR REPLACE FUNCTION recalc_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.lifetime_spent >= 25000 THEN 'LEGEND'::loyalty_tier
    WHEN NEW.lifetime_spent >= 10000 THEN 'RIOT'::loyalty_tier
    WHEN NEW.lifetime_spent >= 2500  THEN 'RUNNER'::loyalty_tier
    ELSE 'ROOKIE'::loyalty_tier
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_recalc_tier
    BEFORE INSERT OR UPDATE OF lifetime_spent ON loyalty_balances
    FOR EACH ROW EXECUTE FUNCTION recalc_loyalty_tier();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- loyalty_transactions — full earn/redeem/adjust history
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE loyalty_tx_type AS ENUM ('earn','redeem','adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id   text,  -- references orders.id (text pk)
  type       loyalty_tx_type NOT NULL,
  points     integer NOT NULL,  -- positive = earn, negative = redeem/adjust
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_tx_user_id_idx ON loyalty_transactions (user_id);
CREATE INDEX IF NOT EXISTS loyalty_tx_order_id_idx ON loyalty_transactions (order_id) WHERE order_id IS NOT NULL;

-- When a loyalty_transaction is inserted, update the balance atomically
CREATE OR REPLACE FUNCTION apply_loyalty_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO loyalty_balances (user_id, points)
  VALUES (NEW.user_id, GREATEST(0, NEW.points))
  ON CONFLICT (user_id) DO UPDATE
    SET points = GREATEST(0, loyalty_balances.points + NEW.points),
        lifetime_spent = CASE
          WHEN NEW.type = 'earn' THEN loyalty_balances.lifetime_spent + (NEW.points::numeric / 10 * 100)
          ELSE loyalty_balances.lifetime_spent
        END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_apply_loyalty_tx
    AFTER INSERT ON loyalty_transactions
    FOR EACH ROW EXECUTE FUNCTION apply_loyalty_transaction();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
