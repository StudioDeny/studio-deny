// Where a button goes, picked instead of typed: a page, a shop shortcut, a
// category, a product, a home page section, or (last) an outside link.
// Stores the same href string the fields always stored.
import { useEffect, useState } from "react";
import type { Category } from "@/lib/catalog";
import type { Product } from "@/lib/productsStore";
import {
  HOME_SECTION_LINKS, SHOP_SHORTCUTS, SITE_PAGES, linkKindOf, loadLinkTargets, type LinkKind,
} from "@/lib/siteLinks";

const KINDS: { kind: LinkKind; label: string }[] = [
  { kind: "page", label: "Page" },
  { kind: "shop", label: "Shop shortcut" },
  { kind: "category", label: "Category" },
  { kind: "product", label: "Product" },
  { kind: "section", label: "Home page section" },
  { kind: "outside", label: "Outside link" },
];

const sel = "bg-background border border-border h-10 px-2 text-sm w-full min-w-0";

// allowNone: the field is optional (e.g. a second button) — offers "No link".
export function LinkPicker({ value, onChange, allowNone }: { value: string; onChange: (href: string) => void; allowNone?: boolean }) {
  const [kind, setKind] = useState<LinkKind | "none">(() => (allowNone && !(value ?? "").trim() ? "none" : linkKindOf(value ?? "")));
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    loadLinkTargets().then((t) => { setCats(t.categories); setProducts(t.products); });
  }, []);

  // Switching type picks that type's first choice, so the link is never blank.
  const switchKind = (k: LinkKind | "none") => {
    setKind(k);
    if (k === "none") onChange("");
    else if (k === "page") onChange(SITE_PAGES[1].href);
    else if (k === "shop") onChange(SHOP_SHORTCUTS[0].href);
    else if (k === "section") onChange(HOME_SECTION_LINKS[0].href);
    else if (k === "category") onChange(cats[0] ? `/collections/${cats[0].slug}` : "");
    else if (k === "product") onChange(products[0] ? `/product/${products[0].slug}` : "");
    else onChange("");
  };

  const roots = cats.filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId)).sort((a, b) => a.name.localeCompare(b.name));
  const shownProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase()) || `/product/${p.slug}` === value)
    : products;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,170px)_minmax(0,1fr)] gap-2">
      <select value={kind} onChange={(e) => switchKind(e.target.value as LinkKind | "none")} className={sel} aria-label="Link type">
        {allowNone && <option value="none">No link</option>}
        {KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
      </select>
      {kind === "none" && <div className="text-xs text-muted-foreground self-center">No button link</div>}

      {kind === "page" && (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={sel} aria-label="Page">
          {!SITE_PAGES.some((o) => o.href === value) && <option value={value}>Choose a page…</option>}
          {SITE_PAGES.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
        </select>
      )}

      {kind === "shop" && (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={sel} aria-label="Shop shortcut">
          {!SHOP_SHORTCUTS.some((o) => o.href === value) && <option value={value}>Choose a shortcut…</option>}
          {SHOP_SHORTCUTS.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
        </select>
      )}

      {kind === "section" && (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={sel} aria-label="Home page section">
          {!HOME_SECTION_LINKS.some((o) => o.href === value) && <option value={value}>Choose a section…</option>}
          {HOME_SECTION_LINKS.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
        </select>
      )}

      {kind === "category" && (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={sel} aria-label="Category">
          {!cats.some((c) => `/collections/${c.slug}` === value) && <option value={value}>{cats.length ? "Choose a category…" : "Loading…"}</option>}
          {roots.flatMap((root) => [
            <option key={root.id} value={`/collections/${root.slug}`}>{root.name}</option>,
            ...cats
              .filter((c) => c.parentId === root.id)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => <option key={c.id} value={`/collections/${c.slug}`}>{"   ↳ "}{c.name}</option>),
          ])}
        </select>
      )}

      {kind === "product" && (
        <div className="grid grid-cols-1 gap-2 min-w-0">
          <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products" className={sel} />
          <select value={value} onChange={(e) => onChange(e.target.value)} className={sel} aria-label="Product">
            {!products.some((p) => `/product/${p.slug}` === value) && <option value={value}>{products.length ? "Choose a product…" : "Loading…"}</option>}
            {shownProducts.map((p) => (
              <option key={p.slug} value={`/product/${p.slug}`}>{p.name}{p.is_active === false ? " (hidden)" : ""}</option>
            ))}
          </select>
        </div>
      )}

      {kind === "outside" && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://instagram.com/…"
          className={sel}
          aria-label="Outside link"
        />
      )}
    </div>
  );
}
