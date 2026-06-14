import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { productsInCategory, findCategoryBySlug, listCategories } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { SlidersHorizontal, X } from "lucide-react";

export const Route = createFileRoute("/collections/$slug")({
  component: CollectionPage,
  head: ({ params }) => ({ meta: [{ title: `${params.slug.toUpperCase()} — STUDIO/DENY` }] }),
});

type Sort = "new" | "low" | "high" | "name";

function CollectionPage() {
  const { slug } = Route.useParams();
  const [items, setItems] = useState(() => productsInCategory(slug));
  const [mobileFilters, setMobileFilters] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [selSizes, setSelSizes] = useState<string[]>([]);

  useEffect(() => {
    setItems(productsInCategory(slug));
    setSelSizes([]); setMaxPrice(""); setOnSale(false); setInStock(false); setSort("new");
  }, [slug]);

  const cat = useMemo(() => findCategoryBySlug(slug), [slug]);
  const all = listCategories();

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
    <div className="space-y-6">
      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">SORT</div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-background border border-border h-10 px-3 w-full text-mono text-xs">
          <option value="new">NEWEST</option>
          <option value="low">PRICE: LOW → HIGH</option>
          <option value="high">PRICE: HIGH → LOW</option>
          <option value="name">NAME: A → Z</option>
        </select>
      </div>
      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">MAX PRICE (₹)</div>
        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
          placeholder="Any" className="bg-background border border-border h-10 px-3 w-full text-mono text-xs" />
      </div>
      {allSizes.length > 0 && (
        <div>
          <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">SIZE</div>
          <div className="flex flex-wrap gap-1.5">
            {allSizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)}
                className={`min-w-9 h-9 px-2 border text-mono text-xs ${selSizes.includes(s) ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input type="checkbox" checked={onSale} onChange={(e) => setOnSale(e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">ON SALE</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">IN STOCK</span>
        </label>
      </div>
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-mono text-[11px] tracking-widest text-primary hover:underline flex items-center gap-1">
          <X className="size-3" /> CLEAR ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <section className="px-4 md:px-8 mt-4 md:mt-8 pb-16 max-w-7xl mx-auto">
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

      <div className="flex items-center justify-between mb-5 text-mono text-[11px] tracking-widest text-muted-foreground">
        <span>{filtered.length} PIECES</span>
        <button onClick={() => setMobileFilters(true)}
          className="md:hidden inline-flex items-center gap-2 border border-border px-3 h-9 hover:border-primary">
          <SlidersHorizontal className="size-3" /> FILTERS{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden md:block sticky top-32 h-fit">{Filters}</aside>
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-border bg-surface">
              <p className="text-muted-foreground text-sm">No products match.</p>
              <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary">VIEW ALL →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {mobileFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="text-display text-2xl">FILTERS</div>
              <button onClick={() => setMobileFilters(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            {Filters}
            <button onClick={() => setMobileFilters(false)} className="mt-6 w-full bg-primary text-primary-foreground h-12 text-mono text-xs tracking-widest hover:glow-primary">
              SHOW {filtered.length} PIECES
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
