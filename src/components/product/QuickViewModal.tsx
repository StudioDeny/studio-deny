import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { X, ArrowRight, Heart } from "lucide-react";
import type { Product } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: Props) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const wished = has(product.slug);

  useEffect(() => {
    if (open) { setSize(null); setAdded(false); }
  }, [open, product.slug]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = () => {
    if (!size) return;
    add(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        className="relative z-10 w-full sm:max-w-[680px] bg-background border border-border animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 size-8 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative hidden sm:block" style={{ aspectRatio: "4/5", background: "var(--color-surface)" }}>
            <img src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
            {product.badge && (
              <span
                className="absolute top-3 left-3 text-mono font-semibold px-2 py-1 bg-primary text-primary-foreground"
                style={{ fontSize: "9px", letterSpacing: "0.25em" }}
              >
                {product.badge}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col">
            <div className="text-mono text-primary" style={{ fontSize: "10px", letterSpacing: "0.3em" }}>
              {product.category.toUpperCase()}
            </div>
            <h2 className="text-display mt-2 leading-[0.9]" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
              {product.name}
            </h2>
            <div className="mt-3 flex items-baseline gap-3 text-mono">
              <span style={{ fontSize: "22px" }}>{formatINR(product.price)}</span>
              {product.compareAt && (
                <>
                  <span className="text-muted-foreground line-through" style={{ fontSize: "14px" }}>{formatINR(product.compareAt)}</span>
                  <span className="text-secondary" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>
                    -{Math.round(((product.compareAt - product.price) / product.compareAt) * 100)}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed line-clamp-3" style={{ fontSize: "13px" }}>
              {product.description}
            </p>

            {/* Sizes */}
            <div className="mt-6">
              <div className="text-mono text-muted-foreground mb-3" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
                SELECT SIZE
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-10 border text-mono transition-all duration-150 ${
                      size === s
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-surface/50"
                    }`}
                    style={{ fontSize: "12px" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!size}
                className={`flex-1 h-12 font-bold text-mono transition-all duration-300 ${
                  added
                    ? "bg-secondary text-secondary-foreground"
                    : size
                    ? "bg-primary text-primary-foreground hover:glow-primary"
                    : "bg-surface border border-border text-muted-foreground cursor-not-allowed"
                }`}
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                {added ? "✓ ADDED TO BAG" : size ? "ADD TO BAG" : "SELECT SIZE"}
              </button>
              <button
                onClick={() => toggle(product.slug)}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                className={`w-12 h-12 border flex items-center justify-center transition-all ${
                  wished ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                <Heart className={`size-4 ${wished ? "fill-primary" : ""}`} />
              </button>
            </div>

            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              onClick={onClose}
              className="mt-5 text-mono text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors self-start"
              style={{ fontSize: "10px", letterSpacing: "0.2em" }}
            >
              VIEW FULL DETAILS <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
