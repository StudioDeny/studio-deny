// Mega menu: an independent nav structure (top-level categories -> link
// column -> horizontally-scrollable image tiles), each link/tile optionally
// pointing at a real product category (resolved to /collections/{slug}) or
// a plain custom URL. See supabase/migrations/20260730000006_create_mega_menu.sql.
import { supabase } from "./supabase";
import type { MegaMenuCategoryRow, MegaMenuLinkRow, MegaMenuTileRow } from "@/types/database";

export type MegaMenuLink = { id: string; label: string; href: string; position: number };
export type MegaMenuTile = { id: string; label: string; href: string; imageUrl: string; imageType: "image" | "video"; position: number };
export type MegaMenuCategory = { id: string; label: string; href: string; position: number; links: MegaMenuLink[]; tiles: MegaMenuTile[] };

/** A link/tile/category row resolves to a category's collection page when
 * `category_id` is set, otherwise falls back to its own `href` text. */
export function resolveMegaMenuHref(categoryId: string | null, href: string | null, slugById: Map<string, string>): string {
  if (categoryId) {
    const slug = slugById.get(categoryId);
    if (slug) return `/collections/${slug}`;
  }
  return href || "#";
}

/** Public, read-only fetch of the full active mega menu tree — used by the
 * live Navbar. Admin CRUD reads/writes the raw tables directly instead. */
export async function getMegaMenu(): Promise<MegaMenuCategory[]> {
  const [{ data: cats }, { data: links }, { data: tiles }, { data: categories }] = await Promise.all([
    supabase.from("mega_menu_categories").select("*").eq("is_active", true).order("position"),
    supabase.from("mega_menu_links").select("*").eq("is_active", true).order("position"),
    supabase.from("mega_menu_tiles").select("*").order("position"),
    supabase.from("categories").select("id, slug"),
  ]);

  const slugById = new Map((categories ?? []).map((c) => [c.id as string, c.slug as string]));
  const categoryRows = (cats ?? []) as MegaMenuCategoryRow[];
  const linkRows = (links ?? []) as MegaMenuLinkRow[];
  const tileRows = (tiles ?? []) as MegaMenuTileRow[];

  return categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    href: resolveMegaMenuHref(c.category_id, c.href, slugById),
    position: c.position,
    links: linkRows
      .filter((l) => l.menu_category_id === c.id)
      .map((l) => ({ id: l.id, label: l.label, href: resolveMegaMenuHref(l.category_id, l.href, slugById), position: l.position })),
    tiles: tileRows
      .filter((t) => t.menu_category_id === c.id)
      .map((t) => ({ id: t.id, label: t.label, href: resolveMegaMenuHref(t.category_id, t.href, slugById), imageUrl: t.image_url, imageType: t.image_type, position: t.position })),
  }));
}
