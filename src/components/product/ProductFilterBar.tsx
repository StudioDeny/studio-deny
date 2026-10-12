// Filter bar for the shop and collection pages. Desktop: one row of
// dropdowns (category, size, colour, price, discount, more) plus sort.
// Phones: FILTERS opens a drawer with the same sections. Every change applies
// immediately — there is no "apply" step.
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatINR } from "@/context/CartContext";
import {
  DISCOUNT_STEPS,
  EMPTY_FACTS,
  NEW_IN_DAYS,
  SORTS,
  activeFilterCount,
  loadFilterFacts,
  type FilterFacts,
  type FilterOptions,
  type Filters,
  type Sort,
} from "@/lib/productFilters";

// Live stock for the filters: loaded on mount and re-read whenever the tab
// comes back into view, so sold-out sizes drop out without a reload.
export function useFilterFacts(): FilterFacts {
  const [facts, setFacts] = useState<FilterFacts>(EMPTY_FACTS);
  useEffect(() => {
    let alive = true;
    const load = () => loadFilterFacts().then((f) => { if (alive) setFacts(f); });
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return facts;
}

type ListKey = "sizes" | "colors" | "brands";
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const pieces = (n: number) => `${n} ${n === 1 ? "PIECE" : "PIECES"}`;

const PRICE_BANDS: { min: number | null; max: number | null }[] = [
  { min: null, max: 999 },
  { min: 1000, max: 1999 },
  { min: 2000, max: 2999 },
  { min: 3000, max: null },
];

function priceLabel(min: number | null, max: number | null) {
  if (min == null && max != null) return `UNDER ${formatINR(max + 1)}`;
  if (min != null && max == null) return `${formatINR(min)} & ABOVE`;
  return `${formatINR(min ?? 0)} – ${formatINR(max ?? 0)}`;
}

type Props = {
  filters: Filters;
  options: FilterOptions;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  resultCount: number;
  // First entry of the category dropdown, e.g. "ALL CATEGORIES" / "ALL MEN".
  allCategoriesLabel: string;
  showSearch?: boolean;
  trailing?: ReactNode;
};

export function ProductFilterBar({ filters, options, onChange, onClear, resultCount, allCategoriesLabel, showSearch, trailing }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilterCount(filters);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const toggle = (key: ListKey, v: string) => {
    const cur = filters[key];
    onChange({ [key]: cur.some((x) => same(x, v)) ? cur.filter((x) => !same(x, v)) : [...cur, v] });
  };
  const ctx = { filters, options, onChange, toggle };

  const catName = filters.cat
    ? options.categories.find((c) => same(c.slug, filters.cat!) || same(c.name, filters.cat!))?.name ?? filters.cat
    : null;
  const tags: { key: string; label: string; clear: () => void }[] = [];
  if (filters.q) tags.push({ key: "q", label: `“${filters.q}”`, clear: () => onChange({ q: "" }) });
  if (catName) tags.push({ key: "cat", label: catName, clear: () => onChange({ cat: null }) });
  filters.sizes.forEach((s) => tags.push({ key: `size-${s}`, label: `SIZE ${s}`, clear: () => toggle("sizes", s) }));
  filters.colors.forEach((c) => tags.push({ key: `color-${c}`, label: c, clear: () => toggle("colors", c) }));
  filters.brands.forEach((b) => tags.push({ key: `brand-${b}`, label: b, clear: () => toggle("brands", b) }));
  if (filters.min != null || filters.max != null) tags.push({ key: "price", label: priceLabel(filters.min, filters.max), clear: () => onChange({ min: null, max: null }) });
  if (filters.off) tags.push({ key: "off", label: `${filters.off}%+ OFF`, clear: () => onChange({ off: null }) });
  if (filters.stock) tags.push({ key: "stock", label: "IN STOCK", clear: () => onChange({ stock: false }) });
  if (filters.sale) tags.push({ key: "sale", label: "ON SALE", clear: () => onChange({ sale: false }) });
  if (filters.best) tags.push({ key: "best", label: "BEST SELLERS", clear: () => onChange({ best: false }) });
  if (filters.fresh) tags.push({ key: "fresh", label: "NEW IN", clear: () => onChange({ fresh: false }) });

  const moreCount = filters.brands.length + [filters.stock, filters.sale, filters.best, filters.fresh].filter(Boolean).length;

  return (
    <>
      <div className="flex items-center gap-2 py-3 border-y border-border">
        {/* Phones */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`md:hidden h-9 px-3 shrink-0 border inline-flex items-center gap-2 text-mono text-[11px] tracking-widest ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
        >
          <SlidersHorizontal className="size-3.5" /> FILTERS{active > 0 && ` (${active})`}
        </button>
        <SortSelect value={filters.sort} onChange={(sort) => onChange({ sort })} className="md:hidden min-w-0 flex-1 max-w-[220px]" />

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {showSearch && <SearchBox value={filters.q} onChange={(q) => onChange({ q })} className="w-48" />}
          <CategorySelect {...ctx} allLabel={allCategoriesLabel} />
          <FacetPopover label="SIZE" count={filters.sizes.length} width="w-64"><SizeOptions {...ctx} /></FacetPopover>
          <FacetPopover label="COLOUR" count={filters.colors.length}><ColorOptions {...ctx} /></FacetPopover>
          <FacetPopover label="PRICE" count={filters.min != null || filters.max != null ? 1 : 0}><PriceOptions {...ctx} /></FacetPopover>
          <DiscountSelect {...ctx} />
          <FacetPopover label="MORE" count={moreCount}><MoreOptions {...ctx} /></FacetPopover>
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-mono text-[11px] tracking-widest text-muted-foreground whitespace-nowrap">{pieces(resultCount)}</span>
          {trailing}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-mono text-[10px] tracking-widest text-muted-foreground">SORT</span>
            <SortSelect value={filters.sort} onChange={(sort) => onChange({ sort })} />
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {tags.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={t.clear}
              aria-label={`Remove filter ${t.label}`}
              className="h-7 px-2.5 border border-border bg-background text-mono text-[10px] tracking-widest uppercase inline-flex items-center gap-1.5 hover:border-foreground transition-colors"
            >
              {t.label} <X className="size-3" />
            </button>
          ))}
          <button type="button" onClick={onClear} className="h-7 px-1 text-mono text-[10px] tracking-widest underline underline-offset-4 hover:text-primary">
            CLEAR ALL
          </button>
        </div>
      )}

      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm bg-background border-l border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
                <div className="text-display text-2xl">FILTERS</div>
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters" className="size-10 -mr-2 flex items-center justify-center">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-7" data-lenis-prevent>
                {showSearch && (
                  <Section title="SEARCH">
                    <SearchBox value={filters.q} onChange={(q) => onChange({ q })} className="w-full" />
                  </Section>
                )}
                {options.categories.length > 0 && (
                  <Section title="CATEGORY">
                    <CategorySelect {...ctx} allLabel={allCategoriesLabel} className="w-full" />
                  </Section>
                )}
                <Section title="SIZE"><SizeOptions {...ctx} /></Section>
                <Section title="COLOUR"><ColorOptions {...ctx} /></Section>
                <Section title="PRICE"><PriceOptions {...ctx} /></Section>
                <Section title="DISCOUNT"><DiscountSelect {...ctx} className="w-full" /></Section>
                <Section title="MORE"><MoreOptions {...ctx} /></Section>
              </div>
              <div className="shrink-0 border-t border-border p-4 flex gap-2">
                <button
                  type="button"
                  onClick={onClear}
                  disabled={active === 0}
                  className="h-12 px-4 border border-border text-mono text-xs tracking-widest disabled:opacity-40"
                >
                  CLEAR ALL
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex-1 h-12 bg-primary text-primary-foreground text-mono text-xs tracking-widest"
                >
                  SHOW {pieces(resultCount)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

type Ctx = {
  filters: Filters;
  options: FilterOptions;
  onChange: (patch: Partial<Filters>) => void;
  toggle: (key: ListKey, v: string) => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="text-mono text-[11px] tracking-[0.25em] text-muted-foreground mb-3">{title}</div>
      {children}
    </section>
  );
}

function FacetPopover({ label, count, width = "w-72", children }: { label: string; count: number; width?: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`group h-9 px-3 border inline-flex items-center gap-2 text-mono text-[11px] tracking-widest transition-colors ${count > 0 ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground data-[state=open]:border-foreground"}`}
        >
          {label}{count > 0 && ` (${count})`}
          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={`${width} rounded-none border-border bg-background p-4 shadow-none max-h-[60vh] overflow-y-auto`}
        data-lenis-prevent
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SelectBox({ value, onChange, ariaLabel, active, className = "", children }: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none h-9 w-full pl-3 pr-8 border bg-background text-foreground text-mono text-[11px] tracking-widest uppercase cursor-pointer outline-none truncate transition-colors focus-visible:border-foreground ${active ? "border-foreground font-semibold" : "border-border hover:border-foreground"}`}
      >
        {children}
      </select>
      <ChevronDown className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function SortSelect({ value, onChange, className }: { value: Sort; onChange: (v: Sort) => void; className?: string }) {
  return (
    <SelectBox ariaLabel="Sort by" value={value} onChange={(v) => onChange(v as Sort)} className={className}>
      {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
    </SelectBox>
  );
}

function SearchBox({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search drops…"
        aria-label="Search products"
        className="h-9 w-full pl-8 pr-3 border border-border bg-background text-sm outline-none focus:border-foreground"
      />
    </div>
  );
}

function CategorySelect({ filters, options, onChange, allLabel, className }: Ctx & { allLabel: string; className?: string }) {
  if (options.categories.length === 0) return null;
  const match = filters.cat ? options.categories.find((c) => same(c.slug, filters.cat!) || same(c.name, filters.cat!)) : undefined;
  const value = match?.slug ?? filters.cat ?? "";
  return (
    <SelectBox ariaLabel="Category" value={value} onChange={(v) => onChange({ cat: v || null })} active={!!filters.cat} className={className}>
      <option value="">{allLabel}</option>
      {options.categories.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.depth ? "   ↳ " : ""}{c.name} ({c.count})
        </option>
      ))}
      {filters.cat && !match && <option value={filters.cat}>{filters.cat}</option>}
    </SelectBox>
  );
}

function DiscountSelect({ filters, onChange, className }: Ctx & { className?: string }) {
  const steps = filters.off && !DISCOUNT_STEPS.includes(filters.off) ? [...DISCOUNT_STEPS, filters.off].sort((a, b) => a - b) : DISCOUNT_STEPS;
  return (
    <SelectBox ariaLabel="Discount" value={String(filters.off ?? "")} onChange={(v) => onChange({ off: v ? Number(v) : null })} active={!!filters.off} className={className}>
      <option value="">ANY DISCOUNT</option>
      {steps.map((d) => <option key={d} value={d}>{d}% OFF OR MORE</option>)}
    </SelectBox>
  );
}

function CheckRow({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick} className="group w-full flex items-center gap-3 py-1.5 text-left">
      <span
        className={`size-4 shrink-0 border flex items-center justify-center transition-colors ${checked ? "bg-foreground border-foreground text-background" : "border-foreground/40 group-hover:border-foreground"}`}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-xs text-muted-foreground">{children}</p>;

function SizeOptions({ filters, options, toggle }: Ctx) {
  const shown = [...options.sizes, ...filters.sizes.filter((s) => !options.sizes.some((o) => same(o, s)))];
  if (shown.length === 0) return <Empty>No sizes in stock right now.</Empty>;
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {shown.map((s) => {
        const on = filters.sizes.some((x) => same(x, s));
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => toggle("sizes", s)}
            className={`h-9 px-1 border text-mono text-xs uppercase transition-colors ${on ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"}`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

function ColorOptions({ filters, options, toggle }: Ctx) {
  const shown = [
    ...options.colors,
    ...filters.colors.filter((c) => !options.colors.some((o) => same(o.name, c))).map((name) => ({ name, hex: "transparent" })),
  ];
  if (shown.length === 0) return <Empty>No colours in stock right now.</Empty>;
  return (
    <div>
      {shown.map((c) => (
        <CheckRow key={c.name} checked={filters.colors.some((x) => same(x, c.name))} onClick={() => toggle("colors", c.name)}>
          <span className="size-4 shrink-0 border border-border" style={{ backgroundColor: c.hex }} />
          <span className="text-sm">{c.name}</span>
        </CheckRow>
      ))}
    </div>
  );
}

function PriceOptions({ filters, options, onChange }: Ctx) {
  const bands = PRICE_BANDS.filter((b) => (b.min ?? 0) <= options.priceMax && (b.max ?? Infinity) >= options.priceMin);
  return (
    <div>
      {bands.map((b) => {
        const on = filters.min === b.min && filters.max === b.max;
        return (
          <CheckRow key={`${b.min}-${b.max}`} checked={on} onClick={() => onChange(on ? { min: null, max: null } : { min: b.min, max: b.max })}>
            <span className="text-sm">{priceLabel(b.min, b.max)}</span>
          </CheckRow>
        );
      })}
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-3 mb-1.5">OR ENTER YOUR OWN (₹)</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="Minimum price"
          placeholder={`Min ${options.priceMin}`}
          value={filters.min ?? ""}
          onChange={(e) => onChange({ min: e.target.value ? Math.max(0, Number(e.target.value)) || null : null })}
          className="h-9 w-full border border-border bg-background px-2 text-sm outline-none focus:border-foreground"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="Maximum price"
          placeholder={`Max ${options.priceMax}`}
          value={filters.max ?? ""}
          onChange={(e) => onChange({ max: e.target.value ? Math.max(0, Number(e.target.value)) || null : null })}
          className="h-9 w-full border border-border bg-background px-2 text-sm outline-none focus:border-foreground"
        />
      </div>
    </div>
  );
}

function MoreOptions({ filters, options, onChange, toggle }: Ctx) {
  return (
    <div>
      <CheckRow checked={filters.stock} onClick={() => onChange({ stock: !filters.stock })}><span className="text-sm">In stock only</span></CheckRow>
      <CheckRow checked={filters.sale} onClick={() => onChange({ sale: !filters.sale })}><span className="text-sm">On sale</span></CheckRow>
      <CheckRow checked={filters.best} onClick={() => onChange({ best: !filters.best })}><span className="text-sm">Best sellers</span></CheckRow>
      <CheckRow checked={filters.fresh} onClick={() => onChange({ fresh: !filters.fresh })}><span className="text-sm">New in (last {NEW_IN_DAYS} days)</span></CheckRow>
      {options.brands.length > 1 && (
        <>
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-4 mb-1.5">BRAND</div>
          {options.brands.map((b) => (
            <CheckRow key={b} checked={filters.brands.some((x) => same(x, b))} onClick={() => toggle("brands", b)}>
              <span className="text-sm">{b}</span>
            </CheckRow>
          ))}
        </>
      )}
    </div>
  );
}
