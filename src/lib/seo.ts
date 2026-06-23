export const SITE_URL = "https://studiodeny.com";
export const SITE_NAME = "STUDIO DENY";
export const DEFAULT_OG =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/04e730b6-aeba-4b7e-9dd1-6d17fd50bd0d/id-preview-e756d3f8--448be5e7-43c6-474c-9b04-a818e2322d4d.lovable.app-1778439509223.png";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export function buildMeta({
  title,
  description,
  image = DEFAULT_OG,
  url,
  type = "website",
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

  const tags: MetaTag[] = [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:image", content: image },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@studiodeny" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (url) tags.push({ property: "og:url", content: url });
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
      "https://instagram.com/studiodeny",
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
    description: p.description,
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
