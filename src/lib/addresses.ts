import { supabase } from "@/lib/supabase";
import type { Address } from "@/types/database";

export type SavedAddress = Address;
export type AddressInput = {
  label: string; name: string; phone: string; line1: string;
  city: string; state: string; pincode: string; is_default?: boolean;
};

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not logged in");
  return data.user.id;
}

export async function listAddresses(): Promise<SavedAddress[]> {
  const { data, error } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  if (error) { console.warn("listAddresses:", error.message); return []; }
  return (data as SavedAddress[]) ?? [];
}

export function validateAddress(a: AddressInput): string | null {
  if (a.name.trim().length < 2) return "Enter the name";
  if (!/^\+?[0-9 -]{10,15}$/.test(a.phone.trim())) return "Enter a valid phone number";
  if (a.line1.trim().length < 5) return "Enter the full address";
  if (a.city.trim().length < 2) return "Enter the city";
  if (a.state.trim().length < 2) return "Enter the state";
  if (!/^[0-9]{6}$/.test(a.pincode.trim())) return "Enter a 6-digit PIN code";
  return null;
}

export async function saveAddress(a: AddressInput & { id?: string }): Promise<void> {
  const row = {
    label: a.label.trim() || null, name: a.name.trim(), phone: a.phone.trim(), line1: a.line1.trim(),
    line2: null, city: a.city.trim(), state: a.state.trim(), pincode: a.pincode.trim(),
    is_default: a.is_default ?? false,
  };
  const { error } = a.id
    ? await supabase.from("addresses").update(row).eq("id", a.id)
    : await supabase.from("addresses").insert({ ...row, user_id: await uid() });
  if (error) throw new Error(error.message);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** The DB trigger trg_single_default_address clears the others. */
export async function setDefaultAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

const LEGACY_KEY = "sd_addresses";
type LegacyAddress = { label: string; name: string; line1: string; city: string; state: string; pin: string; phone: string; isDefault: boolean };

/** One-time move of addresses saved in this browser by the old account page. */
export async function importLocalAddresses(): Promise<number> {
  let legacy: LegacyAddress[] = [];
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]"); } catch { return 0; }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;
  let moved = 0;
  for (const a of legacy) {
    try {
      await saveAddress({ label: a.label ?? "", name: a.name ?? "", phone: a.phone ?? "", line1: a.line1 ?? "", city: a.city ?? "", state: a.state ?? "", pincode: a.pin ?? "", is_default: !!a.isDefault });
      moved++;
    } catch { /* skip rows the DB rejects (e.g. missing phone) */ }
  }
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  return moved;
}
