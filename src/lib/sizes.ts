// Sizes catalog: admin defines a size list per category (the same category
// a product is assigned via CategoryPicker — top-level or child). The
// product form and variant modal read this instead of free-text entry.
import { supabase } from "./supabase";

export type Size = { id: string; categoryId: string; label: string; position: number };

type DBSize = { id: string; category_id: string; label: string; position: number };
const fromDB = (r: DBSize): Size => ({ id: r.id, categoryId: r.category_id, label: r.label, position: r.position });

export async function listSizesForCategory(categoryId: string): Promise<Size[]> {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("sizes")
    .select("id,category_id,label,position")
    .eq("category_id", categoryId)
    .order("position");
  if (error) {
    console.error("listSizesForCategory:", error.message);
    return [];
  }
  return (data as DBSize[]).map(fromDB);
}

export async function addSize(categoryId: string, label: string): Promise<void> {
  const { data } = await supabase.from("sizes").select("position").eq("category_id", categoryId).order("position", { ascending: false }).limit(1);
  const nextPosition = data && data.length > 0 ? data[0].position + 1 : 0;
  const { error } = await supabase.from("sizes").insert({ category_id: categoryId, label: label.trim(), position: nextPosition });
  if (error) throw new Error(error.message);
}

export async function deleteSize(id: string): Promise<void> {
  const { error } = await supabase.from("sizes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSize(id: string, position: number): Promise<void> {
  const { error } = await supabase.from("sizes").update({ position }).eq("id", id);
  if (error) throw new Error(error.message);
}
