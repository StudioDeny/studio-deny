import { supabase } from "./supabase";

// When the admin last cleared new-order notifications. Kept on the admin's own
// Supabase auth user (user_metadata), not localStorage — a per-browser value
// came back as "new" after a refresh, a new login or on another device.
const META_KEY = "admin_orders_seen_at";
const LEGACY_KEY = "sd_admin_last_seen"; // the old per-browser value
export const SEEN_EVENT = "sd-admin-seen";

let cached: number | null = null;

export async function getLastSeen(): Promise<number> {
  if (cached !== null) return cached;
  const { data } = await supabase.auth.getSession();
  const stored = Number(data.session?.user.user_metadata?.[META_KEY]);
  if (stored > 0) return (cached = stored);
  // Not saved on the account yet: carry over this browser's old value, or
  // (first-ever admin visit) treat all existing orders as already seen.
  let legacy = 0;
  try { legacy = Number(localStorage.getItem(LEGACY_KEY)) || 0; } catch { /* private mode */ }
  return markSeen(legacy || Date.now());
}

/** Clears everything up to `upTo` (default now). Pass the newest order's
 *  createdAt so a device clock running behind can't leave it "new". */
export async function markSeen(upTo = 0): Promise<number> {
  const ts = Math.max(Date.now(), upTo, cached ?? 0);
  cached = ts;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SEEN_EVENT));
  const { error } = await supabase.auth.updateUser({ data: { [META_KEY]: ts } });
  if (error) console.warn("markSeen:", error.message);
  return ts;
}

/** The orders list is open: everything up to its newest order counts as seen. */
export async function markSeenUpTo(newest: number): Promise<void> {
  if (newest > (await getLastSeen())) await markSeen(newest);
}
