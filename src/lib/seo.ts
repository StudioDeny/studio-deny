import { stripHtml } from "@/lib/richText";

export const SITE_URL = "https://www.studiodeny.com";
export const SITE_NAME = "STUDIO DENY";
// public/og-image.png — same image index.html gives link previews.
export const DEFAULT_OG = "https://www.studiodeny.com/og-image.png?v=1";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export function buildMeta({
  title,
  description,
  noIndex = false,
}: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
}): MetaTag[] {
  const fullTitle = title.includes("STUDIO DENY")
    ? title
    : `${title} — STUDIO DENY`;

  // image/url/type are accepted for callers but unused: og/twitter tags live
  // in index.html (link-preview apps don't run the page's JS).
  const tags: MetaTag[] = [
    { title: fullTitle },
    { name: "description", content: description },
  ];

  if (noIndex) tags.push({ name: "robots", content: "noindex, nofollow" });

  return tags;
}

export function buildLinks(canonical?: string) {
  if (!canonical) return [];
  return [{ rel: "canonical", href: canonical }];
}

export function orgJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Studio Deny",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://www.instagram.com/studio.deny?stkn=ZDNlZDc0MzIxNw==",
      "https://twitter.com/studiodeny",
      "https://facebook.com/studiodeny",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@studiodeny.com",
      contactType: "customer support",
    },
  });
}

export function websiteJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Studio Deny",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

export function productJsonLd(p: {
  name: string;
  description: string;
  image: string;
  price: number;
  slug: string;
  brand?: string | null;
  stock?: number;
  compare_at?: number | null;
}) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: stripHtml(p.description),
    image: p.image,
    url: `${SITE_URL}/product/${p.slug}`,
    brand: { "@type": "Brand", name: p.brand || "Studio Deny" },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "INR",
      availability:
        (p.stock ?? 1) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/product/${p.slug}`,
      ...(p.compare_at && p.compare_at > p.price
        ? { highPrice: p.compare_at }
        : {}),
    },
  });
}

export function collectionJsonLd(name: string, url: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    isPartOf: { "@type": "WebSite", name: "Studio Deny", url: SITE_URL },
  });
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
}
