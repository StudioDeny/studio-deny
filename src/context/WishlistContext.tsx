import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Ctx = {
  slugs: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  clear: () => void;
};

const C = createContext<Ctx | null>(null);
const KEY = "sd_wish";

function lsGet(): string[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSet(next: string[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
}

function lsClear() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setSlugs(lsGet());
      return;
    }

    // Logged in: fetch from Supabase and merge any pending localStorage items
    const pending = lsGet();

    supabase
      .from("wishlist_items")
      .select("product_slug")
      .eq("user_id", user.id)
      .then(async ({ data }) => {
        const dbSlugs: string[] = (data ?? []).map((r: { product_slug: string }) => r.product_slug);

        if (pending.length > 0) {
          const toInsert = pending
            .filter((s) => !dbSlugs.includes(s))
            .map((s) => ({ user_id: user.id, product_slug: s }));
          if (toInsert.length > 0) {
            await supabase.from("wishlist_items").insert(toInsert);
          }
          lsClear();
        }

        setSlugs(Array.from(new Set([...dbSlugs, ...pending])));
      });
  }, [user?.id]);

  const toggle = useCallback(
    async (slug: string) => {
      const removing = slugs.includes(slug);
      const next = removing ? slugs.filter((s) => s !== slug) : [...slugs, slug];
      setSlugs(next);

      if (user) {
        if (removing) {
          await supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_slug", slug);
        } else {
          await supabase
            .from("wishlist_items")
            .insert({ user_id: user.id, product_slug: slug });
        }
      } else {
        lsSet(next);
      }
    },
    [slugs, user],
  );

  const clear = useCallback(async () => {
    setSlugs([]);
    if (user) {
      await supabase.from("wishlist_items").delete().eq("user_id", user.id);
    } else {
      lsClear();
    }
  }, [user]);

  return (
    <C.Provider value={{ slugs, has: (s) => slugs.includes(s), toggle, clear }}>
      {children}
    </C.Provider>
  );
}

export const useWishlist = () => {
  const c = useContext(C);
  if (!c) throw new Error("WishlistProvider missing");
  return c;
};
