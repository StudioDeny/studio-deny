import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

import { useQuickAdd } from "@/context/QuickAddContext";

export function ProductCard({
  product,
  index = 0
}: {
  product: Product;
  index?: number;
}) {
  const { add } = useCart();
  const { openQuickAdd } = useQuickAdd();
  const { has, toggle } = useWishlist();
  const [hover, setHover] = useState(false);
  const wished = has(product.slug);
  const [showSizes, setShowSizes] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);
  const [added, setAdded] = useState(false);

  // Mobile: swipeable photo strip (image, hover image, gallery) with dots.
  // Desktop keeps the hover crossfade below instead.
  const photos = Array.from(new Set([product.image, product.hoverImage, ...(product.gallery ?? []).map((g) => g.url)].filter(Boolean)));
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const handleMobileScroll = () => {
    const el = mobileScrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setMobilePhotoIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const hasDiscount = product.compareAt && product.compareAt > product.price;
  const discountPct = hasDiscount ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100) : 0;
  // A "SALE" badge becomes the dynamic %-off instead; other badges (NEW
  // DROP/LAST PIECE/SOLD OUT) are unaffected and still render top-left.
  const showPctBadge = product.badge === "SALE" && hasDiscount;
  const topLeftBadge = product.badge && product.badge !== "SALE" ? product.badge : null;

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
          {/* Desktop: crossfade main <-> hover image */}
          <div className="hidden md:block">
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
          </div>

          {/* Mobile: swipeable photo strip + dot pagination (no hover on touch) */}
          <div
            ref={mobileScrollerRef}
            onScroll={handleMobileScroll}
            className="md:hidden absolute inset-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {photos.map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt={i === 0 ? product.name : ""}
                loading={i === 0 ? undefined : "lazy"}
                className="w-full h-full object-cover shrink-0 snap-center"
              />
            ))}
          </div>
          {photos.length > 1 && (
            <div className="md:hidden absolute bottom-2 inset-x-0 flex items-center justify-center gap-1 z-[1]">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition-colors ${i === mobilePhotoIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}

          {/* Badges */}
          {(topLeftBadge || product.isBestSeller) && (
            <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
              {product.isBestSeller && (
                <span
                  className="text-mono font-semibold px-2 py-1 bg-accent text-accent-foreground"
                  style={{ fontSize: "9px", letterSpacing: "0.25em" }}
                >
                  BEST SELLER
                </span>
              )}
              {topLeftBadge && (
                <span
                  className={`text-mono font-semibold px-2 py-1 ${
                    topLeftBadge === "SOLD OUT"
                      ? "bg-muted text-muted-foreground"
                      : topLeftBadge === "LAST PIECE"
                      ? "bg-primary text-primary-foreground glow-primary-sm"
                      : "bg-primary text-primary-foreground"
                  }`}
                  style={{ fontSize: "9px", letterSpacing: "0.25em" }}
                >
                  {topLeftBadge}
                </span>
              )}
            </div>
          )}

          {/* Dynamic discount badge — replaces the SALE badge, bottom-left */}
          {showPctBadge && (
            <span
              className="absolute bottom-2.5 left-2.5 bg-red-600 text-white font-bold px-2 py-1"
              style={{ fontSize: "10px", letterSpacing: "0.05em" }}
            >
              -{discountPct}%
            </span>
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

          {/* Quick add — small circular icon bottom-right; click expands a pill-style
              size row overlaying the same spot. Icon is always visible on mobile
              (no hover there), hover-gated on desktop. Cursor leaving the card
              (or tapping away, via the Link nav on outside taps) collapses it. */}
          <button
            aria-label="Quick add to cart"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickAdd(product); }}
            className={`absolute bottom-2.5 right-2.5 size-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              hover ? "md:opacity-100 md:scale-100" : "md:opacity-0 md:scale-90 opacity-100"
            } bg-black text-white hover:bg-black/80`}
          >
            <ShoppingBag className="size-4" />
          </button>

          <div
            className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
              showSizes ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex flex-wrap justify-center gap-1.5 p-2.5 bg-background/95 backdrop-blur-sm">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.variantId ?? opt.size}
                  disabled={!opt.inStock}
                  onClick={(e) => { e.preventDefault(); handleQuickAdd(opt); }}
                  className={`rounded-full px-3.5 py-1.5 text-mono font-semibold border transition-colors ${
                    opt.inStock
                      ? "border-foreground/30 hover:bg-foreground hover:text-background"
                      : "border-border opacity-30 line-through cursor-not-allowed"
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  {opt.size}
                </button>
              ))}
            </div>
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
          <div className="mt-1 flex items-baseline gap-2 text-mono">
            <span style={{ fontSize: "13px" }}>{formatINR(product.price)}</span>
            {hasDiscount && (
              <span className="text-muted-foreground line-through" style={{ fontSize: "11px" }}>
                {formatINR(product.compareAt!)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
