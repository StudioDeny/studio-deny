// Mega menu: a top-level category -> a link column -> up to 3 featured
// products, shown as a horizontally-scrollable tile row. Every level
// resolves through something that already exists — a tab and a sublink
// both ARE a real category, a tile IS a real product — there are no
// free-text labels or custom URLs anywhere.
// See supabase/migrations/20260730000006_create_mega_menu.sql and
// supabase/migrations/20260730000007_simplify_mega_menu.sql.
import { supabase } from "./supabase";
import type { MegaMenuCategoryRow, MegaMenuLinkRow, MegaMenuProductRow } from "@/types/database";

export type MegaMenuLink = { id: string; label: string; href: string; position: number };
export type MegaMenuProduct = { id: string; label: string; href: string; imageUrl: string; price: number; compareAt: number | null; position: number };
export type MegaMenuCategory = { id: string; label: string; href: string; position: number; links: MegaMenuLink[]; products: MegaMenuProduct[] };

/** Public, read-only fetch of the full active mega menu tree — used by the
 * live Navbar. Admin CRUD reads/writes the raw tables directly instead. */
export async function getMegaMenu(): Promise<MegaMenuCategory[]> {
  const [{ data: cats }, { data: links }, { data: prods }, { data: categories }] = await Promise.all([
    supabase.from("mega_menu_categories").select("*").eq("is_active", true).order("position"),
    supabase.from("mega_menu_links").select("*").eq("is_active", true).order("position"),
    supabase.from("mega_menu_products").select("*").order("position"),
    supabase.from("categories").select("id, name, slug"),
  ]);

  const categoryRows = (cats ?? []) as MegaMenuCategoryRow[];
  const linkRows = (links ?? []) as MegaMenuLinkRow[];
  const productRows = (prods ?? []) as MegaMenuProductRow[];
  const catById = new Map((categories ?? []).map((c) => [c.id as string, c as { id: string; name: string; slug: string }]));

  const slugsNeeded = Array.from(new Set(productRows.map((p) => p.product_slug)));
  const { data: products } = slugsNeeded.length > 0
    ? await supabase.from("products").select("slug, name, image, price, compare_at").in("slug", slugsNeeded)
    : { data: [] as { slug: string; name: string; image: string; price: number; compare_at: number | null }[] };
  const productBySlug = new Map((products ?? []).map((p) => [p.slug, p]));

  return categoryRows
    .filter((c) => catById.has(c.category_id))
    .map((c) => {
      const cat = catById.get(c.category_id)!;
      return {
        id: c.id,
        label: cat.name,
        href: `/collections/${cat.slug}`,
        position: c.position,
        links: linkRows
          .filter((l) => l.menu_category_id === c.id && catById.has(l.category_id))
          .map((l) => {
            const lc = catById.get(l.category_id)!;
            return { id: l.id, label: lc.name, href: `/collections/${lc.slug}`, position: l.position };
          }),
        products: productRows
          .filter((p) => p.menu_category_id === c.id && productBySlug.has(p.product_slug))
          .map((p) => {
            const prod = productBySlug.get(p.product_slug)!;
            return {
              id: p.id, label: prod.name, href: `/product/${prod.slug}`, imageUrl: prod.image,
              price: prod.price, compareAt: prod.compare_at, position: p.position,
            };
          }),
      };
    });
}
