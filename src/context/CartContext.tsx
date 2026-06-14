import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Product } from "@/lib/products";

export type CartItem = {
  product: Product;
  size: string;
  qty: number;
  variantId?: string;
};

type CartCtx = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, size: string, qty?: number, variantId?: string) => void;
  remove: (slug: string, size: string) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);

  const add = useCallback((product: Product, size: string, qty = 1, variantId?: string) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.product.slug === product.slug && x.size === size);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { product, size, qty, variantId }];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((slug: string, size: string) => {
    setItems((p) => p.filter((x) => !(x.product.slug === slug && x.size === size)));
  }, []);

  const setQty = useCallback((slug: string, size: string, qty: number) => {
    setItems((p) =>
      p.map((x) =>
        x.product.slug === slug && x.size === size ? { ...x, qty: Math.max(1, qty) } : x
      )
    );
  }, []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.product.price, 0);

  return (
    <Ctx.Provider
      value={{
        items, isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        add, remove, setQty,
        clear: () => setItems([]),
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
