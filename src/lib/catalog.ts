// Catalog: brands & categories store (localStorage-backed) with sane defaults.
import { listProducts } from "./productsStore";

const CAT_KEY = "sd_categories_v1";
const BRAND_KEY = "sd_brands_v1";

export type Category = { slug: string; name: string };
export type Brand = { slug: string; name: string };

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "tops", name: "Tops" },
  { slug: "bottoms", name: "Bottoms" },
  { slug: "outerwear", name: "Outerwear" },
  { slug: "accessories", name: "Accessories" },
  { slug: "men", name: "Men" },
  { slug: "women", name: "Women" },
];
const DEFAULT_BRANDS: Brand[] = [
  { slug: "studio-deny", name: "Studio Deny" },
];

const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; }
};
const write = (k: string, v: unknown) => {
  if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v));
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function listCategories(): Category[] {
  return read<Category[]>(CAT_KEY, DEFAULT_CATEGORIES);
}
export function saveCategories(list: Category[]) { write(CAT_KEY, list); }
export function upsertCategory(c: Category) {
  const list = listCategories();
  const i = list.findIndex((x) => x.slug === c.slug);
  if (i >= 0) list[i] = c; else list.push(c);
  saveCategories(list);
}
export function deleteCategory(slug: string) {
  saveCategories(listCategories().filter((c) => c.slug !== slug));
}

export function listBrands(): Brand[] {
  return read<Brand[]>(BRAND_KEY, DEFAULT_BRANDS);
}
export function saveBrands(list: Brand[]) { write(BRAND_KEY, list); }
export function upsertBrand(b: Brand) {
  const list = listBrands();
  const i = list.findIndex((x) => x.slug === b.slug);
  if (i >= 0) list[i] = b; else list.push(b);
  saveBrands(list);
}
export function deleteBrand(slug: string) {
  saveBrands(listBrands().filter((b) => b.slug !== slug));
}

export function findCategoryBySlug(slug: string): Category | undefined {
  return listCategories().find((c) => c.slug.toLowerCase() === slug.toLowerCase() || slugify(c.name) === slug.toLowerCase());
}

export function productsInCategory(catSlug: string) {
  const cat = findCategoryBySlug(catSlug);
  const target = (cat?.name ?? catSlug).toLowerCase();
  return listProducts().filter((p) => p.category.toLowerCase() === target);
}
