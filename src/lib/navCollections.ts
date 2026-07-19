import { listProducts, type Product } from "./productsStore";
import { findCategoryBySlug } from "./catalog";
import { getHomeSections } from "./homeSections";

const NEW_ARRIVALS_WINDOW_DAYS = 30;

async function productsForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const cat = await findCategoryBySlug(genderSlug);
  if (!cat) return [];
  const all = await listProducts();
  return all.filter((p) => p.categoryId === cat.id);
}

export async function newArrivalsForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const gendered = await productsForGender(genderSlug);
  const cutoff = Date.now() - NEW_ARRIVALS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return gendered
    .filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}

export async function bestSellersForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const gendered = await productsForGender(genderSlug);
  const curatedSlugs = new Set(getHomeSections().bestSellers.productSlugs);
  return gendered.filter((p) => curatedSlugs.has(p.slug));
}
