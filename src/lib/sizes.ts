// Sizes catalog: admin defines a size list per category (the same category
// a product is assigned via CategoryPicker — top-level or child). The
// product form and variant modal read this instead of free-text entry.
import { supabase } from "./supabase";

export type Size = { id: string; categoryId: string; label: string; position: number };

type DBSize = { id: string; category_id: string; label: string; position: number };
const fromDB = (r: DBSize): Size => ({ id: r.id, categoryId: r.category_id, label: r.label, position: r.position });

export async function listSizesForCategory(categoryId: string): Promise<Size[]> {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("sizes")
    .select("id,category_id,label,position")
    .eq("category_id", categoryId)
    .order("position");
  if (error) {
    console.error("listSizesForCategory:", error.message);
    return [];
  }
  return (data as DBSize[]).map(fromDB);
}

export async function addSize(categoryId: string, label: string): Promise<void> {
  const { data } = await supabase.from("sizes").select("position").eq("category_id", categoryId).order("position", { ascending: false }).limit(1);
  const nextPosition = data && data.length > 0 ? data[0].position + 1 : 0;
  const { error } = await supabase.from("sizes").insert({ category_id: categoryId, label: label.trim(), position: nextPosition });
  allSizesCache = null;
  if (error) throw new Error(error.message);
}

export async function deleteSize(id: string): Promise<void> {
  const { error } = await supabase.from("sizes").delete().eq("id", id);
  allSizesCache = null;
  if (error) throw new Error(error.message);
}

export async function reorderSize(id: string, position: number): Promise<void> {
  const { error } = await supabase.from("sizes").update({ position }).eq("id", id);
  allSizesCache = null;
  if (error) throw new Error(error.message);
}

// ── Display order ────────────────────────────────────────────────────
// Every storefront size list (product page, quick add, filters) follows the
// order the admin set in Admin → Sizes. The whole table is tiny, so it is
// fetched once and shared, and re-read after a minute so a reorder shows up
// without a hard refresh.
const SIZES_TTL_MS = 60_000;
let allSizesCache: { at: number; rows: Promise<Size[]> } | null = null;

export function listAllSizes(): Promise<Size[]> {
  if (allSizesCache && Date.now() - allSizesCache.at < SIZES_TTL_MS) return allSizesCache.rows;
  const rows = (async () => {
    const { data, error } = await supabase.from("sizes").select("id,category_id,label,position").order("position");
    if (error) {
      console.error("listAllSizes:", error.message);
      allSizesCache = null;
      return [];
    }
    return (data as DBSize[]).map(fromDB);
  })();
  allSizesCache = { at: Date.now(), rows };
  return rows;
}

// Admin order for the given categories, first category first, duplicates
// dropped. [] when none of them has sizes defined.
export async function sizeOrderFor(categoryIds: (string | null | undefined)[]): Promise<string[]> {
  const ids = categoryIds.filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const all = await listAllSizes();
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of ids) {
    for (const s of all.filter((x) => x.categoryId === id)) {
      const k = normSize(s.label);
      if (seen.has(k)) continue;
      seen.add(k);
      order.push(s.label);
    }
  }
  return order;
}

const normSize = (s: string) => s.trim().toUpperCase();

// Sizes the admin hasn't ranked: XXS … S, M, L, XL … 5XL, then numbers
// ascending (waist 28, 30 … / ring 6, 7 …), then anything else A → Z.
function standardRank(label: string): [number, number, string] {
  const t = normSize(label).replace(/\s+/g, "");
  if (t === "M") return [0, 0, t];
  const m = /^(?:(\d+)X|(X*))([SL])$/.exec(t);
  if (m) {
    const xs = m[1] ? Number(m[1]) : m[2].length;
    return [0, m[3] === "L" ? xs + 1 : -(xs + 1), t];
  }
  if (/^\d+(\.\d+)?$/.test(t)) return [1, Number(t), t];
  return [2, 0, t];
}

// Stable: items with the same size (e.g. one row per colour) keep their order.
export function sortSizes<T>(items: T[], labelOf: (item: T) => string, order: string[] = []): T[] {
  const rank = new Map<string, number>();
  order.forEach((o, i) => {
    if (!rank.has(normSize(o))) rank.set(normSize(o), i);
  });
  return items
    .map((item, i) => ({ item, i, label: labelOf(item) }))
    .sort((a, b) => {
      const ra = rank.get(normSize(a.label));
      const rb = rank.get(normSize(b.label));
      if (ra !== undefined || rb !== undefined) {
        if (ra === undefined) return 1;
        if (rb === undefined) return -1;
        return ra - rb || a.i - b.i;
      }
      const sa = standardRank(a.label);
      const sb = standardRank(b.label);
      return sa[0] - sb[0] || sa[1] - sb[1] || sa[2].localeCompare(sb[2]) || a.i - b.i;
    })
    .map((x) => x.item);
}

export const sortSizeLabels = (labels: string[], order: string[] = []) => sortSizes(labels, (l) => l, order);
