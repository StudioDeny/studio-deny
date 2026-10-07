-- Run in Supabase SQL Editor after Task 1. Leaves no data behind.
BEGIN;

CREATE TEMP TABLE ctx ON COMMIT DROP AS
SELECT gen_random_uuid() AS uid, gen_random_uuid() AS other_uid,
       (SELECT slug FROM products WHERE price >= 100 ORDER BY price LIMIT 1) AS slug,
       (SELECT price FROM products WHERE price >= 100 ORDER BY price LIMIT 1) AS price;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
SELECT uid, 'quote-' || uid || '@example.com', '{}'::jsonb, 'authenticated', 'authenticated' FROM ctx
UNION ALL
SELECT other_uid, 'quote-' || other_uid || '@example.com', '{}'::jsonb, 'authenticated', 'authenticated' FROM ctx;

SELECT set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) FROM ctx;

-- general coupons used by the tests
INSERT INTO coupons (code, discount_type, discount_value) VALUES ('TEST10', 'percent', 10);
INSERT INTO coupons (code, discount_type, discount_value, max_discount) VALUES ('TESTCAP', 'percent', 50, 20);
INSERT INTO coupons (code, discount_type, discount_value, expires_at) VALUES ('TESTOLD', 'fixed', 50, now() - interval '1 day');
INSERT INTO coupons (code, discount_type, discount_value, starts_at) VALUES ('TESTSOON', 'fixed', 50, now() + interval '1 day');
INSERT INTO coupons (code, discount_type, discount_value, min_order) VALUES ('TESTMIN', 'fixed', 50, 999999);
INSERT INTO coupons (code, discount_type, discount_value, is_active) VALUES ('TESTOFF', 'fixed', 50, false);
INSERT INTO coupons (code, discount_type, discount_value, max_uses, used_count) VALUES ('TESTFULL', 'fixed', 50, 5, 5);

-- T1: plain quote = DB price × qty, no coupon
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 2)), NULL);
  ASSERT (q->>'subtotal')::numeric = c.price * 2, format('T1 subtotal %s', q);
  ASSERT (q->>'coupon_discount')::numeric = 0, 'T1 no coupon discount';
  ASSERT (q->>'total')::numeric = (q->>'subtotal')::numeric - (q->>'loyalty_discount')::numeric + (q->>'shipping')::numeric, 'T1 total formula';
END $$;

-- T2: percent coupon, lower-case input accepted
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), ' test10 ');
  ASSERT q->>'coupon_error' IS NULL, format('T2 error %s', q->>'coupon_error');
  ASSERT q->>'coupon_code' = 'TEST10', 'T2 normalised code';
  ASSERT (q->>'coupon_discount')::numeric = round(c.price * 0.10), format('T2 discount %s', q->>'coupon_discount');
END $$;

-- T3: ₹ cap
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), 'TESTCAP');
  ASSERT (q->>'coupon_discount')::numeric = LEAST(20, round(c.price * 0.5)), format('T3 cap %s', q->>'coupon_discount');
END $$;

-- T4: every rejection returns its code and a zero discount
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; code text; expected text; BEGIN
  SELECT * INTO c FROM ctx;
  FOR code, expected IN VALUES
    ('NOPE123', 'not_found'), ('TESTOLD', 'expired'), ('TESTSOON', 'not_started'),
    ('TESTMIN', 'min_order'), ('TESTOFF', 'inactive'), ('TESTFULL', 'limit_reached')
  LOOP
    q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), code);
    ASSERT q->>'coupon_error' = expected, format('T4 %s → %s, expected %s', code, q->>'coupon_error', expected);
    ASSERT (q->>'coupon_discount')::numeric = 0, format('T4 %s discount must be 0', code);
  END LOOP;
END $$;

-- T5: someone else's welcome coupon is rejected; own one works
DO $$ DECLARE q jsonb; c ctx%ROWTYPE; other_code text; own_code text; BEGIN
  SELECT * INTO c FROM ctx;
  SELECT code INTO other_code FROM coupons WHERE assigned_user_id = c.other_uid;
  SELECT code INTO own_code FROM coupons WHERE assigned_user_id = c.uid;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), other_code);
  -- answers like an unknown code, so codes can't be probed
  ASSERT q->>'coupon_error' = 'not_found', format('T5 other → %s', q->>'coupon_error');
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), own_code);
  ASSERT q->>'coupon_error' IS NULL, format('T5 own → %s', q->>'coupon_error');
END $$;

-- T6: unknown product and bad qty raise
DO $$ BEGIN
  BEGIN
    PERFORM quote_order('[{"slug":"no-such-product-xyz","variantId":null,"qty":1}]'::jsonb, NULL);
    ASSERT false, 'T6 unknown item should raise';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    PERFORM quote_order(jsonb_build_array(jsonb_build_object('slug', (SELECT slug FROM ctx), 'variantId', null, 'qty', 0)), NULL);
    ASSERT false, 'T6 qty 0 should raise';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;

-- T7: items key ignores line order
DO $$ BEGIN
  ASSERT order_items_key('[{"slug":"b","variantId":null,"qty":1},{"slug":"a","variantId":"v1","qty":2}]')
       = order_items_key('[{"slug":"a","variantId":"v1","qty":2},{"slug":"b","variantId":null,"qty":1}]'), 'T7 order-insensitive';
END $$;

-- T8: order must match the stored quote
DO $$ DECLARE c ctx%ROWTYPE; items jsonb; q jsonb; BEGIN
  SELECT * INTO c FROM ctx;
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1));
  q := quote_order(items, 'TEST10');
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T8', c.uid, order_items_key(items), 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T8', 'order_T8', round((q->>'total')::numeric * 100)::integer);

  ASSERT order_matches_payment_quote('pay_T8', items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL), 'T8 exact match accepted';
  ASSERT NOT order_matches_payment_quote('pay_T8', items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric + 100, (q->>'shipping')::numeric, (q->>'total')::numeric - 100, 'razorpay', NULL), 'T8 forged coupon rejected';
  ASSERT NOT order_matches_payment_quote('pay_T8',
    jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 5)), 'TEST10', (q->>'subtotal')::numeric,
    (q->>'loyalty_discount')::numeric, (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL),
    'T8 different cart rejected';
  -- another logged-in customer asking about this payment gets false
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.other_uid, 'role', 'authenticated')::text, true);
  ASSERT NOT order_matches_payment_quote('pay_T8', items, 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
    (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'razorpay', NULL), 'T8 other user rejected';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.uid, 'role', 'authenticated')::text, true);
END $$;

-- T9: redemption trigger records use even when the coupon is already full
DO $$ DECLARE c ctx%ROWTYPE; before_count int; BEGIN
  SELECT * INTO c FROM ctx;
  UPDATE coupons SET max_uses = 1, used_count = 1 WHERE code = 'TEST10';
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, total, address, payment_id, coupon_code, coupon_discount)
  VALUES ('SDTEST9', c.uid, 'x@example.com', '[]', 100, 0, 0, 90, '{}', 'pay_T9', 'TEST10', 10);
  ASSERT (SELECT used_count FROM coupons WHERE code = 'TEST10') = 2, 'T9 used_count incremented past limit';
  ASSERT EXISTS (SELECT 1 FROM coupon_redemptions WHERE order_id = 'SDTEST9' AND code = 'TEST10' AND discount_amount = 10), 'T9 redemption row';
END $$;

-- T10: after one use, the user's own welcome coupon reports already_used
DO $$ DECLARE c ctx%ROWTYPE; own_code text; q jsonb; BEGIN
  SELECT * INTO c FROM ctx;
  SELECT code INTO own_code FROM coupons WHERE assigned_user_id = c.uid;
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, total, address, payment_id, coupon_code, coupon_discount)
  VALUES ('SDTEST10', c.uid, 'x@example.com', '[]', 100, 0, 0, 95, '{}', 'pay_T10', own_code, 5);
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), own_code);
  ASSERT q->>'coupon_error' IN ('already_used', 'first_order_only'), format('T10 → %s', q->>'coupon_error');
END $$;

-- T11: as a real customer (RLS on), a forged order is refused and the
-- order that equals its paid quote saves
DO $$ DECLARE c ctx%ROWTYPE; items jsonb; q jsonb; refused boolean := false; BEGIN
  SELECT * INTO c FROM ctx;
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'name', 'T11', 'price', c.price, 'qty', 1, 'variantId', null));
  UPDATE coupons SET max_uses = NULL, used_count = 0 WHERE code = 'TEST10';
  q := quote_order(items, 'TEST10');
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T11', c.uid, order_items_key(items), 'TEST10', (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T11', 'order_T11', round((q->>'total')::numeric * 100)::integer);

  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, coupon_code, coupon_discount, total, address, payment_id, payment_method)
    VALUES ('SDTEST11F', c.uid, 'x@example.com', items, (q->>'subtotal')::numeric, (q->>'shipping')::numeric,
            (q->>'loyalty_discount')::numeric, 'TEST10', (q->>'coupon_discount')::numeric + 50,
            (q->>'total')::numeric - 50, '{}', 'pay_T11', 'razorpay');
  EXCEPTION WHEN insufficient_privilege THEN refused := true;
  END;
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, coupon_code, coupon_discount, total, address, payment_id, payment_method)
  VALUES ('SDTEST11', c.uid, 'x@example.com', items, (q->>'subtotal')::numeric, (q->>'shipping')::numeric,
          (q->>'loyalty_discount')::numeric, 'TEST10', (q->>'coupon_discount')::numeric,
          (q->>'total')::numeric, '{}', 'pay_T11', 'razorpay');
  RESET ROLE;

  ASSERT refused, 'T11 forged order was accepted';
  ASSERT EXISTS (SELECT 1 FROM orders WHERE id = 'SDTEST11'), 'T11 honest order missing';
  ASSERT EXISTS (SELECT 1 FROM coupon_redemptions WHERE order_id = 'SDTEST11'), 'T11 redemption missing';
END $$;

-- T14: no regression — without a coupon, the server quote equals the OLD
-- browser checkout math (checkout.tsx before this change) for a loyalty
-- member and a non-member, across the free-shipping boundary.
DO $$ DECLARE c ctx%ROWTYPE; q jsonb; qty int; sub numeric; disc numeric; ship numeric; tot numeric;
              free_ship numeric; adv_pct numeric; cod_min numeric; member boolean; BEGIN
  SELECT * INTO c FROM ctx;
  SELECT COALESCE((SELECT free_shipping FROM loyalty_settings LIMIT 1), 2499) INTO free_ship;
  SELECT COALESCE(cod_advance_percent, 20), COALESCE(cod_min_order, 0) INTO adv_pct, cod_min FROM settings LIMIT 1;
  FOREACH member IN ARRAY ARRAY[false, true] LOOP
    IF member THEN  -- a past qualifying order makes this customer a loyalty member
      INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, total, address, payment_id, status)
      VALUES ('SDTEST14', c.uid, 'x@example.com', '[]', 900000, 0, 0, 900000, '{}', 'pay_T14', 'DELIVERED');
    END IF;
    FOR qty IN 1..6 LOOP
      q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', qty)), NULL);
      -- old checkout.tsx: discount = round(subtotal × tier%), ship = 0 if subtotal − discount ≥ free, else 99
      sub  := c.price * qty;
      disc := customer_loyalty_discount(c.uid, sub);
      ship := CASE WHEN sub - disc >= free_ship THEN 0 ELSE 99 END;
      tot  := GREATEST(0, sub - disc + ship);
      ASSERT (q->>'subtotal')::numeric = sub, format('T14 member=%s qty=%s subtotal %s vs %s', member, qty, q->>'subtotal', sub);
      ASSERT (q->>'loyalty_discount')::numeric = disc, format('T14 member=%s qty=%s discount %s vs %s', member, qty, q->>'loyalty_discount', disc);
      ASSERT (q->>'shipping')::numeric = ship, format('T14 member=%s qty=%s shipping %s vs %s', member, qty, q->>'shipping', ship);
      ASSERT (q->>'total')::numeric = tot, format('T14 member=%s qty=%s total %s vs %s', member, qty, q->>'total', tot);
      ASSERT (q->>'cod_advance')::numeric = round(tot * adv_pct / 100), format('T14 qty=%s cod advance', qty);
      ASSERT (q->>'cod_available')::boolean = (tot >= cod_min), format('T14 qty=%s cod available', qty);
    END LOOP;
  END LOOP;
  ASSERT customer_loyalty_discount(c.uid, c.price) > 0, 'T14 member case must actually get a loyalty discount';
  DELETE FROM orders WHERE id = 'SDTEST14';
END $$;

-- T12: the order saves at the price the customer PAID, even if the catalog
-- price changed after the quote (admin edit mid-payment). Order line prices
-- come from the quote's lines, exactly as src/lib/orders.ts builds them.
DO $$ DECLARE c ctx%ROWTYPE; q jsonb; items jsonb; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 2)), NULL);
  ASSERT jsonb_array_length(q->'lines') = 1, format('T12 quote lines missing: %s', q);
  ASSERT (q->'lines'->0->>'price')::numeric = c.price, 'T12 line price is the catalog price';
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T12', c.uid, order_items_key(q->'lines'), NULL, (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          0, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T12', 'order_T12', round((q->>'total')::numeric * 100)::integer);

  UPDATE products SET price = price + 500 WHERE slug = c.slug;   -- admin edits the price

  -- the browser sends JS numbers: 1199, not "1199.00"
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'name', 'T12', 'qty', 2, 'variantId', null,
                                                'price', (q->'lines'->0->>'price')::numeric::float8));
  SET LOCAL ROLE authenticated;
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, coupon_code, coupon_discount, total, address, payment_id, payment_method)
  VALUES ('SDTEST12', c.uid, 'x@example.com', items, (q->>'subtotal')::numeric, (q->>'shipping')::numeric,
          (q->>'loyalty_discount')::numeric, NULL, 0, (q->>'total')::numeric, '{}', 'pay_T12', 'razorpay');
  RESET ROLE;
  ASSERT EXISTS (SELECT 1 FROM orders WHERE id = 'SDTEST12'), 'T12 paid order missing';
END $$;

-- T13: an order whose line prices differ from what was paid is refused
DO $$ DECLARE c ctx%ROWTYPE; q jsonb; items jsonb; refused boolean := false; BEGIN
  SELECT * INTO c FROM ctx;
  q := quote_order(jsonb_build_array(jsonb_build_object('slug', c.slug, 'variantId', null, 'qty', 1)), NULL);
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T13', c.uid, order_items_key(q->'lines'), NULL, (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          0, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T13', 'order_T13', round((q->>'total')::numeric * 100)::integer);
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'name', 'T13', 'qty', 1, 'variantId', null, 'price', 1));
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, coupon_code, coupon_discount, total, address, payment_id, payment_method)
    VALUES ('SDTEST13', c.uid, 'x@example.com', items, (q->>'subtotal')::numeric, (q->>'shipping')::numeric,
            (q->>'loyalty_discount')::numeric, NULL, 0, (q->>'total')::numeric, '{}', 'pay_T13', 'razorpay');
  EXCEPTION WHEN insufficient_privilege THEN refused := true;
  END;
  RESET ROLE;
  ASSERT refused, 'T13 order with a forged line price was accepted';
END $$;

-- T15: an admin renames the coupon while the customer is paying → the
-- paid order still counts against THAT coupon (id stored with the quote)
DO $$ DECLARE c ctx%ROWTYPE; items jsonb; q jsonb; cid uuid; BEGIN
  SELECT * INTO c FROM ctx;
  INSERT INTO coupons (code, discount_type, discount_value) VALUES ('RENAME1', 'fixed', 20) RETURNING id INTO cid;
  items := jsonb_build_array(jsonb_build_object('slug', c.slug, 'name', 'T15', 'price', c.price, 'qty', 1, 'variantId', null));
  q := quote_order(items, 'RENAME1');
  ASSERT (q->>'coupon_id')::uuid = cid, 'T15 quote carries the coupon id';
  INSERT INTO payment_quotes (razorpay_order_id, user_id, items_key, coupon_code, coupon_id, subtotal, loyalty_discount,
                              coupon_discount, shipping, total, payment_type, cod_advance)
  VALUES ('order_T15', c.uid, order_items_key(q->'lines'), 'RENAME1', cid, (q->>'subtotal')::numeric, (q->>'loyalty_discount')::numeric,
          (q->>'coupon_discount')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric, 'full', (q->>'cod_advance')::numeric);
  INSERT INTO verified_payments (payment_id, razorpay_order_id, amount_paise)
  VALUES ('pay_T15', 'order_T15', round((q->>'total')::numeric * 100)::integer);
  UPDATE coupons SET code = 'RENAMED1' WHERE id = cid;   -- admin edit mid-payment
  INSERT INTO orders (id, user_id, user_email, items, subtotal, shipping, discount, coupon_code, coupon_discount, total, address, payment_id, payment_method)
  VALUES ('SDTEST15', c.uid, 'x@example.com', items, (q->>'subtotal')::numeric, (q->>'shipping')::numeric,
          (q->>'loyalty_discount')::numeric, 'RENAME1', (q->>'coupon_discount')::numeric, (q->>'total')::numeric, '{}', 'pay_T15', 'razorpay');
  ASSERT (SELECT used_count FROM coupons WHERE id = cid) = 1, 'T15 renamed coupon use not counted';
  ASSERT (SELECT coupon_id FROM coupon_redemptions WHERE order_id = 'SDTEST15') = cid, 'T15 redemption not linked';
END $$;

ROLLBACK;
