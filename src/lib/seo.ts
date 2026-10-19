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

// Business details for schema.org markup — copied from Admin → Settings
// (contact, socials, support hours) and the invoice address. Update here if
// the shop moves or the contact details change.
const ORG_ID = `${SITE_URL}/#organization`;
const BUSINESS = {
  name: "Studio Deny",
  email: "thedenyworld@gmail.com",
  phone: "+91-8628921203",
  instagram: "https://www.instagram.com/studio.deny/",
  address: {
    "@type": "PostalAddress",
    streetAddress: "4-46-3, Junction, near the Laxmi Ganapathi Temple, Lawsons Bay Colony, Pedda Waltair",
    addressLocality: "Visakhapatnam",
    addressRegion: "Andhra Pradesh",
    postalCode: "530017",
    addressCountry: "IN",
  },
};

export function orgJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: BUSINESS.name,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: DEFAULT_OG,
    sameAs: [BUSINESS.instagram],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: BUSINESS.email,
      telephone: BUSINESS.phone,
      areaServed: "IN",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "11:00",
        closes: "19:00",
      },
    },
  });
}

/** The Visakhapatnam shop, for local search / Google Maps. */
export function storeJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "@id": `${SITE_URL}/#store`,
    name: BUSINESS.name,
    url: SITE_URL,
    image: DEFAULT_OG,
    logo: `${SITE_URL}/logo.png`,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: BUSINESS.address,
    currenciesAccepted: "INR",
    sameAs: [BUSINESS.instagram],
    parentOrganization: { "@id": ORG_ID },
  });
}

export function websiteJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Studio Deny",
    url: SITE_URL,
    publisher: { "@id": ORG_ID },
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
  hoverImage?: string | null;
  hoverImageType?: "image" | "video";
  gallery?: { url: string; type?: "image" | "video" }[] | null;
}) {
  const url = `${SITE_URL}/product/${p.slug}`;
  // Every photo of the product (no videos), main image first.
  const images = [
    p.image,
    p.hoverImageType === "video" ? null : p.hoverImage,
    ...(p.gallery ?? []).filter((g) => g.type !== "video").map((g) => g.url),
  ].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);
  const onSale = !!p.compare_at && p.compare_at > p.price;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: stripHtml(p.description),
    image: images,
    url,
    brand: { "@type": "Brand", name: p.brand || "Studio Deny" },
    offers: {
      "@type": "Offer",
      url,
      price: p.price,
      priceCurrency: "INR",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        (p.stock ?? 1) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", "@id": ORG_ID, name: BUSINESS.name },
      // On sale: the old price as Google's strikethrough price.
      ...(onSale
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceType: "https://schema.org/StrikethroughPrice",
              price: p.compare_at,
              priceCurrency: "INR",
            },
          }
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
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Studio Deny", url: SITE_URL },
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
