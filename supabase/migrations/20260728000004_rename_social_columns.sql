-- Replace Twitter with WhatsApp, and fix the existing bug where the
-- "Facebook" field was actually wired to render the YouTube link in
-- Footer.tsx — renaming it to what it actually is removes the mismatch.
ALTER TABLE brand_settings RENAME COLUMN social_twitter TO social_whatsapp;
ALTER TABLE brand_settings RENAME COLUMN social_facebook TO social_youtube;
