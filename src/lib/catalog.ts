// Catalog: categories (Supabase-backed, hierarchical) & brands (localStorage-backed).
import { listProducts } from "./productsStore";
import { supabase } from "./supabase";

const BRAND_KEY = "sd_brands_v1";

export type Category = { id: string; slug: string; name: string; parentId: string | null };
export type Brand = { slug: string; name: string };

export const DEFAULT_BRANDS: Brand[] = [
  { slug: "studio-deny", name: "Studio Deny" },
];

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type DBCategory = { id: string; slug: string; name: string; parent_id: string | null };
const fromDBCategory = (r: DBCategory): Category => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id });

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name,parent_id")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("listCategories:", error.message);
    return [];
  }
  return (data as DBCategory[]).map(fromDBCategory);
}

export async function listTopLevelCategories(): Promise<Category[]> {
  return (await listCategories()).filter((c) => c.parentId === null);
}

export async function listChildCategories(parentSlug: string): Promise<Category[]> {
  const all = await listCategories();
  const parent = all.find((c) => c.slug === parentSlug);
  if (!parent) return [];
  return all.filter((c) => c.parentId === parent.id);
}

export async function findCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await listCategories()).find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

export async function upsertCategory(input: { name: string; slug?: string; parentId?: string | null }): Promise<void> {
  const slug = input.slug ?? slugify(input.name);
  const { error } = await supabase
    .from("categories")
    .upsert({ name: input.name, slug, parent_id: input.parentId ?? null }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}

export async function deleteCategory(slug: string): Promise<void> {
  const { error } = await supabase.from("categories").update({ is_active: false }).eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function productsInCategory(catSlug: string) {
  const cat = await findCategoryBySlug(catSlug);
  if (!cat) return [];
  const children = await listChildCategories(catSlug);
  const ids = new Set([cat.id, ...children.map((c) => c.id)]);
  const all = await listProducts();
  return all.filter((p) => p.categoryId && ids.has(p.categoryId));
}

// ── Brands (unchanged — still localStorage-backed) ─────────────────────
const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    if (raw === null) return fb;
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) && parsed.length > 0 ? parsed : fb) as T;
  } catch { return fb; }
};
const write = (k: string, v: unknown): boolean => {
  if (typeof window === "undefined") return false;
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

export function listBrands(): Brand[] {
  return read<Brand[]>(BRAND_KEY, DEFAULT_BRANDS);
}
export function saveBrands(list: Brand[]): boolean { return write(BRAND_KEY, list); }
export function upsertBrand(b: Brand): Brand[] {
  const list = [...listBrands()];
  const i = list.findIndex((x) => x.slug === b.slug);
  if (i >= 0) list[i] = b; else list.push(b);
  saveBrands(list);
  return list;
}
export function deleteBrand(slug: string): Brand[] {
  const list = listBrands().filter((b) => b.slug !== slug);
  saveBrands(list);
  return list;
}
