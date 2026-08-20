// Loyalty/discount + shop config, and the invoice template — both real
// Supabase singletons (loyalty_settings, invoice_settings), not
// localStorage. The loyalty discount % used to live only in the admin's
// own browser (sd_settings_v1) — meaning there was no server-side source
// of truth to check a checkout's claimed discount against, letting a
// forged order pair a plausible discount with an inflated quantity and
// still land on a real, paid total (see 20260812000009).
import { supabase } from "./supabase";

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

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  discount: { ROOKIE: 0, RUNNER: 5, RIOT: 10, LEGEND: 15 },
  entryThreshold: 5000,
  rupeesPerEarnedPoint: 50,
  rupeesPerPoint: 1,
  freeShipping: 2499,
  filterColors: [],
};

export const TIER_KEYS = ["ROOKIE", "RUNNER", "RIOT", "LEGEND"] as const;
export type TierKey = (typeof TIER_KEYS)[number];

type DBLoyaltySettings = {
  id: string;
  discount: LoyaltySettings["discount"];
  entry_threshold: number;
  rupees_per_earned_point: number;
  rupees_per_point: number;
  free_shipping: number;
  filter_colors: LoyaltySettings["filterColors"];
};

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const { data, error } = await supabase.from("loyalty_settings").select("*").maybeSingle();
  if (error || !data) {
    if (error) console.error("getLoyaltySettings:", error.message);
    return DEFAULT_LOYALTY_SETTINGS;
  }
  const row = data as DBLoyaltySettings;
  return {
    discount: row.discount,
    entryThreshold: Number(row.entry_threshold),
    rupeesPerEarnedPoint: Number(row.rupees_per_earned_point),
    rupeesPerPoint: Number(row.rupees_per_point),
    freeShipping: Number(row.free_shipping),
    filterColors: row.filter_colors ?? [],
  };
}

export async function saveLoyaltySettings(s: LoyaltySettings): Promise<void> {
  const { data: existing } = await supabase.from("loyalty_settings").select("id").maybeSingle();
  const row = {
    discount: s.discount,
    entry_threshold: s.entryThreshold,
    rupees_per_earned_point: s.rupeesPerEarnedPoint,
    rupees_per_point: s.rupeesPerPoint,
    free_shipping: s.freeShipping,
    filter_colors: s.filterColors,
  };
  const { error } = existing
    ? await supabase.from("loyalty_settings").update(row).eq("id", existing.id)
    : await supabase.from("loyalty_settings").insert(row);
  if (error) throw new Error(error.message);
}

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
