// Loyalty / discount + general admin settings (localStorage-backed).
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
  invoice: InvoiceTemplate;
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
  invoice: {
    brandName: "STUDIO DENY",
    tagline: "STREETWEAR · MUMBAI · INDIA",
    gstin: "27ABCDE1234F1Z5",
    email: "support@studiodeny.in",
    phone: "+91 98765 43210",
    address: "Studio Deny HQ, Kala Ghoda, Mumbai 400001, India",
    accent: "#0a0a0a",
    terms:
      "All sales final after 7 days. Returns accepted within 7 days of delivery in unworn condition with tags attached. Subject to Mumbai jurisdiction.",
    footer: "THANK YOU FOR REPPING STUDIO DENY",
    signatory: "Studio Deny",
    taxLabel: "TAX INVOICE",
  },
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
      invoice: { ...DEFAULTS.invoice, ...(raw.invoice || {}) },
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
