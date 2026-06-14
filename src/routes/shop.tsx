import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { categories, type Category, type Product } from "@/lib/products";
import { listProducts } from "@/lib/productsStore";
import { ProductCard } from "@/components/product/ProductCard";
import { X, SlidersHorizontal, Search as SearchIcon, ChevronDown } from "lucide-react";

type Search = {
  cat?: string;
  sale?: string;
  q?: string;
  sort?: string;
  min?: number;
  max?: number;
  sizes?: string;
  colors?: string;
  stock?: string;
  page?: string;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sale: typeof s.sale === "string" ? s.sale : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    min: typeof s.min === "string" ? Number(s.min) || undefined : (s.min as number | undefined),
    max: typeof s.max === "string" ? Number(s.max) || undefined : (s.max as number | undefined),
    sizes: typeof s.sizes === "string" ? s.sizes : undefined,
    colors: typeof s.colors === "string" ? s.colors : undefined,
    stock: typeof s.stock === "string" ? s.stock : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
  }),
  component: Shop,
  head: () => ({
    meta: [
      { title: "Shop — STUDIO/DENY" },
      { name: "description", content: "Shop the latest streetwear drops from Studio Deny. Hoodies, tees, cargos, outerwear — all built in the dark." },
    ],
  }),
});

const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "One Size"];
type Sort = "new" | "low" | "high" | "name";
const SORTS: { v: Sort; label: string }[] = [
  { v: "new", label: "NEWEST" },
  { v: "low", label: "PRICE: LOW → HIGH" },
  { v: "high", label: "PRICE: HIGH → LOW" },
  { v: "name", label: "NAME: A → Z" },
];

const ITEMS_PER_PAGE = 12;

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => setProducts(listProducts()), []);

  const cat = ((categories as readonly string[]).includes(search.cat ?? "") ? search.cat : "All") as Category;
  const q = search.q ?? "";
  const sort = (search.sort as Sort) || "new";
  const sale = search.sale === "1";
  const inStock = search.stock === "1";
  const selectedSizes = (search.sizes?.split(",").filter(Boolean)) ?? [];
  const selectedColors = (search.colors?.split(",").filter(Boolean)) ?? [];
  const page = Number(search.page) || 1;

  const [minBound, maxBound] = useMemo(() => {
    if (!products.length) return [0, 10000];
    const prices = products.map((p) => p.price);
    return [Math.floor(Math.min(...prices) / 100) * 100, Math.ceil(Math.max(...prices) / 100) * 100];
  }, [products]);
  const min = search.min ?? minBound;
  const max = search.max ?? maxBound;

  const allColors = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => m.set(c.name, c.hex)));
    return [...m.entries()].map(([name, hex]) => ({ name, hex }));
  }, [products]);

  const setS = (patch: Partial<Search>) =>
    navigate({ search: (prev: Search) => {
      const next = { ...prev, ...patch, page: patch.page || undefined };
      // if filters changed but page didn't, reset to page 1
      if (!patch.page && page !== 1) next.page = undefined;
      
      Object.keys(next).forEach((k) => {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined || v === null) delete (next as Record<string, unknown>)[k];
      });
      return next;
    }});

  const toggleArr = (key: "sizes" | "colors", v: string) => {
    const list = key === "sizes" ? selectedSizes : selectedColors;
    const next = list.includes(v) ? list.filter((x: string) => x !== v) : [...list, v];
    setS({ [key]: next.length ? next.join(",") : undefined, page: undefined });
  };

  const filteredItems = useMemo(() => {
    let r = products.slice();
    if (cat !== "All") r = r.filter((p) => p.category === cat);
    if (q) {
      const t = q.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t) || p.category.toLowerCase().includes(t));
    }
    if (selectedSizes.length) r = r.filter((p) => p.sizes.some((s) => selectedSizes.includes(s)));
    if (selectedColors.length) r = r.filter((p) => p.colors.some((c) => selectedColors.includes(c.name)));
    if (sale) r = r.filter((p) => p.compareAt);
    if (inStock) r = r.filter((p) => p.stock > 0);
    r = r.filter((p) => p.price >= min && p.price <= max);
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    else if (sort === "high") r.sort((a, b) => b.price - a.price);
    else if (sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [products, cat, q, selectedSizes, selectedColors, sale, inStock, min, max, sort]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const items = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  const activeCount =
    (cat !== "All" ? 1 : 0) + selectedSizes.length + selectedColors.length +
    (sale ? 1 : 0) + (inStock ? 1 : 0) + (q ? 1 : 0) +
    (search.min !== undefined || search.max !== undefined ? 1 : 0);

  const clearAll = () => navigate({ search: {} });

  const Filters = (
    <div className="space-y-7 text-sm">
      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">SEARCH</div>
        <div className="relative">
          <SearchIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setS({ q: e.target.value || undefined, page: undefined })}
            placeholder="search drops…"
            className="bg-background border border-border h-10 pl-9 pr-3 w-full text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">CATEGORY</div>
        <ul className="space-y-1.5">
          {categories.map((c) => (
            <li key={c}>
              <button
                onClick={() => setS({ cat: c === "All" ? undefined : c, page: undefined })}
                className={`text-left w-full hover:text-primary transition-colors ${cat === c ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                {c.toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">PRICE (₹)</div>
        <div className="flex items-center gap-2">
          <input
            type="number" value={min} min={minBound} max={max}
            onChange={(e) => setS({ min: Number(e.target.value) || undefined, page: undefined })}
            className="bg-background border border-border h-9 px-2 w-full text-mono text-xs"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number" value={max} min={min} max={maxBound}
            onChange={(e) => setS({ max: Number(e.target.value) || undefined, page: undefined })}
            className="bg-background border border-border h-9 px-2 w-full text-mono text-xs"
          />
        </div>
        <input
          type="range" min={minBound} max={maxBound} step={100} value={max}
          onChange={(e) => setS({ max: Number(e.target.value), page: undefined })}
          className="w-full mt-3 accent-primary"
        />
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-1">UP TO ₹{max}</div>
      </div>

      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">SIZE</div>
        <div className="flex flex-wrap gap-1.5">
          {allSizes.map((s) => (
            <button
              key={s}
              onClick={() => toggleArr("sizes", s)}
              className={`min-w-9 h-9 px-2 border text-mono text-xs transition-colors ${selectedSizes.includes(s) ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {allColors.length > 0 && (
        <div>
          <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">COLOR</div>
          <div className="flex flex-wrap gap-2">
            {allColors.map((c) => {
              const on = selectedColors.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleArr("colors", c.name)}
                  title={c.name}
                  className={`size-7 rounded-full border-2 transition ${on ? "border-primary scale-110" : "border-border hover:border-foreground"}`}
                  style={{ background: c.hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">DEALS</div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input type="checkbox" checked={sale} onChange={(e) => setS({ sale: e.target.checked ? "1" : undefined, page: undefined })} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">ON SALE ONLY</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={(e) => setS({ stock: e.target.checked ? "1" : undefined, page: undefined })} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">IN STOCK</span>
        </label>
      </div>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="text-mono text-[11px] tracking-widest text-primary hover:underline flex items-center gap-1"
        >
          <X className="size-3" /> CLEAR ALL ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 pb-24">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-mono text-primary mb-2" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>◢ ALL DROPS</div>
          <h1 className="text-display leading-none" style={{ fontSize: "clamp(52px, 8vw, 96px)" }}>SHOP</h1>
        </div>
        <div className="flex items-center gap-3 text-mono text-[11px] tracking-widest text-muted-foreground">
          <span>{filteredItems.length} PIECES</span>
          <button
            onClick={() => setMobileFilters(true)}
            className="md:hidden inline-flex items-center gap-2 border border-border px-3 h-9 hover:border-primary"
          >
            <SlidersHorizontal className="size-3" /> FILTERS {activeCount > 0 && `(${activeCount})`}
          </button>
          <SortDropdown value={sort} onChange={(v) => setS({ sort: v === "new" ? undefined : v, page: undefined })} />
        </div>
      </div>

      <div className="grid md:grid-cols-[230px_1fr] gap-8">
        <aside className="hidden md:block sticky top-32 h-fit max-h-[calc(100vh-160px)] overflow-y-auto pr-2 custom-scrollbar">
          {Filters}
        </aside>

        <div>
          {items.length === 0 ? (
            <div className="py-32 text-center">
              <div className="text-display text-muted-foreground/30" style={{ fontSize: "clamp(48px, 8vw, 96px)" }}>
                NOTHING
              </div>
              <p className="text-mono text-muted-foreground mt-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
                TRY ANOTHER FILTER COMBO
              </p>
              <button
                onClick={clearAll}
                className="mt-6 border border-border px-6 py-2.5 text-mono text-muted-foreground hover:border-primary hover:text-primary transition-colors inline-block"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                {items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-20 border-t border-border pt-10 flex items-center justify-between">
                  <button
                    disabled={page === 1}
                    onClick={() => { setS({ page: page > 2 ? String(page - 1) : undefined }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-20 hover:text-primary transition-colors"
                  >
                    ← PREV
                  </button>
                  <div className="flex gap-4">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setS({ page: i === 0 ? undefined : String(i + 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`text-mono text-[11px] tracking-widest ${page === i + 1 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => { setS({ page: String(page + 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-20 hover:text-primary transition-colors"
                  >
                    NEXT →
                  </button>
                </div>
              )}
            </>
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
              SHOW {items.length} PIECES
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SortDropdown({ value, onChange }: { value: Sort; onChange: (v: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.v === value) ?? SORTS[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="bg-surface border border-border px-3 h-9 inline-flex items-center gap-2 text-foreground hover:border-primary"
      >
        {current.label}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
      </button>
      {open && (
        <ul className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border min-w-[220px] shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {SORTS.map((s) => (
            <li key={s.v}>
              <button
                onMouseDown={() => { onChange(s.v); setOpen(false); }}
                className={`w-full text-left px-3 h-9 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground ${s.v === value ? "text-primary" : ""}`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
