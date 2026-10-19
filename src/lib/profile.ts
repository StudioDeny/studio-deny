import { supabase } from "@/lib/supabase";

/** dob is "YYYY-MM-DD", or "" when not set. */
export type MyProfile = { name: string; phone: string; dob: string };

/** dobReady is false until the database has the dob column (20261019000001). */
export async function getMyProfile(): Promise<MyProfile & { dobReady: boolean }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { name: "", phone: "", dob: "", dobReady: false };
  const withDob = await supabase.from("profiles").select("name, phone, dob").eq("user_id", u.user.id).maybeSingle();
  // Before the 20261019000001 migration there is no dob column — read without it.
  const data = withDob.error
    ? (await supabase.from("profiles").select("name, phone").eq("user_id", u.user.id).maybeSingle()).data
    : withDob.data;
  const row = (data ?? {}) as { name?: string | null; phone?: string | null; dob?: string | null };
  return {
    name: row.name ?? (u.user.user_metadata?.name as string | undefined) ?? "",
    phone: row.phone ?? (u.user.user_metadata?.phone as string | undefined) ?? "",
    dob: row.dob ?? "",
    dobReady: !withDob.error,
  };
}

/** Today in IST as "YYYY-MM-DD" — the latest date of birth we accept. */
export const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

/** What's wrong with the form, or null when it can be saved. */
export function profileProblem(p: MyProfile, savedDob: string): string | null {
  if (p.name.trim().length < 2) return "Enter your name";
  if (!/^[0-9]{10}$/.test(p.phone.trim())) return "Enter a 10-digit phone number";
  if (!savedDob && p.dob !== "" && (p.dob < "1900-01-01" || p.dob > todayIst())) return "Enter a valid date of birth";
  return null;
}

/**
 * Saves name + phone, and the date of birth when it is being set for the
 * first time (`savedDob` empty). Once saved, the date of birth is locked.
 */
export async function updateMyProfile(p: MyProfile, savedDob: string): Promise<void> {
  const problem = profileProblem(p, savedDob);
  if (problem) throw new Error(problem);
  const name = p.name.trim();
  const phone = p.phone.trim();
  const setDob = !savedDob && p.dob !== "";

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not logged in");
  const { error } = await supabase.from("profiles").update({ name, phone }).eq("user_id", u.user.id);
  if (error) throw new Error(error.message);
  // Keeps the "HELLO, NAME" header in sync (AuthContext reads user_metadata.name;
  // onAuthStateChange fires USER_UPDATED and refreshes `user`).
  const { error: metaErr } = await supabase.auth.updateUser({ data: { name, phone } });
  if (metaErr) throw new Error(metaErr.message);

  if (setDob) {
    const { error: dobErr } = await supabase.from("profiles").update({ dob: p.dob }).eq("user_id", u.user.id);
    if (dobErr) {
      if (dobErr.message.includes("dob_locked")) throw new Error("Date of birth is already saved — contact us to change it");
      if (dobErr.message.includes("dob_invalid")) throw new Error("Enter a valid date of birth");
      throw new Error("Name and phone saved, but date of birth couldn't be saved yet — please try again later");
    }
  }
}

export function passwordProblem(password: string, again: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password !== again) return "Passwords don't match";
  return null;
}

export async function changeMyPassword(password: string, again: string): Promise<void> {
  const problem = passwordProblem(password, again);
  if (problem) throw new Error(problem);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
