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
  imageType?: "image" | "video";
  hoverImage: string;
  hoverImageType?: "image" | "video";
  gallery?: GalleryItem[];
  badge?: "NEW DROP" | "LAST PIECE" | "SALE" | "SOLD OUT";
  sizes: string[];
  colors: Color[];
  description: string;
  material: string;
  materialCare?: string;
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
  image_type: "image" | "video" | null;
  hover_image: string;
  hover_image_type: "image" | "video" | null;
  gallery: GalleryItem[] | null;
  badge: string | null;
  sizes: string[];
  colors: Color[];
  description: string;
  material: string;
  material_care: string | null;
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
    imageType: r.image_type ?? "image",
    hoverImage: r.hover_image,
    hoverImageType: r.hover_image_type ?? "image",
    gallery: (r.gallery as GalleryItem[]) ?? [],
    badge: (r.badge as Product["badge"]) ?? undefined,
    sizes: r.sizes ?? [],
    colors: (r.colors as Color[]) ?? [],
    description: r.description,
    material: r.material,
    materialCare: r.material_care ?? undefined,
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
    image_type: p.imageType ?? "image",
    hover_image: p.hoverImage,
    hover_image_type: p.hoverImageType ?? "image",
    gallery: p.gallery ?? [],
    badge: p.badge ?? null,
    sizes: p.sizes,
    colors: p.colors,
    description: p.description,
    material: p.material,
    material_care: p.materialCare ?? null,
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

export async function setProductActive(slug: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: active })
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}

export type VariantStock = { size: string; inStock: boolean; variantId?: string; stock: number };

// Stock-aware size list for a product, sourced from its live variants — falls
// back to the product's static size list (all treated as in stock) for
// products with no per-variant stock tracking, same fallback the PDP uses.
export async function getVariantStock(slug: string, fallbackSizes: string[]): Promise<VariantStock[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, size, stock")
    .eq("product_id", slug)
    .order("size");
  if (error || !data || data.length === 0) {
    return fallbackSizes.map((size) => ({ size, inStock: true, stock: Infinity }));
  }
  return (data as { id: string; size: string | null; stock: number }[])
    .filter((v) => v.size != null)
    .map((v) => ({ size: v.size as string, inStock: v.stock > 0, variantId: v.id, stock: v.stock }));
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
