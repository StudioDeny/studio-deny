-- Saved addresses move from localStorage to the addresses table; the
-- storefront lets customers label them (Home / Work …).
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS label text;
