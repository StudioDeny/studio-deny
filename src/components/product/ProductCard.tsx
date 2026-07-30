import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

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
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);
  const [added, setAdded] = useState(false);
  const wished = has(product.slug);

  const handleOpenSizes = () => {
    setShowSizes(true);
    getVariantStock(product.slug, product.sizes).then(setSizeOptions);
  };

  const handleQuickAdd = (opt: VariantStock) => {
    if (!opt.inStock) return;
    add(product, opt.size, 1, opt.variantId, opt.stock);
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
          className="relative overflow-hidden"
          style={{ aspectRatio: "3/4", background: "var(--color-surface)" }}
        >
          {/* Main image */}
          {product.imageType === "video" ? (
            <video
              src={product.image}
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover transition-all duration-600"
              style={{ opacity: hover ? 0 : 1, transform: hover ? "scale(1.06)" : "scale(1)" }}
            />
          ) : (
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
          )}
          {/* Hover image */}
          {product.hoverImageType === "video" ? (
            <video
              src={product.hoverImage}
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover transition-all duration-600"
              style={{ opacity: hover ? 1 : 0, transform: hover ? "scale(1)" : "scale(1.04)" }}
            />
          ) : (
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
          )}

          {/* Gradient on hover */}
          <div
            className="absolute inset-0 transition-opacity duration-400"
            style={{
              opacity: hover ? 1 : 0,
              background: "linear-gradient(to top, rgba(9,9,9,0.6) 0%, transparent 60%)",
            }}
          />

          {/* Badges */}
          {(product.badge || product.isBestSeller) && (
            <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
              {product.isBestSeller && (
                <span
                  className="text-mono font-semibold px-2 py-1 bg-accent text-accent-foreground"
                  style={{ fontSize: "9px", letterSpacing: "0.25em" }}
                >
                  BEST SELLER
                </span>
              )}
              {product.badge && (
                <span
                  className={`text-mono font-semibold px-2 py-1 ${
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
            </div>
          )}

          {/* Wishlist — plain heart, no box */}
          <button
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={(e) => { e.preventDefault(); toggle(product.slug); }}
            className={`absolute top-2.5 right-2.5 p-1.5 transition-all duration-200 ${
              wished ? "text-primary" : "text-white/70 hover:text-primary"
            }`}
          >
            <Heart className={`size-4 drop-shadow ${wished ? "fill-primary" : ""}`} />
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
                onClick={(e) => { e.preventDefault(); handleOpenSizes(); }}
                className="w-full bg-foreground/95 text-background text-mono font-bold py-2.5 md:py-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                <ShoppingBag className="size-3.5" /> QUICK ADD
              </button>
            ) : (
              <div className="flex bg-foreground text-background overflow-x-auto">
                {sizeOptions.map((opt) => (
                  <button
                    key={opt.variantId ?? opt.size}
                    disabled={!opt.inStock}
                    onClick={(e) => { e.preventDefault(); handleQuickAdd(opt); }}
                    className={`flex-1 min-w-[36px] text-mono py-2.5 md:py-3 transition-colors border-l border-black/10 first:border-l-0 ${
                      opt.inStock ? "hover:bg-primary hover:text-primary-foreground" : "opacity-30 line-through cursor-not-allowed"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    {opt.size}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="mt-3 px-0.5">
          <h3
            className="font-semibold leading-snug group-hover:text-primary transition-colors duration-200 uppercase tracking-[0.15em]"
            style={{ fontSize: "14px" }}
          >
            {product.name}
          </h3>
        </div>
      </Link>
    </div>
  );
}
