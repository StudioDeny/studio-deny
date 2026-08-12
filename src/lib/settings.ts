// Loyalty / discount + general admin settings (localStorage-backed).
import { supabase } from "./supabase";

const KEY = "sd_settings_v1";

export type LoyaltySettings = {
  discount: { ROOKIE: number; RUNNER: number; RIOT: number; LEGEND: number };
  /** Minimum single-order value (₹) to enter the loyalty pool. Default 5000. */
  entryThreshold: number;
  /** How many ₹ a customer must spend to earn 1 point. Default 50. */
  rupeesPerEarnedPoint: number;
  /** How much each point is worth in ₹ at redemption. Default 1. */
  rupeesPerPoint: number;
  freeShipping: number;
  /** Curated color swatches for the shop page's COLOR filter. Empty = auto-derive from product colors. */
  filterColors: { name: string; hex: string }[];
};

export type InvoiceTemplate = {
  brandName: string;
  tagline: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  accent: string; // hex
  terms: string;
  footer: string;
  signatory: string;
  taxLabel: string;
};

const DEFAULTS: LoyaltySettings = {
  discount: { ROOKIE: 0, RUNNER: 5, RIOT: 10, LEGEND: 15 },
  entryThreshold: 5000,
  rupeesPerEarnedPoint: 50,
  rupeesPerPoint: 1,
  freeShipping: 2499,
  filterColors: [],
};

export function getSettings(): LoyaltySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") || {};
    return {
      ...DEFAULTS,
      ...raw,
      discount: { ...DEFAULTS.discount, ...(raw.discount || {}) },
      filterColors: raw.filterColors ?? DEFAULTS.filterColors,
      // Migrate legacy key: pointsPer100=10 meant 10pts/₹100 = 1pt/₹10.
      // New field: rupeesPerEarnedPoint defaults to 50. Ignore old value
      // unless admin has already saved the new field.
      rupeesPerEarnedPoint: raw.rupeesPerEarnedPoint ?? DEFAULTS.rupeesPerEarnedPoint,
      entryThreshold: raw.entryThreshold ?? DEFAULTS.entryThreshold,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: LoyaltySettings) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}

export const TIER_KEYS = ["ROOKIE", "RUNNER", "RIOT", "LEGEND"] as const;
export type TierKey = (typeof TIER_KEYS)[number];

// Invoice template used to be stored alongside the settings above in
// localStorage — but that's per-browser, so a customer viewing their own
// invoice on their own device was always reading their OWN blank
// localStorage (falling back to hardcoded defaults), never the admin's
// actual configured brand name/GSTIN/etc. Real Supabase singleton row now,
// same pattern as brand_settings/theme_settings/popup_promo.
type DBInvoiceSettings = {
  id: string;
  brand_name: string;
  tagline: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  accent: string;
  terms: string;
  footer: string;
  signatory: string;
  tax_label: string;
};

const fromDB = (r: DBInvoiceSettings): InvoiceTemplate => ({
  brandName: r.brand_name,
  tagline: r.tagline,
  gstin: r.gstin,
  email: r.email,
  phone: r.phone,
  address: r.address,
  accent: r.accent,
  terms: r.terms,
  footer: r.footer,
  signatory: r.signatory,
  taxLabel: r.tax_label,
});

export async function getInvoiceTemplate(): Promise<InvoiceTemplate | null> {
  const { data, error } = await supabase.from("invoice_settings").select("*").maybeSingle();
  if (error || !data) {
    if (error) console.error("getInvoiceTemplate:", error.message);
    return null;
  }
  return fromDB(data as DBInvoiceSettings);
}

export async function saveInvoiceTemplate(t: InvoiceTemplate): Promise<void> {
  const { data: existing } = await supabase.from("invoice_settings").select("id").maybeSingle();
  const row = {
    brand_name: t.brandName,
    tagline: t.tagline,
    gstin: t.gstin,
    email: t.email,
    phone: t.phone,
    address: t.address,
    accent: t.accent,
    terms: t.terms,
    footer: t.footer,
    signatory: t.signatory,
    tax_label: t.taxLabel,
  };
  const { error } = existing
    ? await supabase.from("invoice_settings").update(row).eq("id", existing.id)
    : await supabase.from("invoice_settings").insert(row);
  if (error) throw new Error(error.message);
}
