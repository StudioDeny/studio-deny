// Loyalty / discount + general admin settings (localStorage-backed).
const KEY = "sd_settings_v1";

export type LoyaltySettings = {
  discount: { ROOKIE: number; RUNNER: number; RIOT: number; LEGEND: number };
  pointsPer100: number;
  rupeesPerPoint: number;
  freeShipping: number;
  invoice: InvoiceTemplate;
  arrivals: ArrivalsConfig;
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

export type ArrivalsConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  productSlugs: string[]; // up to 4
};

const DEFAULTS: LoyaltySettings = {
  discount: { ROOKIE: 0, RUNNER: 5, RIOT: 10, LEGEND: 15 },
  pointsPer100: 10,
  rupeesPerPoint: 1,
  freeShipping: 2499,
  invoice: {
    brandName: "STUDIO/DENY",
    tagline: "STREETWEAR · MUMBAI · INDIA",
    gstin: "27ABCDE1234F1Z5",
    email: "support@studiodeny.in",
    phone: "+91 98765 43210",
    address: "Studio Deny HQ, Kala Ghoda, Mumbai 400001, India",
    accent: "#0a0a0a",
    terms:
      "All sales final after 7 days. Returns accepted within 7 days of delivery in unworn condition with tags attached. Subject to Mumbai jurisdiction.",
    footer: "THANK YOU FOR REPPING STUDIO/DENY",
    signatory: "Studio/Deny",
    taxLabel: "TAX INVOICE",
  },
  arrivals: {
    enabled: true,
    eyebrow: "FRESH OFF THE PRESS",
    title: "NEW ARRIVALS",
    subtitle: "This week's drop — limited units, raw cuts, made for the street.",
    ctaLabel: "SHOP THE DROP",
    productSlugs: [],
  },
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
      arrivals: { ...DEFAULTS.arrivals, ...(raw.arrivals || {}) },
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
