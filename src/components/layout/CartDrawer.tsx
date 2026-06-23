import { useCart, formatINR } from "@/context/CartContext";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const FREE_SHIP = 999;

export function CartDrawer() {
  const { isOpen, close, items, remove, setQty, subtotal } = useCart();
  const navigate = useNavigate();
  const remaining = Math.max(0, FREE_SHIP - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP) * 100);
  const shipping = subtotal >= FREE_SHIP ? 0 : 99;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] flex flex-col transition-transform duration-300 ease-out border-l border-border ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-surface)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 border-b border-border" style={{ height: "60px" }}>
          <div className="flex items-center gap-3">
            <ShoppingBag className="size-4 text-primary" />
            <h2 className="text-display tracking-wider" style={{ fontSize: "22px" }}>YOUR BAG</h2>
            {items.length > 0 && (
              <span className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.2em" }}>
                ({items.reduce((a, i) => a + i.qty, 0)})
              </span>
            )}
          </div>
          <button
            id="cart-close-btn"
            onClick={close}
            aria-label="Close cart"
            className="size-8 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Shipping progress */}
        <div className="px-5 py-4 border-b border-border" style={{ background: "var(--color-surface)" }}>
          {subtotal >= FREE_SHIP ? (
            <p className="text-mono text-secondary flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>
              <span className="size-1.5 bg-secondary rounded-full pulse-dot inline-block" />
              FREE SHIPPING UNLOCKED ✓
            </p>
          ) : (
            <p className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.2em" }}>
              ADD{" "}
              <span className="text-primary font-semibold">{formatINR(remaining)}</span>
              {" "}FOR FREE SHIPPING
            </p>
          )}
          <div className="mt-2.5 h-0.5 overflow-hidden" style={{ background: "var(--color-muted)" }}>
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: pct >= 100 ? "var(--secondary)" : "var(--primary)",
                boxShadow: pct > 0 ? `0 0 10px ${pct >= 100 ? "var(--secondary)" : "var(--primary)"}` : "none",
              }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
              <ShoppingBag className="size-12 text-muted-foreground/20" />
              <div className="text-display text-muted-foreground/30" style={{ fontSize: "48px" }}>EMPTY</div>
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>No drops in your bag yet.</p>
              <button
                onClick={close}
                className="mt-2 border border-border px-8 py-2.5 text-mono text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                BROWSE DROPS
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.product.slug + it.size} className="p-5 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-24 overflow-hidden border border-border shrink-0" style={{ background: "var(--color-muted)" }}>
                    <img
                      src={it.product.image}
                      alt={it.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
                      {it.product.category.toUpperCase()}
                    </div>
                    <div className="font-semibold leading-tight mt-0.5 truncate" style={{ fontSize: "13px" }}>
                      {it.product.name}
                    </div>
                    <div className="text-muted-foreground mt-0.5" style={{ fontSize: "11px" }}>
                      SIZE {it.size}
                    </div>

                    {/* Qty + Price */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-border">
                        <button
                          className="size-7 flex items-center justify-center hover:text-primary transition-colors"
                          onClick={() => setQty(it.product.slug, it.size, it.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-mono w-7 text-center" style={{ fontSize: "12px" }}>{it.qty}</span>
                        <button
                          className="size-7 flex items-center justify-center hover:text-primary transition-colors"
                          onClick={() => setQty(it.product.slug, it.size, it.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-mono font-semibold" style={{ fontSize: "13px" }}>
                          {formatINR(it.product.price * it.qty)}
                        </span>
                        <button
                          onClick={() => remove(it.product.slug, it.size)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-5 space-y-4" style={{ background: "var(--color-muted)" }}>
            {/* Breakdown */}
            <div className="space-y-2 text-mono" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
              <div className="flex justify-between text-muted-foreground">
                <span>SUBTOTAL</span>
                <span className="text-foreground">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SHIPPING</span>
                <span className={shipping === 0 ? "text-secondary" : "text-foreground"}>
                  {shipping === 0 ? "FREE" : formatINR(shipping)}
                </span>
              </div>
              <div
                className="flex justify-between border-t border-border pt-2 mt-2"
                style={{ fontSize: "13px" }}
              >
                <span>TOTAL</span>
                <span className="text-display" style={{ fontSize: "24px" }}>{formatINR(subtotal + shipping)}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              id="cart-checkout-btn"
              disabled={items.length === 0}
              onClick={() => { close(); navigate({ to: "/cart" }); }}
              className="w-full bg-primary text-primary-foreground font-bold text-mono flex items-center justify-center gap-2 hover:glow-primary transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ height: "52px", fontSize: "11px", letterSpacing: "0.25em" }}
            >
              CHECKOUT <ArrowRight className="size-4" />
            </button>
            <p className="text-mono text-muted-foreground text-center" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
              TAX & SHIPPING CALCULATED AT CHECKOUT
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
