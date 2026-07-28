-- Contact Support section on the homepage was localStorage-only (per-browser,
-- not actually shared with site visitors) — moving it onto brand_settings,
-- which is already Supabase-backed and already admin-editable.
ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS support_hours text,
  ADD COLUMN IF NOT EXISTS support_enabled boolean NOT NULL DEFAULT true;
