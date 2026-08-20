// Catalog: categories & brands — both Supabase-backed, hierarchical only
// for categories.
import { listProducts } from "./productsStore";
import { supabase } from "./supabase";

export type Category = { id: string; slug: string; name: string; parentId: string | null };
export type Brand = { id: string; slug: string; name: string };

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

// ── Brands ───────────────────────────────────────────────────────────
export async function listBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id,slug,name")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("listBrands:", error.message);
    return [];
  }
  return data ?? [];
}

export async function upsertBrand(input: { slug?: string; name: string }): Promise<void> {
  const slug = input.slug ?? slugify(input.name);
  const { error } = await supabase
    .from("brands")
    .upsert({ name: input.name, slug }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}

export async function deleteBrand(slug: string): Promise<void> {
  const { error } = await supabase.from("brands").update({ is_active: false }).eq("slug", slug);
  if (error) throw new Error(error.message);
}
