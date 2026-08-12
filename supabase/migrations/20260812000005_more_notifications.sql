-- ============================================================
-- Migration: welcome_new_user, back_in_stock, low_stock_alert
-- (admin-facing), and loyalty_tier_upgrade.
--
-- Also activates loyalty_transactions for the first time ever —
-- confirmed via grep that NOTHING in the app has ever inserted a
-- row there, so loyalty_balances.tier has never actually changed
-- for a real customer. This finally feeds it (one 'earn' row per
-- DELIVERED order), so the tier-upgrade trigger below has something
-- real to react to. The customer-facing rewards page still computes
-- its own points/tier client-side from order history at a different
-- rate — that mismatch is pre-existing and NOT resolved here, only
-- the DB side is being made real.
-- ============================================================

INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('Welcome New User', 'welcome_new_user',
   'Welcome to Studio Deny, {{1}}! Start exploring the drop: {{2}}',
   ARRAY['customer_name','shop_url'], true),
  ('Back In Stock', 'back_in_stock',
   'Good news {{1}} — {{2}} is back in stock! Grab it before it sells out again: {{3}}',
   ARRAY['customer_name','product_name','product_url'], true),
  ('Low Stock Alert', 'low_stock_alert',
   'Heads up — {{1}} is down to {{2}} unit(s) left. Restock soon: {{3}}',
   ARRAY['product_name','qty','product_url'], true),
  ('Loyalty Tier Upgrade', 'loyalty_tier_upgrade',
   'Congrats {{1}}! You''ve been upgraded to {{2}} tier. See your new perks: {{3}}',
   ARRAY['customer_name','tier_name','perks_url'], true),
  ('Abandoned Cart Final', 'abandoned_cart_final',
   'Last chance, {{1}} — your bag expires soon. Don''t miss out: {{2}}',
   ARRAY['customer_name','cart_url'], true)
ON CONFLICT (template_name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- welcome_new_user — extend the existing signup trigger
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _name text;
  _phone text;
  _template_id uuid;
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

  IF _phone IS NOT NULL AND _phone <> '' THEN
    BEGIN
      SELECT id INTO _template_id FROM public.notification_templates WHERE template_name = 'welcome_new_user' AND is_active = true;
      IF _template_id IS NOT NULL THEN
        INSERT INTO public.notification_queue (template_id, recipient_phone, order_id, variables)
        VALUES (_template_id, _phone, NULL, jsonb_build_object('customer_name', _name, 'shop_url', 'https://studiodeny.com/shop'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] welcome notification failed uid=% err=%', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- back_in_stock — customer opts in per product while it's sold out
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_notify_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

ALTER TABLE stock_notify_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "stock_notify_requests: own" ON stock_notify_requests
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- low_stock_alert — goes to the store's own number, not a customer
-- ────────────────────────────────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_whatsapp_phone text;

-- ────────────────────────────────────────────────────────────
-- Both back_in_stock and low_stock_alert hook into the same place:
-- whenever admin edits a variant's stock (admin.products.new.tsx).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION queue_stock_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id uuid;
  v_product record;
  v_admin_phone text;
  req record;
  v_profile record;
BEGIN
  SELECT name, image INTO v_product FROM products WHERE slug = NEW.product_id;

  -- Back in stock: this variant just went from 0 to available.
  IF OLD.stock = 0 AND NEW.stock > 0 THEN
    SELECT id INTO v_template_id FROM notification_templates WHERE template_name = 'back_in_stock' AND is_active = true;
    IF v_template_id IS NOT NULL THEN
      FOR req IN SELECT * FROM stock_notify_requests WHERE product_slug = NEW.product_id LOOP
        SELECT phone, name INTO v_profile FROM profiles WHERE user_id = req.user_id;
        IF v_profile.phone IS NOT NULL AND v_profile.phone <> '' THEN
          INSERT INTO notification_queue (template_id, recipient_phone, order_id, variables)
          VALUES (v_template_id, v_profile.phone, NULL, jsonb_build_object(
            'customer_name', COALESCE(v_profile.name, 'there'),
            'product_name', v_product.name,
            'product_url', 'https://studiodeny.com/product/' || NEW.product_id
          ));
        END IF;
      END LOOP;
      DELETE FROM stock_notify_requests WHERE product_slug = NEW.product_id;
    END IF;
  END IF;

  -- Low stock: crossed down past the threshold — ping the store, not a customer.
  IF NEW.stock <= 3 AND NEW.stock < OLD.stock AND OLD.stock > 3 THEN
    SELECT admin_whatsapp_phone INTO v_admin_phone FROM settings LIMIT 1;
    IF v_admin_phone IS NOT NULL AND v_admin_phone <> '' THEN
      SELECT id INTO v_template_id FROM notification_templates WHERE template_name = 'low_stock_alert' AND is_active = true;
      IF v_template_id IS NOT NULL THEN
        INSERT INTO notification_queue (template_id, recipient_phone, order_id, variables)
        VALUES (v_template_id, v_admin_phone, NULL, jsonb_build_object(
          'product_name', v_product.name || COALESCE(' (' || NEW.size || ')', ''),
          'qty', NEW.stock::text,
          'product_url', 'https://studiodeny.com/product/' || NEW.product_id
        ));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_variant_stock_notify ON product_variants;
CREATE TRIGGER trg_variant_stock_notify
  AFTER UPDATE OF stock ON product_variants
  FOR EACH ROW EXECUTE FUNCTION queue_stock_notifications();

-- ────────────────────────────────────────────────────────────
-- loyalty_tier_upgrade — first, actually feed loyalty_transactions
-- (a DELIVERED order earns points), which is the only way tier can
-- ever change; then notify on the transition.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION queue_order_lifecycle_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id uuid;
  v_template_name text;
  v_variables jsonb;
  v_phone text := NEW.address->>'phone';
  v_name text := COALESCE(NEW.address->>'name', 'there');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_method = 'razorpay' THEN
      v_template_name := 'payment_success';
      v_variables := jsonb_build_object('customer_name', v_name, 'total', NEW.total::text, 'order_number', NEW.order_number);
    ELSIF NEW.payment_method = 'cod' AND NEW.cod_advance_paid THEN
      v_template_name := 'cod_advance_payment';
      v_variables := jsonb_build_object('customer_name', v_name, 'order_number', NEW.order_number, 'advance_amount', NEW.cod_advance_amount::text);
    ELSE
      v_template_name := 'order_placed';
      v_variables := jsonb_build_object('customer_name', v_name, 'order_number', NEW.order_number, 'total', NEW.total::text);
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'PACKED' AND OLD.status = 'PLACED' THEN
      v_template_name := 'order_confirmed';
      v_variables := jsonb_build_object('customer_name', v_name, 'order_number', NEW.order_number, 'total', NEW.total::text);

    ELSIF NEW.status = 'SHIPPED' AND NEW.awb_number IS NULL THEN
      IF NEW.shipped_at IS NULL THEN NEW.shipped_at := now(); END IF;
      v_template_name := 'order_shipped';
      v_variables := jsonb_build_object('order_number', NEW.order_number, 'tracking_url', 'https://studiodeny.com/order/' || NEW.id);

    ELSIF NEW.status = 'DELIVERED' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
      v_template_name := 'order_delivered';
      v_variables := jsonb_build_object('order_number', NEW.order_number, 'review_url', 'https://studiodeny.com/order/' || NEW.id);

      -- Loyalty was never actually earning anything (nothing had ever
      -- inserted into loyalty_transactions) — this is the first real feed,
      -- at ₹10 spent = 1 point, matching apply_loyalty_transaction()'s
      -- existing (previously unused) conversion back to lifetime_spent.
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO loyalty_transactions (user_id, order_id, type, points, note)
        VALUES (NEW.user_id, NEW.id, 'earn', GREATEST(0, FLOOR(NEW.total / 10))::int, 'Order ' || NEW.order_number);
      END IF;

    ELSIF NEW.status = 'CANCELLED' THEN
      v_template_name := 'order_cancelled';
      v_variables := jsonb_build_object('customer_name', v_name, 'order_number', NEW.order_number);

    ELSIF NEW.status = 'REFUNDED' THEN
      v_template_name := 'refund_approved';
      v_variables := jsonb_build_object('customer_name', v_name, 'amount', COALESCE(NEW.refund_amount, NEW.total)::text, 'order_number', NEW.order_number);
    END IF;
  END IF;

  IF v_template_name IS NOT NULL AND v_phone IS NOT NULL AND v_phone <> '' THEN
    SELECT id INTO v_template_id FROM notification_templates WHERE template_name = v_template_name AND is_active = true;
    IF v_template_id IS NOT NULL THEN
      INSERT INTO notification_queue (template_id, recipient_phone, order_id, variables)
      VALUES (v_template_id, v_phone, NEW.id, v_variables);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recalc_loyalty_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_old_rank int := 0; -- OLD doesn't exist on INSERT — a brand-new balance row starts ranked below ROOKIE
  v_new_rank int;
  v_template_id uuid;
  v_phone text;
  v_name text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_rank := CASE OLD.tier::text WHEN 'LEGEND' THEN 3 WHEN 'RIOT' THEN 2 WHEN 'RUNNER' THEN 1 ELSE 0 END;
  END IF;

  NEW.tier := CASE
    WHEN NEW.lifetime_spent >= 25000 THEN 'LEGEND'::loyalty_tier
    WHEN NEW.lifetime_spent >= 10000 THEN 'RIOT'::loyalty_tier
    WHEN NEW.lifetime_spent >= 2500  THEN 'RUNNER'::loyalty_tier
    ELSE 'ROOKIE'::loyalty_tier
  END;

  v_new_rank := CASE NEW.tier::text WHEN 'LEGEND' THEN 3 WHEN 'RIOT' THEN 2 WHEN 'RUNNER' THEN 1 ELSE 0 END;

  IF v_new_rank > v_old_rank THEN
    SELECT phone, name INTO v_phone, v_name FROM profiles WHERE user_id = NEW.user_id;
    IF v_phone IS NOT NULL AND v_phone <> '' THEN
      SELECT id INTO v_template_id FROM notification_templates WHERE template_name = 'loyalty_tier_upgrade' AND is_active = true;
      IF v_template_id IS NOT NULL THEN
        INSERT INTO notification_queue (template_id, recipient_phone, order_id, variables)
        VALUES (v_template_id, v_phone, NULL, jsonb_build_object(
          'customer_name', COALESCE(v_name, 'there'),
          'tier_name', NEW.tier::text,
          'perks_url', 'https://studiodeny.com/rewards'
        ));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- abandoned_cart_final — a 4th stage after 48h, so the CHECK
-- constraint (and the scan job, updated separately in code) needs
-- to allow it.
-- ────────────────────────────────────────────────────────────
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_last_abandoned_stage_check;
ALTER TABLE carts ADD CONSTRAINT carts_last_abandoned_stage_check
  CHECK (last_abandoned_stage IN ('1h', '24h', '48h', 'final'));
