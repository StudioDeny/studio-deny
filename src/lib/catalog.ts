// Catalog: brands & categories store (localStorage-backed) with sane defaults.
import { listProducts } from "./productsStore";

const CAT_KEY = "sd_categories_v1";
const BRAND_KEY = "sd_brands_v1";

export type Category = { slug: string; name: string };
export type Brand = { slug: string; name: string };

export const DEFAULT_CATEGORIES: Category[] = [
  { slug: "tops", name: "Tops" },
  { slug: "bottoms", name: "Bottoms" },
  { slug: "outerwear", name: "Outerwear" },
  { slug: "accessories", name: "Accessories" },
  { slug: "men", name: "Men" },
  { slug: "women", name: "Women" },
];
export const DEFAULT_BRANDS: Brand[] = [
  { slug: "studio-deny", name: "Studio Deny" },
];

const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    if (raw === null) return fb;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fb;
  } catch { return fb; }
};

const write = (k: string, v: unknown): boolean => {
  if (typeof window === "undefined") return false;
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function listCategories(): Category[] {
  return read<Category[]>(CAT_KEY, DEFAULT_CATEGORIES);
}
export function saveCategories(list: Category[]): boolean { return write(CAT_KEY, list); }
export function upsertCategory(c: Category): Category[] {
  const list = [...listCategories()]; // spread to avoid mutating the fallback constant
  const i = list.findIndex((x) => x.slug === c.slug);
  if (i >= 0) list[i] = c; else list.push(c);
  saveCategories(list);
  return list;
}
export function deleteCategory(slug: string): Category[] {
  const list = listCategories().filter((c) => c.slug !== slug);
  saveCategories(list);
  return list;
}

export function listBrands(): Brand[] {
  return read<Brand[]>(BRAND_KEY, DEFAULT_BRANDS);
}
export function saveBrands(list: Brand[]): boolean { return write(BRAND_KEY, list); }
export function upsertBrand(b: Brand): Brand[] {
  const list = [...listBrands()]; // spread to avoid mutating the fallback constant
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

export function findCategoryBySlug(slug: string): Category | undefined {
  return listCategories().find((c) => c.slug.toLowerCase() === slug.toLowerCase() || slugify(c.name) === slug.toLowerCase());
}

export async function productsInCategory(catSlug: string) {
  const cat = findCategoryBySlug(catSlug);
  const target = (cat?.name ?? catSlug).toLowerCase();
  const all = await listProducts();
  return all.filter((p) => p.category.toLowerCase() === target);
}
