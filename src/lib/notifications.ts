const KEY = "sd_admin_last_seen"; // timestamp ms

export const getLastSeen = () => {
  if (typeof window === "undefined") return Date.now();
  const stored = localStorage.getItem(KEY);
  if (!stored) {
    // First-ever admin visit: treat all existing orders as already seen.
    const now = Date.now();
    localStorage.setItem(KEY, String(now));
    return now;
  }
  return Number(stored);
};

export const markSeen = () => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, String(Date.now()));
};
