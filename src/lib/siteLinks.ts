// Where admin-set buttons can point: pages, shop shortcuts, categories,
// products, home page sections, or an outside link. The admin picks from
// these (components/admin/LinkPicker); the storefront opens them with
// components/ui/SiteLink, which understands ?filters and #sections.
import { listCategories, type Category } from "./catalog";
import { listAllAdminProducts, type Product } from "./productsStore";

export type LinkOption = { label: string; href: string };

export const SITE_PAGES: LinkOption[] = [
  { label: "Home", href: "/" },
  { label: "Shop — all products", href: "/shop" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "About", href: "/about" },
  { label: "Rewards (Deny World)", href: "/rewards" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Size guide", href: "/size-guide" },
  { label: "Track order", href: "/track-order" },
  { label: "Returns & exchanges", href: "/returns" },
  { label: "Couriers", href: "/couriers" },
  { label: "Refer a friend", href: "/refer" },
  { label: "Collaborators", href: "/collaborators" },
  { label: "Collaborators — Art", href: "/collaborators/art" },
  { label: "Collaborators — Dance", href: "/collaborators/dance" },
  { label: "Collaborators — Models", href: "/collaborators/models" },
  { label: "Collaborators — Influencers", href: "/collaborators/influencers" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Bag", href: "/cart" },
  { label: "My account", href: "/account" },
  { label: "Policies", href: "/policies" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms & conditions", href: "/terms" },
];

// The shop page with a filter or sort already on.
export const SHOP_SHORTCUTS: LinkOption[] = [
  { label: "Best sellers", href: "/shop?best=1" },
  { label: "On sale", href: "/shop?sale=1" },
  { label: "New in (last 30 days)", href: "/shop?new=1" },
  { label: "In stock only", href: "/shop?stock=1" },
  { label: "Under ₹999", href: "/shop?max=999" },
  { label: "₹1,000 – ₹1,999", href: "/shop?min=1000&max=1999" },
  { label: "₹2,000 and above", href: "/shop?min=2000" },
  { label: "Biggest discount first", href: "/shop?sort=discount" },
  { label: "Price: low to high", href: "/shop?sort=low" },
  { label: "Price: high to low", href: "/shop?sort=high" },
];

// Home page sections (website_sections.section_type). The home page gives
// each one the id sectionAnchor(type); "/#<anchor>" scrolls to it.
export const HOME_SECTIONS: { type: string; label: string }[] = [
  { type: "marquee", label: "Scrolling ticker" },
  { type: "gender_split", label: "Men / Women / Accessories cards" },
  { type: "category_carousel", label: "Category carousel" },
  { type: "popular_now", label: "Popular now" },
  { type: "new_arrivals", label: "New arrivals" },
  { type: "fabric_tabs", label: "Fabric tabs" },
  { type: "lookbook", label: "Lookbook" },
  { type: "why_us", label: "Why us" },
  { type: "denyspace", label: "Deny Space" },
  { type: "influencer_picks", label: "Influencer picks" },
  { type: "motion_picture", label: "Motion picture" },
  { type: "community", label: "Community" },
  { type: "testimonials", label: "Testimonials" },
  { type: "contact_support", label: "Contact & support" },
  { type: "newsletter", label: "Newsletter" },
  { type: "faq", label: "FAQ" },
];
export const sectionAnchor = (type: string) => type.replace(/_/g, "-");
export const HOME_SECTION_LINKS: LinkOption[] = HOME_SECTIONS.map((s) => ({ label: s.label, href: `/#${sectionAnchor(s.type)}` }));

export const isOutsideLink = (href: string) => /^(https?:|mailto:|tel:|\/\/)/i.test(href.trim());

// Internal href → router pieces. Numbers in the query become numbers so the
// URL reads ?sale=1 (not ?sale="1").
export function routerTarget(href: string): { to: string; search?: Record<string, string | number>; hash?: string } {
  const u = new URL(href.trim() || "/", "https://studiodeny.local");
  const search: Record<string, string | number> = {};
  u.searchParams.forEach((v, k) => { search[k] = /^\d+$/.test(v) ? Number(v) : v; });
  return {
    to: u.pathname || "/",
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: u.hash ? u.hash.slice(1) : undefined,
  };
}

export type LinkKind = "page" | "shop" | "category" | "product" | "section" | "outside";

// Which picker tab an existing href belongs to.
export function linkKindOf(href: string): LinkKind {
  const h = href.trim();
  if (!h) return "page";
  if (SITE_PAGES.some((o) => o.href === h)) return "page";
  if (SHOP_SHORTCUTS.some((o) => o.href === h)) return "shop";
  if (HOME_SECTION_LINKS.some((o) => o.href === h)) return "section";
  if (/^\/collections\/[^/?#]+$/.test(h)) return "category";
  if (/^\/product\/[^/?#]+$/.test(h)) return "product";
  return "outside";
}

// Categories + products for the pickers, loaded once per admin visit.
let targets: Promise<{ categories: Category[]; products: Product[] }> | null = null;
export function loadLinkTargets() {
  targets ??= Promise.all([listCategories(), listAllAdminProducts()]).then(([categories, products]) => ({
    categories,
    products: products.sort((a, b) => a.name.localeCompare(b.name)),
  }));
  return targets;
}
