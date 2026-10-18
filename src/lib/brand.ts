import { supabase } from "./supabase";
import type { BrandSettings } from "@/types/database";

// Admin → Settings (brand_settings): contact details and social links.
// Fetched once per page load and shared by the footer, Contact page,
// Contact Support section and Instagram button.
let inflight: Promise<Partial<BrandSettings>> | null = null;
export function getBrandSettings(): Promise<Partial<BrandSettings>> {
  inflight ??= Promise.resolve(
    supabase
      .from("brand_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ).then(
    ({ data }) => (data ?? {}) as Partial<BrandSettings>,
    () => ({}),
  );
  return inflight;
}

// Settings accepts "@handle" or a full link for Instagram — either opens the profile.
export function instagramHref(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v
    .replace(/^@/, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/\/+$/, "");
  return handle ? `https://www.instagram.com/${handle}/` : null;
}

// A wa.me link or a plain phone number — either opens the chat.
export function whatsappHref(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(api\.)?wa\.me\//i.test(v)) return `https://${v}`;
  const digits = v.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

// Any other link typed without https:// (e.g. "youtube.com/@studiodeny").
export function outsideHref(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
