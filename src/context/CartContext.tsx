import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getStoredProduct, type Product } from "@/lib/productsStore";

export type CartItem = {
  product: Product;
  size: string;
  qty: number;
  variantId?: string;
  stock?: number;
};

type CartCtx = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, size: string, qty?: number, variantId?: string, stock?: number) => void;
  remove: (slug: string, size: string) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const itemKey = (slug: string, size: string) => `${slug}|${size}`;

// Only logged-in users get their cart persisted to Supabase (carts/cart_items
// already exist in the DB but were completely unused) — a guest has no phone
// number to ever notify about an abandoned cart anyway, so there's nothing to
// gain from tracking their cart server-side; it stays plain in-memory state,
// same as before.
async function getOrCreateCartId(userId: string): Promise<string | null> {
  const { data } = await supabase.from("carts").upsert({ user_id: userId }, { onConflict: "user_id" }).select("id").single();
  return data?.id ?? null;
}

function persistUpsertItem(userId: string, variantId: string, qty: number) {
  getOrCreateCartId(userId).then((cartId) => {
    if (!cartId) return;
    supabase.from("cart_items").upsert({ cart_id: cartId, variant_id: variantId, qty }, { onConflict: "cart_id,variant_id" });
  });
}
function persistRemoveItem(userId: string, variantId: string) {
  getOrCreateCartId(userId).then((cartId) => {
    if (!cartId) return;
    supabase.from("cart_items").delete().eq("cart_id", cartId).eq("variant_id", variantId);
  });
}
function persistClear(userId: string) {
  getOrCreateCartId(userId).then((cartId) => {
    if (!cartId) return;
    supabase.from("cart_items").delete().eq("cart_id", cartId);
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  // Tracks which user's cart has finished loading from Supabase, so a mutation
  // fired mid-hydration (or while logged out) doesn't write through and race
  // the hydration fetch itself.
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { hydratedForRef.current = null; return; }

    (async () => {
      const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
      const dbItems: CartItem[] = [];
      if (cart) {
        const { data: rows } = await supabase.from("cart_items").select("variant_id, qty").eq("cart_id", cart.id);
        for (const row of rows ?? []) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("product_id, size, stock")
            .eq("id", row.variant_id)
            .maybeSingle();
          if (!variant) continue;
          const product = await getStoredProduct(variant.product_id);
          if (!product) continue;
          dbItems.push({ product, size: variant.size ?? "", qty: row.qty, variantId: row.variant_id, stock: variant.stock });
        }
      }

      setItems((prev) => {
        const dbKeys = new Set(dbItems.map((i) => itemKey(i.product.slug, i.size)));
        // Anything added to this same browser tab before hydration finished
        // (e.g. a guest cart that logged in mid-session) — keep it, and push
        // it into Supabase too so it survives the next refresh.
        const localOnly = prev.filter((p) => !dbKeys.has(itemKey(p.product.slug, p.size)));
        for (const p of localOnly) {
          if (p.variantId) persistUpsertItem(user.id, p.variantId, p.qty);
        }
        return [...dbItems, ...localOnly];
      });
      hydratedForRef.current = user.id;
    })();
  }, [user?.id]);

  const add = useCallback((product: Product, size: string, qty = 1, variantId?: string, stock?: number) => {
    let finalQty = qty;
    setItems((prev) => {
      const i = prev.findIndex((x) => x.product.slug === product.slug && x.size === size);
      if (i >= 0) {
        const next = [...prev];
        const cap = stock ?? next[i].stock;
        const wantedQty = next[i].qty + qty;
        finalQty = cap != null ? Math.min(wantedQty, cap) : wantedQty;
        next[i] = { ...next[i], qty: finalQty, stock: cap };
        return next;
      }
      finalQty = stock != null ? Math.min(qty, stock) : qty;
      return [...prev, { product, size, qty: finalQty, variantId, stock }];
    });
    setOpen(true);
    if (user && hydratedForRef.current === user.id && variantId) persistUpsertItem(user.id, variantId, finalQty);
  }, [user]);

  const remove = useCallback((slug: string, size: string) => {
    let removedVariantId: string | undefined;
    setItems((p) => {
      removedVariantId = p.find((x) => x.product.slug === slug && x.size === size)?.variantId;
      return p.filter((x) => !(x.product.slug === slug && x.size === size));
    });
    if (user && hydratedForRef.current === user.id && removedVariantId) persistRemoveItem(user.id, removedVariantId);
  }, [user]);

  const setQty = useCallback((slug: string, size: string, qty: number) => {
    let finalQty = qty;
    let variantId: string | undefined;
    setItems((p) =>
      p.map((x) => {
        if (x.product.slug !== slug || x.size !== size) return x;
        finalQty = Math.max(1, x.stock != null ? Math.min(qty, x.stock) : qty);
        variantId = x.variantId;
        return { ...x, qty: finalQty };
      })
    );
    if (user && hydratedForRef.current === user.id && variantId) persistUpsertItem(user.id, variantId, finalQty);
  }, [user]);

  const clear = useCallback(() => {
    setItems([]);
    if (user && hydratedForRef.current === user.id) persistClear(user.id);
  }, [user]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.product.price, 0);

  return (
    <Ctx.Provider
      value={{
        items, isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        add, remove, setQty, clear,
        count, subtotal,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider missing");
  return c;
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
