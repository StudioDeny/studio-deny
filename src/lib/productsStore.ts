import { supabase } from "./supabase";
import type { GalleryItem } from "@/types/database";

export type Color = { name: string; hex: string };
export type { GalleryItem };

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryId?: string;
  createdAt?: string;
  brand?: string;
  price: number;
  compareAt?: number;
  image: string;
  hoverImage: string;
  gallery?: GalleryItem[];
  badge?: "NEW DROP" | "LAST PIECE" | "SALE" | "SOLD OUT";
  sizes: string[];
  colors: Color[];
  description: string;
  material: string;
  materialCare?: string;
  fit?: string;
  stock: number;
  is_active?: boolean;
  is_featured?: boolean;
  isBestSeller?: boolean;
};

type DBProduct = {
  slug: string;
  name: string;
  category: string;
  category_id: string | null;
  brand: string | null;
  price: number;
  compare_at: number | null;
  image: string;
  hover_image: string;
  gallery: GalleryItem[] | null;
  badge: string | null;
  sizes: string[];
  colors: Color[];
  description: string;
  material: string;
  material_care: string | null;
  fit: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  created_at: string;
  updated_at: string;
};

function fromDB(r: DBProduct): Product {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    categoryId: r.category_id ?? undefined,
    createdAt: r.created_at,
    brand: r.brand ?? undefined,
    price: Number(r.price),
    compareAt: r.compare_at ? Number(r.compare_at) : undefined,
    image: r.image,
    hoverImage: r.hover_image,
    gallery: (r.gallery as GalleryItem[]) ?? [],
    badge: (r.badge as Product["badge"]) ?? undefined,
    sizes: r.sizes ?? [],
    colors: (r.colors as Color[]) ?? [],
    description: r.description,
    material: r.material,
    materialCare: r.material_care ?? undefined,
    fit: r.fit ?? undefined,
    stock: r.stock,
    is_active: r.is_active,
    is_featured: r.is_featured,
    isBestSeller: r.is_best_seller,
  };
}

function toDB(p: Product): Omit<DBProduct, "created_at" | "updated_at"> {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    category_id: p.categoryId ?? null,
    brand: p.brand ?? null,
    price: p.price,
    compare_at: p.compareAt ?? null,
    image: p.image,
    hover_image: p.hoverImage,
    gallery: p.gallery ?? [],
    badge: p.badge ?? null,
    sizes: p.sizes,
    colors: p.colors,
    description: p.description,
    material: p.material,
    material_care: p.materialCare ?? null,
    fit: p.fit ?? null,
    stock: p.stock,
    is_active: p.is_active ?? true,
    is_featured: p.is_featured ?? false,
    is_best_seller: p.isBestSeller ?? false,
  };
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listProducts:", error.message);
    return [];
  }
  return (data as DBProduct[]).map(fromDB);
}

export async function getStoredProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return fromDB(data as DBProduct);
}

export async function upsertProduct(p: Product): Promise<void> {
  const { error } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(toDB(p) as any, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}

export async function deleteProduct(slug: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function listAllAdminProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAllAdminProducts:", error.message);
    return [];
  }
  return (data as DBProduct[]).map(fromDB);
}
