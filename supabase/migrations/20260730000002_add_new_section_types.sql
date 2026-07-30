-- Step 1 of 2 — run this ALONE first and let it finish, then run
-- 20260730000003_reorder_home_sections_and_fix_community.sql separately.
-- New enum values can't be used in the same transaction that creates them,
-- so these two files must run as two distinct statements/queries.

ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'influencer_picks';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'community';
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'contact_support';
