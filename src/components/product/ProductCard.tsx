import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { QuickViewModal } from "./QuickViewModal";

export function ProductCard({ 
  product, 
  index = 0
}: { 
  product: Product; 
  index?: number;
}) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [hover, setHover] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [added, setAdded] = useState(false);
  const [quickView, setQuickView] = useState(false);
  const wished = has(product.slug);

  const handleQuickAdd = (size: string) => {
    add(product, size);
    setShowSizes(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div
      className="group relative animate-in fade-in slide-in-from-bottom-3 duration-600"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowSizes(false); }}
    >
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        id={`product-card-${product.slug}`}
        className="block"
      >
        {/* Image container */}
        <div
          className="relative overflow-hidden border border-border"
          style={{ aspectRatio: "4/5", background: "var(--color-surface)" }}
        >
          {/* Main image */}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={800}
            height={1000}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-600"
            style={{
              opacity: hover ? 0 : 1,
              transform: hover ? "scale(1.06)" : "scale(1)",
            }}
          />
          {/* Hover image */}
          <img
            src={product.hoverImage}
            alt=""
            loading="lazy"
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover transition-all duration-600"
            style={{
              opacity: hover ? 1 : 0,
              transform: hover ? "scale(1)" : "scale(1.04)",
            }}
          />

          {/* Gradient on hover */}
          <div
            className="absolute inset-0 transition-opacity duration-400"
            style={{
              opacity: hover ? 1 : 0,
              background: "linear-gradient(to top, rgba(9,9,9,0.6) 0%, transparent 60%)",
            }}
          />

          {/* Quick view trigger */}
          <button
            aria-label="Quick view"
            onClick={(e) => { e.preventDefault(); setQuickView(true); }}
            className={`absolute inset-x-0 flex items-center justify-center transition-all duration-300 ${
              hover && !showSizes ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <span
              className="text-mono text-white/90 bg-black/40 backdrop-blur-sm px-4 py-2 border border-white/20 flex items-center gap-2 hover:bg-black/60 transition-colors"
              style={{ fontSize: "10px", letterSpacing: "0.3em" }}
            >
              <Eye className="size-3.5" /> QUICK VIEW
            </span>
          </button>

          {/* Badge */}
          {product.badge && (
            <span
              className={`absolute top-2.5 left-2.5 text-mono font-semibold px-2 py-1 ${
                product.badge === "SALE"
                  ? "bg-secondary text-secondary-foreground"
                  : product.badge === "SOLD OUT"
                  ? "bg-muted text-muted-foreground"
                  : product.badge === "LAST PIECE"
                  ? "bg-primary text-primary-foreground glow-primary-sm"
                  : "bg-primary text-primary-foreground"
              }`}
              style={{ fontSize: "9px", letterSpacing: "0.25em" }}
            >
              {product.badge}
            </span>
          )}

          {/* Wishlist button */}
          <button
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={(e) => { e.preventDefault(); toggle(product.slug); }}
            className={`absolute top-2.5 right-2.5 size-8 border backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${
              wished
                ? "border-primary bg-primary/20 text-primary"
                : "border-border bg-background/50 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <Heart className={`size-3.5 ${wished ? "fill-primary" : ""}`} />
          </button>

          {/* Quick add — desktop hover, always visible (compact) on mobile */}
          <div
            className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
              hover ? "md:translate-y-0 md:opacity-100" : "md:translate-y-full md:opacity-0"
            }`}
          >
            {added ? (
              <div
                className="w-full text-mono font-bold text-center py-2.5 md:py-3 bg-secondary text-secondary-foreground"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                ✓ ADDED
              </div>
            ) : !showSizes ? (
              <button
                onClick={(e) => { e.preventDefault(); setShowSizes(true); }}
                className="w-full bg-foreground/95 text-background text-mono font-bold py-2.5 md:py-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                <ShoppingBag className="size-3.5" /> QUICK ADD
              </button>
            ) : (
              <div className="flex bg-foreground text-background overflow-x-auto">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.preventDefault(); handleQuickAdd(s); }}
                    className="flex-1 min-w-[36px] text-mono py-2.5 md:py-3 hover:bg-primary hover:text-primary-foreground transition-colors border-l border-black/10 first:border-l-0"
                    style={{ fontSize: "11px" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="mt-3 px-0.5">
          <div className="text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.3em" }}>
            {product.category.toUpperCase()}
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <h3
              className="font-semibold leading-snug group-hover:text-primary transition-colors duration-200 uppercase tracking-[0.15em]"
              style={{ fontSize: "14px" }}
            >
              {product.name}
            </h3>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 text-mono">
            <span style={{ fontSize: "13px" }}>{formatINR(product.price)}</span>
            {product.compareAt && (
              <span className="text-muted-foreground line-through" style={{ fontSize: "11px" }}>
                {formatINR(product.compareAt)}
              </span>
            )}
            {product.compareAt && (
              <span className="text-secondary" style={{ fontSize: "10px", letterSpacing: "0.1em" }}>
                -{Math.round(((product.compareAt - product.price) / product.compareAt) * 100)}%
              </span>
            )}
          </div>
          {/* Size dots */}
          <div className="mt-2 flex gap-1">
            {product.sizes.slice(0, 5).map((s) => (
              <span
                key={s}
                className="text-mono text-muted-foreground/50"
                style={{ fontSize: "9px", letterSpacing: "0.1em" }}
              >
                {s}
              </span>
            ))}
            {product.sizes.length > 5 && (
              <span className="text-mono text-muted-foreground/40" style={{ fontSize: "9px" }}>+{product.sizes.length - 5}</span>
            )}
          </div>
        </div>
      </Link>

      <QuickViewModal product={product} open={quickView} onClose={() => setQuickView(false)} />
    </div>
  );
}
