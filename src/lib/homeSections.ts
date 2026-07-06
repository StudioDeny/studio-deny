// CMS storage for homepage sections (localStorage-backed).
const KEY = "sd_home_sections_v1";

export type InfluencerItem = {
  id: string;
  name: string;
  handle: string;
  image: string;
  productSlug: string;
  quote: string;
};

export type LookbookItem = {
  id: string;
  image: string;
  title: string;
};

export type CommunityItem = {
  id: string;
  image: string;
  handle: string;
};

export type HomeSections = {
  bestSellers: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    productSlugs: string[];
  };
  influencerPicks: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    items: InfluencerItem[];
  };
  lookBook: {
    enabled: boolean;
    items: LookbookItem[];
  };
  community: {
    enabled: boolean;
    title: string;
    subtitle: string;
    items: CommunityItem[];
  };
  contactSupport: {
    enabled: boolean;
    email: string;
    whatsapp: string;
    hours: string;
  };
};

export const HOME_DEFAULTS: HomeSections = {
  bestSellers: {
    enabled: true,
    eyebrow: "MOST WANTED",
    title: "BEST SELLERS",
    productSlugs: [],
  },
  influencerPicks: {
    enabled: true,
    eyebrow: "AS SEEN ON",
    title: "INFLUENCER PICKS",
    items: [],
  },
  lookBook: {
    enabled: true,
    items: [
      { id: "1", image: "https://studio-deny-demo.vercel.app/assets/001_18.JPG", title: "SS26\nCOLLECTION" },
      { id: "2", image: "https://studio-deny-demo.vercel.app/assets/001_13.JPG", title: "URBAN\nESSENTIALS" },
      { id: "3", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200", title: "STREET\nESSENTIALS" },
    ],
  },
  community: {
    enabled: true,
    title: "WORN BY OUR COMMUNITY",
    subtitle: "Real people, real fits. Tag us @studiodeny",
    items: [],
  },
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
      bestSellers: { ...HOME_DEFAULTS.bestSellers, ...(raw.bestSellers || {}) },
      influencerPicks: { ...HOME_DEFAULTS.influencerPicks, ...(raw.influencerPicks || {}) },
      lookBook: { ...HOME_DEFAULTS.lookBook, ...(raw.lookBook || {}) },
      community: { ...HOME_DEFAULTS.community, ...(raw.community || {}) },
      contactSupport: { ...HOME_DEFAULTS.contactSupport, ...(raw.contactSupport || {}) },
    };
  } catch {
    return HOME_DEFAULTS;
  }
}

export function saveHomeSections(s: HomeSections) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}
