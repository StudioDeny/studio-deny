-- ============================================================
-- Migration: on/off switch for the loyalty program.
--
-- Off = no tier discount at checkout (customer_loyalty_discount() returns
-- 0, so quote_order(), the paid-quote check and the order INSERT policy
-- all agree) and the account page hides the loyalty section.
-- Same function as 20260812000009 plus the enabled check.
-- ============================================================

ALTER TABLE loyalty_settings
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION customer_loyalty_discount(customer_id uuid, order_subtotal numeric)
RETURNS numeric AS $$
DECLARE
  ls RECORD;
  is_member boolean;
  points numeric;
  tier text;
  pct numeric;
BEGIN
  SELECT enabled, entry_threshold, rupees_per_earned_point, discount INTO ls FROM loyalty_settings LIMIT 1;
  IF ls IS NULL OR NOT ls.enabled THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE user_id = customer_id
      AND status NOT IN ('CANCELLED', 'REFUNDED')
      AND total >= ls.entry_threshold
  ) INTO is_member;

  IF NOT is_member THEN
    RETURN round(order_subtotal * (ls.discount->>'ROOKIE')::numeric / 100);
  END IF;

  SELECT floor(COALESCE(SUM(total), 0) / ls.rupees_per_earned_point) INTO points
  FROM orders
  WHERE user_id = customer_id AND status NOT IN ('CANCELLED', 'REFUNDED');

  tier := CASE
    WHEN points >= 8000 THEN 'LEGEND'
    WHEN points >= 3000 THEN 'RIOT'
    WHEN points >= 1000 THEN 'RUNNER'
    ELSE 'ROOKIE'
  END;

  pct := (ls.discount->>tier)::numeric;
  RETURN round(order_subtotal * pct / 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
