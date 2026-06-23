import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart, formatINR } from "@/context/CartContext";
import { Minus, Plus, Trash2, ArrowRight, ShieldCheck, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Bag — STUDIO/DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

const FREE_SHIP = 999;

function CartPage() {
  const { items, remove, setQty, subtotal } = useCart();
  const navigate = useNavigate();
  const remaining = Math.max(0, FREE_SHIP - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP) * 100);
  const shipping = subtotal >= FREE_SHIP ? 0 : 99;

  if (items.length === 0) {
    return (
      <section className="px-4 md:px-8 py-32 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <ShoppingBag className="size-16 text-muted-foreground/20 mb-6" />
        <div className="text-display text-muted-foreground/30 leading-none" style={{ fontSize: "clamp(60px, 10vw, 120px)" }}>
          EMPTY BAG
        </div>
        <p className="text-mono mt-6 text-muted-foreground" style={{ fontSize: "12px", letterSpacing: "0.2em" }}>
          NOTHING TO CHECK OUT. GO GRAB A FIT.
        </p>
        <Link
          to="/shop"
          className="mt-10 border border-border px-10 py-4 text-mono hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-2"
          style={{ fontSize: "11px", letterSpacing: "0.2em" }}
        >
          BROWSE DROPS <ArrowRight className="size-3.5" />
        </Link>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-16 pb-24">
      {/* Header */}
      <div className="mb-10 md:mb-16">
        <div className="text-mono text-primary mb-3 flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
          <span className="size-1 bg-primary rounded-full pulse-dot" />
          YOUR BAG
        </div>
        <h1 className="text-display leading-none" style={{ fontSize: "clamp(52px, 8vw, 100px)" }}>
          CHECKOUT.
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-16">
        {/* Cart Items */}
        <div>
          {/* Shipping Progress Bar */}
          <div className="mb-8 p-5 border border-border bg-surface/50">
            {subtotal >= FREE_SHIP ? (
              <p className="text-mono text-secondary flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>
                <span className="size-1.5 bg-secondary rounded-full pulse-dot inline-block" />
                FREE SHIPPING UNLOCKED ✓
              </p>
            ) : (
              <p className="text-mono text-muted-foreground flex justify-between" style={{ fontSize: "11px", letterSpacing: "0.2em" }}>
                <span>
                  ADD <span className="text-primary font-semibold">{formatINR(remaining)}</span> FOR FREE SHIPPING
                </span>
              </p>
            )}
            <div className="mt-4 h-1 overflow-hidden bg-background">
              <div
                className="h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? "var(--secondary)" : "var(--primary)",
                  boxShadow: pct > 0 ? `0 0 12px ${pct >= 100 ? "var(--secondary)" : "var(--primary)"}` : "none",
                }}
              />
            </div>
          </div>

          {/* Items List */}
          <ul className="divide-y divide-border border-y border-border">
            {items.map((it) => (
              <li key={it.product.slug + it.size} className="py-6 sm:py-8 flex gap-5 sm:gap-8 group">
                <Link
                  to="/product/$slug"
                  params={{ slug: it.product.slug }}
                  className="w-28 sm:w-36 overflow-hidden shrink-0 border border-border bg-surface block relative"
                  style={{ aspectRatio: "4/5" }}
                >
                  <img
                    src={it.product.image}
                    alt={it.product.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-mono text-muted-foreground mb-1.5" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
                          {it.product.category.toUpperCase()}
                        </div>
                        <Link
                          to="/product/$slug"
                          params={{ slug: it.product.slug }}
                          className="font-semibold hover:text-primary transition-colors text-base sm:text-lg leading-tight block"
                        >
                          {it.product.name}
                        </Link>
                        <div className="text-muted-foreground mt-2" style={{ fontSize: "13px" }}>
                          SIZE {it.size}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-mono font-bold block" style={{ fontSize: "15px" }}>
                          {formatINR(it.product.price * it.qty)}
                        </span>
                        {it.product.compareAt && (
                          <span className="text-mono text-muted-foreground line-through block mt-1" style={{ fontSize: "11px" }}>
                            {formatINR(it.product.compareAt * it.qty)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-6">
                    <div className="flex items-center border border-border bg-surface h-10">
                      <button
                        className="h-full px-3 sm:px-4 hover:text-primary transition-colors hover:bg-background"
                        onClick={() => setQty(it.product.slug, it.size, it.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="text-mono text-center w-8" style={{ fontSize: "13px" }}>{it.qty}</span>
                      <button
                        className="h-full px-3 sm:px-4 hover:text-primary transition-colors hover:bg-background"
                        onClick={() => setQty(it.product.slug, it.size, it.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(it.product.slug, it.size)}
                      className="text-mono text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors border-b border-transparent hover:border-destructive pb-0.5"
                      style={{ fontSize: "10px", letterSpacing: "0.15em" }}
                    >
                      <Trash2 className="size-3" /> REMOVE
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="bg-surface border border-border p-6 sm:p-8 relative overflow-hidden grain">
            {/* Top corner accents */}
            <div className="absolute top-0 left-0 size-4 border-t border-l border-primary/50" />
            <div className="absolute top-0 right-0 size-4 border-t border-r border-primary/50" />

            <h2 className="text-display mb-6 tracking-wider" style={{ fontSize: "32px" }}>ORDER SUMMARY</h2>
            
            <div className="space-y-4 text-mono relative z-10" style={{ fontSize: "12px", letterSpacing: "0.15em" }}>
              <div className="flex justify-between text-muted-foreground">
                <span>SUBTOTAL</span>
                <span className="text-foreground">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SHIPPING</span>
                <span className={shipping === 0 ? "text-secondary font-bold" : "text-foreground"}>
                  {shipping === 0 ? "FREE" : formatINR(shipping)}
                </span>
              </div>
              
              <div className="border-t border-border pt-5 mt-5">
                <div className="flex justify-between items-end">
                  <span className="text-muted-foreground">TOTAL</span>
                  <div className="text-right">
                    <span className="text-mono text-muted-foreground block mb-1" style={{ fontSize: "10px" }}>INR</span>
                    <span className="text-display text-primary glow-primary-sm leading-none" style={{ fontSize: "40px" }}>
                      {formatINR(subtotal + shipping)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: "/checkout" })}
              className="w-full mt-8 bg-foreground text-background font-bold text-mono flex items-center justify-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300 relative z-10 group"
              style={{ height: "60px", fontSize: "13px", letterSpacing: "0.25em" }}
            >
              PROCEED TO CHECKOUT 
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-mono text-muted-foreground relative z-10" style={{ fontSize: "10px", letterSpacing: "0.15em" }}>
              <ShieldCheck className="size-3.5 text-primary" /> SECURE ENCRYPTED CHECKOUT
            </div>
          </div>
          
          <Link
            to="/shop"
            className="block mt-6 text-center text-mono text-muted-foreground hover:text-primary transition-colors"
            style={{ fontSize: "11px", letterSpacing: "0.2em" }}
          >
            ← CONTINUE SHOPPING
          </Link>
        </aside>
      </div>
    </section>
  );
}
