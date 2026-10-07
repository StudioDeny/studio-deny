-- Run in Supabase SQL Editor. Leaves no data behind.
BEGIN;

-- T1: seeded tiers exist and sum to 100
DO $$ DECLARE s numeric; BEGIN
  SELECT SUM(target_percent) INTO s FROM welcome_offer_tiers WHERE is_active;
  ASSERT s = 100, format('T1 tiers should sum to 100, got %s', s);
END $$;

-- T2: picker distribution is close to targets over 4000 draws
DO $$ DECLARE five int; ten int; fifteen int; BEGIN
  CREATE TEMP TABLE draws ON COMMIT DROP AS
    SELECT pick_welcome_tier() AS tier_id FROM generate_series(1, 4000);
  SELECT count(*) INTO five    FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 5;
  SELECT count(*) INTO ten     FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 10;
  SELECT count(*) INTO fifteen FROM draws d JOIN welcome_offer_tiers t ON t.id = d.tier_id WHERE t.discount_value = 15;
  ASSERT five BETWEEN 3080 AND 3320, format('T2 5%% tier got %s/4000', five);
  ASSERT ten BETWEEN 500 AND 700, format('T2 10%% tier got %s/4000', ten);
  ASSERT fifteen BETWEEN 130 AND 270, format('T2 15%% tier got %s/4000', fifteen);
END $$;

-- T3: weights that don't sum to 100 are normalised, not broken
DO $$ DECLARE n int; BEGIN
  UPDATE welcome_offer_tiers SET target_percent = 0 WHERE discount_value IN (10, 15);
  SELECT count(DISTINCT pick_welcome_tier()) INTO n FROM generate_series(1, 200);
  ASSERT n = 1, format('T3 only the 5%% tier should be picked, got %s distinct', n);
  UPDATE welcome_offer_tiers SET target_percent = CASE discount_value WHEN 10 THEN 15 WHEN 15 THEN 5 END
    WHERE discount_value IN (10, 15);
END $$;

-- T4: a new auth user gets exactly one welcome coupon with the right shape
DO $$ DECLARE uid uuid := gen_random_uuid(); c coupons%ROWTYPE; BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (uid, 'welcome-test-' || uid || '@example.com', '{"name":"T","phone":"9999999999"}', 'authenticated', 'authenticated');
  SELECT * INTO c FROM coupons WHERE assigned_user_id = uid;
  ASSERT FOUND, 'T4 welcome coupon not issued';
  ASSERT c.kind = 'welcome', 'T4 kind';
  ASSERT c.code ~ '^DENY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$', format('T4 bad code %s', c.code);
  ASSERT c.max_uses = 1 AND c.per_user_limit = 1, 'T4 single use';
  ASSERT c.welcome_tier_id IS NOT NULL, 'T4 tier recorded';
  -- second call is a no-op
  ASSERT issue_welcome_coupon(uid) IS NULL, 'T4 second issue must be a no-op';
  ASSERT (SELECT count(*) FROM coupons WHERE assigned_user_id = uid) = 1, 'T4 exactly one';
END $$;

-- T4b: every one of 50 signups gets exactly one code (the picker must run
-- once per signup, not once per tier row)
DO $$ DECLARE missing int; BEGIN
  CREATE TEMP TABLE batch ON COMMIT DROP AS SELECT gen_random_uuid() AS id FROM generate_series(1, 50);
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  SELECT id, 'batch-' || id || '@example.com', '{}', 'authenticated', 'authenticated' FROM batch;
  SELECT count(*) INTO missing FROM batch b
  WHERE (SELECT count(*) FROM coupons c WHERE c.assigned_user_id = b.id) <> 1;
  ASSERT missing = 0, format('T4b %s of 50 signups did not get exactly one code', missing);
END $$;

-- T5: disabled offer issues nothing
DO $$ DECLARE uid uuid := gen_random_uuid(); BEGIN
  UPDATE welcome_offer_settings SET enabled = false;
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (uid, 'welcome-off-' || uid || '@example.com', '{}', 'authenticated', 'authenticated');
  ASSERT NOT EXISTS (SELECT 1 FROM coupons WHERE assigned_user_id = uid), 'T5 disabled offer issued a coupon';
END $$;

-- T6: codes are normalised to upper case
DO $$ BEGIN
  INSERT INTO coupons (code, discount_type, discount_value) VALUES ('  summer10 ', 'percent', 10);
  ASSERT EXISTS (SELECT 1 FROM coupons WHERE code = 'SUMMER10'), 'T6 code not normalised';
END $$;

-- T7: welcome-offer save is all-or-nothing — targets that don't total 100
-- are refused and NOTHING changes; a valid save applies every change
DO $$ DECLARE admin_id uuid := gen_random_uuid(); sid uuid; t5 uuid; t10 uuid; t15 uuid; failed boolean := false; BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (admin_id, 'admin-' || admin_id || '@example.com', '{}', 'authenticated', 'authenticated');
  UPDATE user_roles SET role = 'admin' WHERE user_id = admin_id;
  INSERT INTO user_roles (user_id, role) SELECT admin_id, 'admin' WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = admin_id);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  SELECT id INTO sid FROM welcome_offer_settings LIMIT 1;
  SELECT id INTO t5 FROM welcome_offer_tiers WHERE discount_value = 5;
  SELECT id INTO t10 FROM welcome_offer_tiers WHERE discount_value = 10;
  SELECT id INTO t15 FROM welcome_offer_tiers WHERE discount_value = 15;
  BEGIN
    PERFORM save_welcome_offer(
      jsonb_build_object('id', sid, 'enabled', true, 'code_prefix', 'NEW', 'first_order_only', true),
      jsonb_build_array(
        jsonb_build_object('id', t5, 'label', '5% OFF', 'discount_type', 'percent', 'discount_value', 5, 'target_percent', 70, 'is_active', true),
        jsonb_build_object('id', t10, 'label', '10% OFF', 'discount_type', 'percent', 'discount_value', 10, 'target_percent', 15, 'is_active', true),
        jsonb_build_object('id', t15, 'label', '15% OFF', 'discount_type', 'percent', 'discount_value', 15, 'target_percent', 5, 'is_active', true)),
      '{}');
  EXCEPTION WHEN raise_exception THEN failed := true;
  END;
  ASSERT failed, 'T7 a save totalling 90% must be refused';
  ASSERT (SELECT target_percent FROM welcome_offer_tiers WHERE id = t5) = 80, 'T7 refused save changed a tier';
  ASSERT (SELECT code_prefix FROM welcome_offer_settings WHERE id = sid) = 'DENY', 'T7 refused save changed settings';

  PERFORM save_welcome_offer(
    jsonb_build_object('id', sid, 'enabled', true, 'code_prefix', 'NEW', 'valid_days', 7, 'first_order_only', true),
    jsonb_build_array(
      jsonb_build_object('id', t5, 'label', '5% OFF', 'discount_type', 'percent', 'discount_value', 5, 'target_percent', 85, 'is_active', true),
      jsonb_build_object('id', t10, 'label', '10% OFF', 'discount_type', 'percent', 'discount_value', 10, 'target_percent', 15, 'is_active', true)),
    ARRAY[t15]);
  ASSERT (SELECT code_prefix FROM welcome_offer_settings WHERE id = sid) = 'NEW', 'T7 valid save did not apply settings';
  ASSERT NOT EXISTS (SELECT 1 FROM welcome_offer_tiers WHERE id = t15), 'T7 removed tier still there';
  ASSERT (SELECT SUM(target_percent) FROM welcome_offer_tiers WHERE is_active) = 100, 'T7 total after valid save';
END $$;

-- T8: an older coupon whose code has a space can still be switched off
DO $$ BEGIN
  ALTER TABLE coupons DISABLE TRIGGER trg_coupons_normalize_code;
  INSERT INTO coupons (code, discount_type, discount_value) VALUES ('OLD CODE', 'fixed', 10);
  ALTER TABLE coupons ENABLE TRIGGER trg_coupons_normalize_code;
  UPDATE coupons SET is_active = false WHERE code = 'OLD CODE';
  ASSERT (SELECT NOT is_active FROM coupons WHERE code = 'OLD CODE'), 'T8 old code could not be switched off';
END $$;

ROLLBACK;
