-- Step 1 of 2 — run this ALONE first and let it finish, then run
-- 20261120000003_add_sale_section.sql separately.
-- A new enum value can't be used in the same transaction that creates it.
ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'sale';
