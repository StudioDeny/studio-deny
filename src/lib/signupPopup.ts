import { supabase } from "@/lib/supabase";

export type SignupPopupConfig = {
  id: string;
  enabled: boolean;
  delay_seconds: number;
  show_on: "all" | "home";
  reshow_after_hours: number;
  layout: "media_left" | "media_right" | "form_only";
  show_media_on_mobile: boolean;
  bg_type: "color" | "image" | "video";
  bg_color: string;
  bg_image_url: string | null;
  bg_video_url: string | null;
  overlay_color: string;
  overlay_opacity: number;
  logo_url: string | null;
  heading: string;
  heading_color: string;
  subheading: string;
  subheading_color: string;
  form_bg_color: string;
  form_text_color: string;
  form_title: string;
  form_subtitle: string;
  name_placeholder: string;
  email_placeholder: string;
  phone_placeholder: string;
  password_placeholder: string;
  submit_text: string;
  submit_bg_color: string;
  submit_text_color: string;
  login_link_text: string;
  terms_text: string;
  success_heading: string;
  success_body: string;
  copy_button_text: string;
  cta_text: string;
  cta_href: string;
  created_at: string;
  updated_at: string;
};

// Mirrors the migration defaults so the popup renders even if the fetch fails.
export const DEFAULT_SIGNUP_POPUP: SignupPopupConfig = {
  id: "", enabled: true, delay_seconds: 8, show_on: "all", reshow_after_hours: 24,
  layout: "media_left", show_media_on_mobile: false,
  bg_type: "color", bg_color: "#000000", bg_image_url: null, bg_video_url: null,
  overlay_color: "#000000", overlay_opacity: 40, logo_url: null,
  heading: "Welcome!", heading_color: "#FFFFFF",
  subheading: "Sign up and unlock a surprise discount on your first order.", subheading_color: "#FFFFFF",
  form_bg_color: "#FFFFFF", form_text_color: "#111111",
  form_title: "Sign up", form_subtitle: "Get your welcome code instantly",
  name_placeholder: "Full name", email_placeholder: "Email",
  phone_placeholder: "10-digit mobile number", password_placeholder: "Create a password (min 6)",
  submit_text: "SIGN UP & GET MY CODE", submit_bg_color: "#111111", submit_text_color: "#FFFFFF",
  login_link_text: "Already have an account? Log in",
  terms_text: "By signing up you agree to our Privacy Policy and Terms.",
  success_heading: "You're in!",
  success_body: "Here's {discount} on your first order. Use this code at checkout:",
  copy_button_text: "COPY CODE", cta_text: "START SHOPPING", cta_href: "/shop",
  created_at: "", updated_at: "",
};

export async function fetchSignupPopup(): Promise<SignupPopupConfig> {
  try {
    const { data } = await supabase.from("signup_popup").select("*").limit(1).maybeSingle();
    return data ? { ...DEFAULT_SIGNUP_POPUP, ...(data as SignupPopupConfig) } : DEFAULT_SIGNUP_POPUP;
  } catch {
    return DEFAULT_SIGNUP_POPUP;
  }
}

export const DISMISSED_KEY = "sd_signup_popup_dismissed_at";
const BLOCKED_PREFIXES = ["/login", "/signup", "/checkout", "/admin"];

export function shouldShowSignupPopup(a: {
  pathname: string;
  showOn: "all" | "home";
  dismissedAt: number | null;
  reshowAfterHours: number;
  now: number;
}): boolean {
  if (BLOCKED_PREFIXES.some((p) => a.pathname === p || a.pathname.startsWith(p + "/"))) return false;
  if (a.showOn === "home" && a.pathname !== "/") return false;
  if (a.dismissedAt != null && a.now - a.dismissedAt < a.reshowAfterHours * 3600_000) return false;
  return true;
}

export const fillTokens = (text: string, t: { code: string; discount: string }) =>
  text.replaceAll("{code}", t.code).replaceAll("{discount}", t.discount);

export function readDismissedAt(): number | null {
  try {
    const v = localStorage.getItem(DISMISSED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function writeDismissedAt(now: number) {
  try { localStorage.setItem(DISMISSED_KEY, String(now)); } catch { /* private mode */ }
}
