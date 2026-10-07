import { supabase } from "@/lib/supabase";

export async function getMyProfile(): Promise<{ name: string; phone: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { name: "", phone: "" };
  const { data } = await supabase.from("profiles").select("name, phone").eq("user_id", u.user.id).maybeSingle();
  return {
    name: (data?.name as string | null) ?? (u.user.user_metadata?.name as string | undefined) ?? "",
    phone: (data?.phone as string | null) ?? (u.user.user_metadata?.phone as string | undefined) ?? "",
  };
}

export async function updateMyProfile(p: { name: string; phone: string }): Promise<void> {
  const name = p.name.trim();
  const phone = p.phone.trim();
  if (name.length < 2) throw new Error("Enter your name");
  if (!/^[0-9]{10}$/.test(phone)) throw new Error("Enter a 10-digit phone number");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not logged in");
  const { error } = await supabase.from("profiles").update({ name, phone }).eq("user_id", u.user.id);
  if (error) throw new Error(error.message);
  // Keeps the "HELLO, NAME" header in sync (AuthContext reads user_metadata.name;
  // onAuthStateChange fires USER_UPDATED and refreshes `user`).
  const { error: metaErr } = await supabase.auth.updateUser({ data: { name, phone } });
  if (metaErr) throw new Error(metaErr.message);
}
