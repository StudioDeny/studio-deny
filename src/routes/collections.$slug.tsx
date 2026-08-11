import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { productsInCategory, findCategoryBySlug, listCategories } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import type { Product } from "@/lib/productsStore";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal, X } from "lucide-react";
import { buildMeta, buildLinks, SITE_URL, collectionJsonLd } from "@/lib/seo";

const COL_DESC: Record<string, string> = {
  men: "Shop men's streetwear from Studio Deny. Heavyweight tees, oversized hoodies, cargos, and outerwear — built for those who move different.",
  women: "Shop women's streetwear from Studio Deny. Premium fabrics, raw silhouettes, and limited drops made for the streets.",
  accessories: "Studio Deny accessories — caps, bags, and essentials that complete the fit without trying too hard.",
  tops: "Shop all tops from Studio Deny. Graphic tees, shirts, and hoodies in heavyweight cotton with a structured, oversized cut.",
  bottoms: "Cargos, joggers, and trousers from Studio Deny. Built for movement, styled for the streets.",
  outerwear: "Studio Deny outerwear. Bombers, windbreakers, and jackets that outlast every season.",
};

export const Route = createFileRoute("/collections/$slug")({
  component: CollectionPage,
  head: ({ params }) => {
    const slug = params.slug;
    const name = slug.replace(/-/g, " ").toUpperCase();
    const desc = COL_DESC[slug] ?? `Shop the ${name} collection from Studio Deny. Limited drops, premium streetwear.`;
    const url = `${SITE_URL}/collections/${slug}`;
    return {
      meta: buildMeta({ title: `${name} Collection — STUDIO DENY`, description: desc, url }),
      links: buildLinks(url),
      scripts: [{ type: "application/ld+json", children: collectionJsonLd(name, url) }],
    };
  },
});

type Sort = "new" | "low" | "high" | "name";

function CollectionPage() {
  const { slug } = Route.useParams();
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 4>(4);
  const [sort, setSort] = useState<Sort>("new");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [selSizes, setSelSizes] = useState<string[]>([]);

  useEffect(() => {
    setLoaded(false);
    productsInCategory(slug).then((r) => { setItems(r); setLoaded(true); });
    setSelSizes([]); setMaxPrice(""); setOnSale(false); setInStock(false); setSort("new"); setFilterOpen(false);
  }, [slug]);

  const [cat, setCat] = useState<Category | undefined>(undefined);
  const [all, setAll] = useState<Category[]>([]);
  useEffect(() => { findCategoryBySlug(slug).then(setCat); }, [slug]);
  useEffect(() => { listCategories().then(setAll); }, []);

  const allSizes = useMemo(() => [...new Set(items.flatMap((p) => p.sizes))], [items]);

  const filtered = useMemo(() => {
    let r = items.slice();
    if (selSizes.length) r = r.filter((p) => p.sizes.some((s) => selSizes.includes(s)));
    if (onSale) r = r.filter((p) => p.compareAt);
    if (inStock) r = r.filter((p) => p.stock > 0);
    if (typeof maxPrice === "number" && maxPrice > 0) r = r.filter((p) => p.price <= maxPrice);
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    else if (sort === "high") r.sort((a, b) => b.price - a.price);
    else if (sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [items, selSizes, onSale, inStock, maxPrice, sort]);

  const toggleSize = (s: string) =>
    setSelSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const activeCount = selSizes.length + (onSale ? 1 : 0) + (inStock ? 1 : 0) + (maxPrice ? 1 : 0);
  const clearAll = () => { setSelSizes([]); setOnSale(false); setInStock(false); setMaxPrice(""); };

  const Filters = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div>
        <div className="text-mono text-[11px] font-bold tracking-[0.25em] text-primary mb-3">SORT</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-background border border-border h-10 px-3 w-full text-mono text-xs font-semibold focus:outline-none focus:border-primary"
        >
          <option value="new">RECOMMENDED / NEWEST</option>
          <option value="low">PRICE: LOW → HIGH</option>
          <option value="high">PRICE: HIGH → LOW</option>
          <option value="name">NAME: A → Z</option>
        </select>
      </div>

      <div>
        <div className="text-mono text-[11px] font-bold tracking-[0.25em] text-primary mb-3">MAX PRICE (₹)</div>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
          placeholder="Any price"
          className="bg-background border border-border h-10 px-3 w-full text-mono text-xs font-semibold focus:outline-none focus:border-primary"
        />
      </div>

      {allSizes.length > 0 && (
        <div>
          <div className="text-mono text-[11px] font-bold tracking-[0.25em] text-primary mb-3">SIZE</div>
          <div className="flex flex-wrap gap-1.5">
            {allSizes.map((s) => (
              <button
                key={s}
                onClick={() => toggleSize(s)}
                className={`min-w-9 h-9 px-2 border text-mono text-xs font-bold transition-all ${
                  selSizes.includes(s)
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:border-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between">
        <div>
          <div className="text-mono text-[11px] font-bold tracking-[0.25em] text-primary mb-3">STATUS</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onSale}
                onChange={(e) => setOnSale(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-mono text-xs font-bold tracking-widest">ON SALE</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-mono text-xs font-bold tracking-widest">IN STOCK</span>
            </label>
          </div>
        </div>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-mono text-[11px] font-bold tracking-widest text-primary hover:underline flex items-center gap-1 mt-4"
          >
            <X className="size-3" /> CLEAR ALL ({activeCount})
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="px-4 md:px-8 mt-4 md:mt-8 pb-16 max-w-[1700px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2">COLLECTION</div>
          <h1 className="text-display text-5xl md:text-7xl">{cat?.name?.toUpperCase() ?? slug.toUpperCase()}.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {all.map((c) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}
              className={`text-mono text-[10px] tracking-widest px-3 h-8 inline-flex items-center border ${c.slug === slug ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}>
              {c.name.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* ALMOST GODS STYLE TOOLBAR ROW */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border text-mono text-xs">
        <span className="text-muted-foreground font-semibold tracking-widest">
          {filtered.length} PIECES
        </span>

        <div className="flex items-center gap-3">
          {/* Grid View Switcher (2-col vs 4-col) */}
          <div className="hidden sm:flex items-center border border-border">
            <button
              type="button"
              aria-label="2 columns view"
              onClick={() => setGridCols(2)}
              className={`px-2.5 py-1.5 transition-colors ${
                gridCols === 2 ? "bg-foreground text-background" : "hover:text-primary"
              }`}
            >
              <div className="w-4 h-4 border border-current flex justify-between p-[1px]">
                <div className="w-[6px] h-full bg-current" />
                <div className="w-[6px] h-full bg-current" />
              </div>
            </button>
            <button
              type="button"
              aria-label="4 columns view"
              onClick={() => setGridCols(4)}
              className={`px-2.5 py-1.5 transition-colors border-l border-border ${
                gridCols === 4 ? "bg-foreground text-background" : "hover:text-primary"
              }`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-[1px] p-[1px]">
                <div className="bg-current" />
                <div className="bg-current" />
                <div className="bg-current" />
                <div className="bg-current" />
              </div>
            </button>
          </div>

          {/* FILTER Button */}
          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 border px-4 py-1.5 font-bold transition-all text-mono text-xs uppercase ${
              filterOpen
                ? "border-primary text-primary bg-primary/5"
                : "border-border hover:border-primary hover:text-primary"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            FILTER {activeCount > 0 ? `(${activeCount})` : ""}
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-xs font-semibold">
            <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">Sort By:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="bg-transparent text-foreground uppercase focus:outline-none cursor-pointer"
            >
              <option value="new">RECOMMENDED</option>
              <option value="low">PRICE: LOW → HIGH</option>
              <option value="high">PRICE: HIGH → LOW</option>
              <option value="name">NAME: A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE FILTER PANEL — ONLY VISIBLE WHEN CLICKED */}
      {filterOpen && (
        <div className="mb-8 border border-border p-6 bg-surface/50 rounded-none shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
          {Filters}
        </div>
      )}

      {/* FULL-WIDTH PRODUCT GRID MATCHING ALMOST GODS */}
      <div>
        {!loaded ? (
          <div className={`grid gap-4 sm:gap-6 ${
            gridCols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          }`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border p-8">
            <p className="text-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">No products match.</p>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-mono text-xs font-bold tracking-widest text-primary hover:underline">
                VIEW ALL →
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${
            gridCols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          }`}>
            {filtered.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
