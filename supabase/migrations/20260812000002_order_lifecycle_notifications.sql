-- ============================================================
-- Migration: wire up the order-lifecycle WhatsApp notifications
-- that were documented in SETUP.md but never actually queued
-- anywhere (order_placed, payment_success, cod_advance_payment,
-- order_confirmed, order_cancelled, refund_approved).
--
-- Implemented as a single trigger on `orders` rather than editing
-- every client call site — this means it fires identically whether
-- an order/status-change came from the browser (checkout, cancel,
-- refund) or the admin's plain status dropdown, so notifications
-- never silently depend on which UI button was clicked. It also
-- bypasses notification_queue's admin-only RLS (SECURITY DEFINER),
-- which a client-side insert could never have done anyway.
--
-- order_shipped/order_delivered are already queued directly by the
-- shiprocket-sync/shiprocket-webhook edge functions when a real
-- Shiprocket shipment exists — this trigger only fires those two
-- for the *manual* dropdown path (no AWB / no delivered_at yet),
-- detected via NEW.awb_number/NEW.delivered_at still being NULL,
-- so a real Shiprocket-driven update never double-sends.
--
-- payment_failed is NOT handled here — it happens before any order
-- row exists, so it's queued from a new edge function instead
-- (queue-payment-failed), called directly from src/lib/razorpay.ts.
-- ============================================================

INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('Order Placed', 'order_placed',
   'Hi {{1}}! Your order {{2}} has been placed. Total: ₹{{3}}. We''ll confirm it shortly.',
   ARRAY['customer_name','order_number','total'], true),
  ('Payment Success', 'payment_success',
   'Payment confirmed! Hi {{1}}, we received ₹{{2}} for your order {{3}}. Time to get it packed.',
   ARRAY['customer_name','total','order_number'], true),
  ('Order Cancelled', 'order_cancelled',
   'Hi {{1}}, your order {{2}} has been cancelled. If you were charged, a refund will follow.',
   ARRAY['customer_name','order_number'], true),
  ('Refund Approved', 'refund_approved',
   'Hi {{1}}, we''ve refunded ₹{{2}} for your order {{3}}. It will reflect in 5–7 business days.',
   ARRAY['customer_name','amount','order_number'], true)
ON CONFLICT (template_name) DO NOTHING;

-- These two exist as stale rows only if SETUP.md's old Step 6 SQL was ever
-- manually run — their documented variables didn't match how this trigger
-- actually fires (payment_failed has no order yet; cod_advance_payment
-- fires *after* the advance was already collected, not as a request for
-- one) — DO UPDATE so this migration is the source of truth regardless.
INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('COD Advance Received', 'cod_advance_payment',
   'Hi {{1}}, we''ve received your ₹{{3}} advance for order {{2}}. The rest is payable on delivery.',
   ARRAY['customer_name','order_number','advance_amount'], true),
  ('Payment Failed', 'payment_failed',
   'Hi {{1}}, your payment didn''t go through. Please retry here: {{2}}. Your bag is still saved.',
   ARRAY['customer_name','retry_url'], true)
ON CONFLICT (template_name) DO UPDATE SET
  body_text = EXCLUDED.body_text,
  variables = EXCLUDED.variables;

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

DROP TRIGGER IF EXISTS trg_orders_lifecycle_notify ON orders;
CREATE TRIGGER trg_orders_lifecycle_notify
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION queue_order_lifecycle_notification();
