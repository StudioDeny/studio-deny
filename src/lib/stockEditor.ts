// Colour-card stock editor <-> product_variants rows.
// Each colour card holds the sizes that colour is made in, with a stock
// count per size and an optional price (blank = product price). A size
// that is not selected has no variant row; a selected size with 0 stock is
// "made, but sold out". The derived products.stock / products.sizes are
// recomputed by the database (recompute_product_stock).
import { supabase } from "./supabase";
import type { Color } from "./productsStore";

export const ONE_SIZE = "ONE SIZE";

export type VariantRow = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  stock: number;
  price: number;
  compare_price: number | null;
  sku: string | null;
};

export type ColourCard = {
  key: string;
  name: string; // "" = product has no colours (only allowed as the single card)
  hex: string;
  price: string; // "" = use product price
  compareAt: string; // "" = use product compare-at
  sizes: Record<string, string>; // selected size label -> qty text
  origName?: string; // colour name the saved rows carry, so a rename moves them
};

let keySeq = 0;
export const newCardKey = () => `card-${Date.now()}-${keySeq++}`;

export function emptyCard(name = "", hex = "#000000"): ColourCard {
  return { key: newCardKey(), name, hex, price: "", compareAt: "", sizes: {} };
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export async function listVariantRows(slug: string): Promise<VariantRow[]> {
  const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", slug);
  if (error) throw new Error(error.message);
  return (data ?? []) as VariantRow[];
}

// Builds cards from saved rows plus the product's colour list (colours
// with no rows yet still get a card so the admin is asked for their stock).
export function cardsFromVariants(
  rows: VariantRow[],
  colors: Color[],
  productPrice: number,
  productCompareAt?: number,
): ColourCard[] {
  const cards: ColourCard[] = [];
  const byName = new Map<string, ColourCard>();
  const cardFor = (name: string, hex: string) => {
    const k = norm(name);
    let c = byName.get(k);
    if (!c) {
      c = { ...emptyCard(name, hex || "#000000"), origName: name };
      byName.set(k, c);
      cards.push(c);
    }
    if (hex && (!c.hex || c.hex === "#000000")) c.hex = hex;
    return c;
  };

  colors.filter((c) => c.name.trim()).forEach((c) => cardFor(c.name.trim(), c.hex));
  for (const r of rows) {
    const c = cardFor(r.color?.trim() ?? "", r.color_hex ?? "");
    c.sizes[r.size || ONE_SIZE] = String(r.stock);
    if (Number(r.price) !== Number(productPrice)) c.price = String(r.price);
    if (r.compare_price != null && Number(r.compare_price) !== Number(productCompareAt ?? NaN)) c.compareAt = String(r.compare_price);
  }
  // Older products: stock rows saved without a colour while the product
  // lists exactly one colour. Fold that stock into the colour card (rows are
  // renamed on save) instead of showing an unnamed card next to it.
  const unnamed = cards.filter((c) => !c.name.trim());
  const named = cards.filter((c) => c.name.trim());
  if (unnamed.length === 1 && named.length === 1 && Object.keys(named[0].sizes).length === 0) {
    const [target] = named;
    target.sizes = unnamed[0].sizes;
    target.price = unnamed[0].price;
    target.compareAt = unnamed[0].compareAt;
    target.origName = "";
    return [target];
  }
  return cards.length > 0 ? cards : [emptyCard()];
}

const isWholeNumber = (s: string) => /^\d+$/.test(s.trim());
const isMoney = (s: string) => /^\d+(\.\d{1,2})?$/.test(s.trim());

// Returns a message for the first problem, or null when the cards can be saved.
export function validateCards(cards: ColourCard[], requireStock: boolean): string | null {
  const named = cards.filter((c) => c.name.trim());
  if (cards.length > 1 && named.length !== cards.length) {
    return "One colour card has no name — give it a colour name (e.g. Black) or remove it with ×.";
  }
  const seen = new Set<string>();
  for (const c of named) {
    const k = norm(c.name);
    if (seen.has(k)) return `Colour "${c.name.trim()}" is added twice.`;
    seen.add(k);
    if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) return `Pick a colour swatch for "${c.name.trim()}".`;
  }
  for (const c of cards) {
    const label = c.name.trim() || "this product";
    for (const [size, qty] of Object.entries(c.sizes)) {
      if (qty.trim() === "") return `Enter the stock quantity for ${label} – size ${size}.`;
      if (!isWholeNumber(qty)) return `Stock for ${label} – size ${size} must be a whole number (0 or more).`;
    }
    if (c.price.trim() && !isMoney(c.price)) return `Price for ${label} must be a number.`;
    if (c.compareAt.trim() && !isMoney(c.compareAt)) return `Compare-at price for ${label} must be a number.`;
  }
  if (requireStock && cards.every((c) => Object.keys(c.sizes).length === 0)) {
    return "Select at least one size and enter its stock.";
  }
  return null;
}

type VariantPatch = Partial<Omit<VariantRow, "id" | "product_id">>;

export type StockPlan = {
  inserts: Omit<VariantRow, "id" | "product_id">[];
  updates: { id: string; loadedStock: number; patch: VariantPatch }[];
  deletes: VariantRow[];
};

export function planStockSave(
  rows: VariantRow[],
  cards: ColourCard[],
  productPrice: number,
  productCompareAt?: number,
): StockPlan {
  const plan: StockPlan = { inserts: [], updates: [], deletes: [] };
  const kept = new Set<string>();

  for (const c of cards) {
    const color = c.name.trim() || null;
    const rowColor = c.origName !== undefined ? c.origName.trim() || null : color;
    const price = c.price.trim() ? Number(c.price) : productPrice;
    const compare = c.compareAt.trim() ? Number(c.compareAt) : productCompareAt ?? null;
    for (const [size, qty] of Object.entries(c.sizes)) {
      const stock = Number(qty);
      const match = rows.find((r) => !kept.has(r.id) && norm(r.color) === norm(rowColor) && (r.size || ONE_SIZE) === size);
      if (!match) {
        plan.inserts.push({ size, color, color_hex: color ? c.hex : null, stock, price, compare_price: compare, sku: null });
        continue;
      }
      kept.add(match.id);
      const patch: VariantPatch = {};
      if (match.stock !== stock) patch.stock = stock;
      if (Number(match.price) !== price) patch.price = price;
      if ((match.compare_price ?? null) !== compare) patch.compare_price = compare;
      if (color && (match.color_hex ?? "") !== c.hex) patch.color_hex = c.hex;
      if (match.color !== color) patch.color = color;
      if (Object.keys(patch).length > 0) plan.updates.push({ id: match.id, loadedStock: match.stock, patch });
    }
  }
  plan.deletes = rows.filter((r) => !kept.has(r.id));
  return plan;
}

export type StockSaveResult = {
  // Rows the admin removed that were already sold: kept at 0 stock instead.
  keptSold: VariantRow[];
  // Rows whose stock changed (a sale) after the editor loaded: not overwritten.
  conflicts: VariantRow[];
};

export async function saveStockPlan(slug: string, plan: StockPlan): Promise<StockSaveResult> {
  const result: StockSaveResult = { keptSold: [], conflicts: [] };

  if (plan.inserts.length > 0) {
    const { error } = await supabase
      .from("product_variants")
      .insert(plan.inserts.map((v) => ({ ...v, product_id: slug })));
    if (error) throw new Error(error.message);
  }

  for (const u of plan.updates) {
    let q = supabase.from("product_variants").update(u.patch).eq("id", u.id);
    // Optimistic check: only overwrite stock if nobody sold from it meanwhile.
    if (u.patch.stock !== undefined) q = q.eq("stock", u.loadedStock);
    const { data, error } = await q.select("*");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      const { data: fresh } = await supabase.from("product_variants").select("*").eq("id", u.id).maybeSingle();
      if (fresh) result.conflicts.push(fresh as VariantRow);
    }
  }

  for (const d of plan.deletes) {
    if (await variantWasSold(d.id)) {
      if (d.stock !== 0) await supabase.from("product_variants").update({ stock: 0 }).eq("id", d.id);
      result.keptSold.push(d);
      continue;
    }
    const { error } = await supabase.from("product_variants").delete().eq("id", d.id);
    if (error) throw new Error(error.message);
  }

  // Product saves write products.stock/sizes from the form; re-derive them
  // from the variant rows so a stale form value never wins.
  await supabase.rpc("recompute_product_stock" as never, { p_slug: slug } as never);
  return result;
}

async function variantWasSold(id: string): Promise<boolean> {
  const [online, pos] = await Promise.all([
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("variant_id", id),
    // pos_bill_items belongs to the billing app and is not in this app's generated types.
    supabase.from("pos_bill_items" as never).select("id", { count: "exact", head: true }).eq("variant_id" as never, id as never),
  ]);
  return (online.count ?? 0) + (pos.count ?? 0) > 0;
}

// products.colors mirrors the named colour cards (storefront swatches).
export function colorsFromCards(cards: ColourCard[]): Color[] {
  return cards.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex }));
}

export function describeSaveResult(r: StockSaveResult): string | null {
  const parts: string[] = [];
  if (r.keptSold.length > 0) {
    parts.push(
      `${r.keptSold.map((v) => [v.color, v.size].filter(Boolean).join(" / ")).join(", ")} already sold before, so kept at 0 stock instead of removed`,
    );
  }
  if (r.conflicts.length > 0) {
    parts.push(
      `${r.conflicts.map((v) => [v.color, v.size].filter(Boolean).join(" / ")).join(", ")} changed by a sale while you were editing — reloaded, please check and save again`,
    );
  }
  return parts.length > 0 ? parts.join(". ") : null;
}
