// Shop + collection filters: one filter model for both pages, applied to live
// data — sizes, colours and stock come from product_variants (the stock source
// of truth), category membership from product_categories. A size or colour
// filter only matches pieces that can actually be bought in that size/colour.
import { supabase } from "./supabase";
import type { Product } from "./productsStore";
import type { Category } from "./catalog";
import { listAllSizes, sortSizes, type Size } from "./sizes";
import { stripHtml } from "./richText";

export type Sort = "new" | "low" | "high" | "discount" | "name";
export const SORTS: { v: Sort; label: string }[] = [
  { v: "new", label: "NEWEST" },
  { v: "low", label: "PRICE: LOW → HIGH" },
  { v: "high", label: "PRICE: HIGH → LOW" },
  { v: "discount", label: "BIGGEST DISCOUNT" },
  { v: "name", label: "NAME: A → Z" },
];
export const DISCOUNT_STEPS = [10, 20, 30, 40, 50];
export const NEW_IN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── URL ⇄ filters ────────────────────────────────────────────────────
// Filters live in the URL on both pages, so a filtered view survives a
// refresh, the back button and being shared.
export type FilterSearch = {
  cat?: string;
  sizes?: string;
  colors?: string;
  brands?: string;
  min?: number;
  max?: number;
  off?: number;
  sale?: number;
  best?: number;
  new?: number;
  stock?: number;
  q?: string;
  sort?: string;
  page?: number;
};

// The router JSON-parses search values, so "30" or "1" can arrive as numbers.
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "") || undefined;
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const flag = (v: unknown) => (v === 1 || v === "1" || v === true || v === "true" ? 1 : undefined);

export function validateFilterSearch(s: Record<string, unknown>): FilterSearch {
  return {
    cat: str(s.cat),
    sizes: str(s.sizes),
    colors: str(s.colors),
    brands: str(s.brands),
    min: num(s.min),
    max: num(s.max),
    off: num(s.off),
    sale: flag(s.sale),
    best: flag(s.best),
    new: flag(s.new),
    stock: flag(s.stock),
    q: str(s.q),
    sort: str(s.sort),
    page: num(s.page),
  };
}

export type Filters = {
  cat: string | null;
  sizes: string[];
  colors: string[];
  brands: string[];
  min: number | null;
  max: number | null;
  off: number | null;
  sale: boolean;
  best: boolean;
  fresh: boolean;
  stock: boolean;
  q: string;
  sort: Sort;
};

const list = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

export function filtersFromSearch(s: FilterSearch): Filters {
  return {
    cat: s.cat ?? null,
    sizes: list(s.sizes),
    colors: list(s.colors),
    brands: list(s.brands),
    min: s.min ?? null,
    max: s.max ?? null,
    off: s.off ?? null,
    sale: !!s.sale,
    // "sort=best" is honoured as a filter: the homepage category carousel's
    // default "Best Sellers" slide links to /shop?sort=best.
    best: !!s.best || s.sort === "best",
    fresh: !!s.new,
    stock: !!s.stock,
    q: s.q ?? "",
    sort: SORTS.some((x) => x.v === s.sort) ? (s.sort as Sort) : "new",
  };
}

// No page: changing any filter goes back to page 1.
export function searchFromFilters(f: Filters): FilterSearch {
  const join = (a: string[]) => (a.length > 0 ? a.join(",") : undefined);
  return {
    cat: f.cat ?? undefined,
    sizes: join(f.sizes),
    colors: join(f.colors),
    brands: join(f.brands),
    min: f.min ?? undefined,
    max: f.max ?? undefined,
    off: f.off ?? undefined,
    sale: f.sale ? 1 : undefined,
    best: f.best ? 1 : undefined,
    new: f.fresh ? 1 : undefined,
    stock: f.stock ? 1 : undefined,
    q: f.q || undefined,
    sort: f.sort === "new" ? undefined : f.sort,
  };
}

// Filters that narrow the list (sort and the page's own category don't count).
export function activeFilterCount(f: Filters): number {
  return (
    (f.cat ? 1 : 0) +
    f.sizes.length +
    f.colors.length +
    f.brands.length +
    (f.min != null || f.max != null ? 1 : 0) +
    (f.off ? 1 : 0) +
    (f.sale ? 1 : 0) +
    (f.best ? 1 : 0) +
    (f.fresh ? 1 : 0) +
    (f.stock ? 1 : 0) +
    (f.q ? 1 : 0)
  );
}

// ── Live data ────────────────────────────────────────────────────────
type FacetVariant = { size: string | null; color: string | null; hex: string | null; stock: number };

export type FilterFacts = {
  // false until the variant rows load (or if they failed): filters then fall
  // back to each product row's own sizes / colours / stock.
  loaded: boolean;
  variants: Map<string, FacetVariant[]>;
  memberships: Map<string, Set<string>>;
  sizes: Size[];
};

export const EMPTY_FACTS: FilterFacts = { loaded: false, variants: new Map(), memberships: new Map(), sizes: [] };

const PAGE_ROWS = 1000;
async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await page(from, from + PAGE_ROWS - 1);
    if (error) {
      console.error("loadFilterFacts:", error.message);
      return null;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_ROWS) return rows;
  }
}

export async function loadFilterFacts(): Promise<FilterFacts> {
  const [variantRows, membershipRows, sizes] = await Promise.all([
    fetchAllRows<{ product_id: string; size: string | null; color: string | null; color_hex: string | null; stock: number }>((from, to) =>
      supabase.from("product_variants").select("product_id, size, color, color_hex, stock").order("id").range(from, to),
    ),
    fetchAllRows<{ product_slug: string; category_id: string }>((from, to) =>
      supabase.from("product_categories").select("product_slug, category_id").order("id").range(from, to),
    ),
    listAllSizes(),
  ]);
  const variants = new Map<string, FacetVariant[]>();
  for (const r of variantRows ?? []) {
    const arr = variants.get(r.product_id) ?? [];
    arr.push({ size: r.size, color: r.color, hex: r.color_hex, stock: r.stock });
    variants.set(r.product_id, arr);
  }
  const memberships = new Map<string, Set<string>>();
  for (const r of membershipRows ?? []) {
    const set = memberships.get(r.product_slug) ?? new Set<string>();
    set.add(r.category_id);
    memberships.set(r.product_slug, set);
  }
  return { loaded: variantRows !== null, variants, memberships, sizes };
}

// ── Matching ─────────────────────────────────────────────────────────
const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export const discountPct = (p: Product) =>
  p.compareAt && p.compareAt > p.price ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;

// Size × colour combinations that can be bought right now. Rows saved
// without a colour take the product's colour when it has exactly one.
function sellable(p: Product, facts: FilterFacts): { size: string; color: string }[] {
  if (facts.loaded) {
    const only = p.colors.length === 1 ? p.colors[0].name : "";
    return (facts.variants.get(p.slug) ?? [])
      .filter((v) => v.stock > 0)
      .map((v) => ({ size: norm(v.size), color: norm(v.color || only) }));
  }
  if (p.stock <= 0) return [];
  const colors = p.colors.length > 0 ? p.colors.map((c) => norm(c.name)) : [""];
  return p.sizes.flatMap((s) => colors.map((c) => ({ size: norm(s), color: c })));
}

// Products without variant rows are sold out on the product page, so here too.
export function isInStock(p: Product, facts: FilterFacts): boolean {
  if (!facts.loaded) return p.stock > 0;
  return (facts.variants.get(p.slug) ?? []).some((v) => v.stock > 0);
}

type CategoryScope = { ids: Set<string>; names: Set<string> };

// A category filter covers the category and its subcategories. Accepts a
// slug or a name (older links use names like ?cat=Hoodies).
function categoryScope(key: string, categories: Category[]): CategoryScope | null {
  const k = norm(key);
  const cat = categories.find((c) => norm(c.slug) === k) ?? categories.find((c) => norm(c.name) === k);
  if (!cat) return null;
  const scope = [cat, ...categories.filter((c) => c.parentId === cat.id)];
  return { ids: new Set(scope.map((c) => c.id)), names: new Set(scope.map((c) => norm(c.name))) };
}

function inScope(p: Product, scope: CategoryScope, facts: FilterFacts): boolean {
  const member = facts.memberships.get(p.slug);
  if (member && [...member].some((id) => scope.ids.has(id))) return true;
  if (p.categoryId && scope.ids.has(p.categoryId)) return true;
  return scope.names.has(norm(p.category));
}

export function applyFilters(products: Product[], f: Filters, facts: FilterFacts, categories: Category[]): Product[] {
  const scope = f.cat ? categoryScope(f.cat, categories) : null;
  const sizes = new Set(f.sizes.map(norm));
  const colors = new Set(f.colors.map(norm));
  const brands = new Set(f.brands.map(norm));
  const term = norm(f.q);
  const now = Date.now();

  const out = products.filter((p) => {
    if (f.cat && !(scope ? inScope(p, scope, facts) : norm(p.category) === norm(f.cat))) return false;
    if (term && ![p.name, stripHtml(p.description), p.category, p.brand].some((x) => norm(x).includes(term))) return false;
    if ((sizes.size > 0 || colors.size > 0) &&
      !sellable(p, facts).some((v) => (sizes.size === 0 || sizes.has(v.size)) && (colors.size === 0 || colors.has(v.color)))) return false;
    if (brands.size > 0 && !brands.has(norm(p.brand))) return false;
    if (f.min != null && p.price < f.min) return false;
    if (f.max != null && p.price > f.max) return false;
    if (f.off && discountPct(p) < f.off) return false;
    if (f.sale && discountPct(p) === 0) return false;
    if (f.best && !p.isBestSeller) return false;
    if (f.fresh && !(p.createdAt && now - new Date(p.createdAt).getTime() <= NEW_IN_DAYS * DAY_MS)) return false;
    if (f.stock && !isInStock(p, facts)) return false;
    return true;
  });

  const created = (p: Product) => (p.createdAt ? new Date(p.createdAt).getTime() : 0);
  if (f.sort === "new") out.sort((a, b) => created(b) - created(a));
  else if (f.sort === "low") out.sort((a, b) => a.price - b.price);
  else if (f.sort === "high") out.sort((a, b) => b.price - a.price);
  else if (f.sort === "discount") out.sort((a, b) => discountPct(b) - discountPct(a));
  else if (f.sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

// ── Options shown in the filter bar ──────────────────────────────────
export type CategoryOption = { slug: string; name: string; depth: 0 | 1; count: number };
export type FilterOptions = {
  categories: CategoryOption[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  brands: string[];
  priceMin: number;
  priceMax: number;
};

// Built from the page's own products (the whole shop, or one collection), so
// only options that lead somewhere are offered: categories with pieces in
// them, sizes and colours that are in stock.
export function buildFilterOptions(
  products: Product[],
  facts: FilterFacts,
  categories: Category[],
  opts: { scope?: Category; curatedColors?: { name: string; hex: string }[] } = {},
): FilterOptions {
  const count = (c: Category) => {
    const scope = categoryScope(c.slug, categories);
    return scope ? products.filter((p) => inScope(p, scope, facts)).length : 0;
  };
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  const childrenOf = (c: Category) => categories.filter((x) => x.parentId === c.id).sort(byName);

  let categoryOptions: CategoryOption[];
  if (opts.scope) {
    categoryOptions = childrenOf(opts.scope)
      .map((c) => ({ slug: c.slug, name: c.name, depth: 0 as const, count: count(c) }))
      .filter((c) => c.count > 0);
  } else {
    const roots = categories.filter((c) => !c.parentId || !categories.some((p) => p.id === c.parentId)).sort(byName);
    categoryOptions = roots.flatMap((root) => {
      const rootCount = count(root);
      if (rootCount === 0) return [];
      return [
        { slug: root.slug, name: root.name, depth: 0 as const, count: rootCount },
        ...childrenOf(root)
          .map((c) => ({ slug: c.slug, name: c.name, depth: 1 as const, count: count(c) }))
          .filter((c) => c.count > 0),
      ];
    });
  }

  // Sizes in the admin's order for this collection (and its subcategories);
  // across the whole shop, the standard XS → XXL, 28 → 36 order.
  const sizeLabels = new Map<string, string>();
  const colorHex = new Map<string, { name: string; hex: string }>();
  for (const p of products) {
    if (facts.loaded) {
      for (const v of facts.variants.get(p.slug) ?? []) {
        if (v.stock <= 0) continue;
        if (v.size && !sizeLabels.has(norm(v.size))) sizeLabels.set(norm(v.size), v.size.trim());
        const name = (v.color || (p.colors.length === 1 ? p.colors[0].name : "")).trim();
        if (name && !colorHex.has(norm(name))) colorHex.set(norm(name), { name, hex: v.hex ?? p.colors.find((c) => norm(c.name) === norm(name))?.hex ?? "#0a0a0a" });
      }
    } else if (p.stock > 0) {
      for (const s of p.sizes) if (!sizeLabels.has(norm(s))) sizeLabels.set(norm(s), s.trim());
      for (const c of p.colors) if (!colorHex.has(norm(c.name))) colorHex.set(norm(c.name), c);
    }
  }
  const orderIds = opts.scope ? [opts.scope.id, ...childrenOf(opts.scope).map((c) => c.id)] : [];
  const order = orderIds.flatMap((id) => facts.sizes.filter((s) => s.categoryId === id).map((s) => s.label));

  const curated = opts.curatedColors ?? [];
  const prices = products.map((p) => p.price);

  return {
    categories: categoryOptions,
    sizes: sortSizes([...sizeLabels.values()], (s) => s, order),
    colors: curated.length > 0 ? curated : [...colorHex.values()].sort((a, b) => a.name.localeCompare(b.name)),
    brands: [...new Set(products.map((p) => p.brand?.trim()).filter((b): b is string => !!b))].sort((a, b) => a.localeCompare(b)),
    priceMin: prices.length ? Math.floor(Math.min(...prices) / 100) * 100 : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices) / 100) * 100 : 0,
  };
}
