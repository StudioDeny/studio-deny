// CMS storage for homepage sections that haven't been moved to Supabase yet.
const KEY = "sd_home_sections_v1";

export type HomeSections = {
  contactSupport: {
    enabled: boolean;
    email: string;
    whatsapp: string;
    hours: string;
  };
};

export const HOME_DEFAULTS: HomeSections = {
  contactSupport: {
    enabled: true,
    email: "support@studiodeny.in",
    whatsapp: "+91 98765 43210",
    hours: "Mon–Sat, 10am–7pm IST",
  },
};

export function getHomeSections(): HomeSections {
  if (typeof window === "undefined") return HOME_DEFAULTS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") || {};
    return {
      ...HOME_DEFAULTS,
      ...raw,
      contactSupport: { ...HOME_DEFAULTS.contactSupport, ...(raw.contactSupport || {}) },
    };
  } catch {
    return HOME_DEFAULTS;
  }
}

export function saveHomeSections(s: HomeSections) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}
