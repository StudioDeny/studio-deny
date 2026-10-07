-- ============================================================
-- Migration: signup popup for logged-out visitors — every word,
-- colour, background and timing admin-editable (singleton row).
-- ============================================================

CREATE TABLE IF NOT EXISTS signup_popup (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled              boolean NOT NULL DEFAULT true,
  delay_seconds        integer NOT NULL DEFAULT 8 CHECK (delay_seconds >= 0),
  show_on              text NOT NULL DEFAULT 'all' CHECK (show_on IN ('all', 'home')),
  reshow_after_hours   integer NOT NULL DEFAULT 24 CHECK (reshow_after_hours >= 0),
  layout               text NOT NULL DEFAULT 'media_left' CHECK (layout IN ('media_left', 'media_right', 'form_only')),
  show_media_on_mobile boolean NOT NULL DEFAULT false,

  bg_type              text NOT NULL DEFAULT 'color' CHECK (bg_type IN ('color', 'image', 'video')),
  bg_color             text NOT NULL DEFAULT '#000000',
  bg_image_url         text,
  bg_video_url         text,
  overlay_color        text NOT NULL DEFAULT '#000000',
  overlay_opacity      integer NOT NULL DEFAULT 40 CHECK (overlay_opacity BETWEEN 0 AND 100),
  logo_url             text,
  heading              text NOT NULL DEFAULT 'Welcome!',
  heading_color        text NOT NULL DEFAULT '#FFFFFF',
  subheading           text NOT NULL DEFAULT 'Sign up and unlock a surprise discount on your first order.',
  subheading_color     text NOT NULL DEFAULT '#FFFFFF',

  form_bg_color        text NOT NULL DEFAULT '#FFFFFF',
  form_text_color      text NOT NULL DEFAULT '#111111',
  form_title           text NOT NULL DEFAULT 'Sign up',
  form_subtitle        text NOT NULL DEFAULT 'Get your welcome code instantly',
  name_placeholder     text NOT NULL DEFAULT 'Full name',
  email_placeholder    text NOT NULL DEFAULT 'Email',
  phone_placeholder    text NOT NULL DEFAULT '10-digit mobile number',
  password_placeholder text NOT NULL DEFAULT 'Create a password (min 6)',
  submit_text          text NOT NULL DEFAULT 'SIGN UP & GET MY CODE',
  submit_bg_color      text NOT NULL DEFAULT '#111111',
  submit_text_color    text NOT NULL DEFAULT '#FFFFFF',
  login_link_text      text NOT NULL DEFAULT 'Already have an account? Log in',
  terms_text           text NOT NULL DEFAULT 'By signing up you agree to our Privacy Policy and Terms.',

  success_heading      text NOT NULL DEFAULT 'You''re in!',
  success_body         text NOT NULL DEFAULT 'Here''s {discount} on your first order. Use this code at checkout:',
  copy_button_text     text NOT NULL DEFAULT 'COPY CODE',
  cta_text             text NOT NULL DEFAULT 'START SHOPPING',
  cta_href             text NOT NULL DEFAULT '/shop',

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_signup_popup_updated_at
    BEFORE UPDATE ON signup_popup
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO signup_popup (id)
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM signup_popup);

ALTER TABLE signup_popup ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "signup_popup: public read" ON signup_popup FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signup_popup: staff write" ON signup_popup
    FOR ALL USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
