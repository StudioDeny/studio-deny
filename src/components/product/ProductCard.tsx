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
                className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                style={{ opacity: hover ? 0 : 1, transform: hover ? "scale(1.02)" : "scale(1)" }}
              />
            ) : (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                width={800}
                height={1000}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                style={{
                  opacity: hover ? 0 : 1,
                  transform: hover ? "scale(1.02)" : "scale(1)",
                }}
              />
            )}
            {product.hoverImageType === "video" ? (
              <video
                src={product.hoverImage}
                autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                style={{ opacity: hover ? 1 : 0, transform: hover ? "scale(1.02)" : "scale(1)" }}
              />
            ) : (
              <img
                src={product.hoverImage}
                alt=""
                loading="lazy"
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                style={{
                  opacity: hover ? 1 : 0,
                  transform: hover ? "scale(1.02)" : "scale(1)",
                }}
              />
            )}
            {/* Gradient on hover */}
            <div
              className="absolute inset-0 transition-opacity duration-400"
              style={{
                opacity: hover ? 1 : 0,
                background: "linear-gradient(to top, rgba(9,9,9,0.5) 0%, transparent 60%)",
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
            className={`absolute top-2.5 right-2.5 p-1.5 transition-all duration-300 ease-out ${
              wished ? "text-primary opacity-100" : "text-white/70 hover:text-primary opacity-90 hover:opacity-100"
            }`}
          >
            <Heart className={`size-4 drop-shadow ${wished ? "fill-primary" : ""}`} />
          </button>

          {/* Quick add button */}
          <button
            aria-label="Quick add to cart"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickAdd(product); }}
            className={`absolute bottom-2.5 right-2.5 size-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out ${
              hover ? "md:opacity-100 md:scale-100" : "md:opacity-0 md:scale-95 opacity-100"
            } bg-black text-white hover:bg-black/85`}
          >
            <ShoppingBag className="size-4" />
          </button>

          <div
            className={`absolute inset-x-0 bottom-0 transition-all duration-300 ease-out ${
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

        {/* Product info — Increased size for legibility */}
        <div className="mt-3 px-0.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-medium text-xs sm:text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors tracking-wide truncate"
            >
              {product.name}
            </h3>
            <button
              aria-label="Quick add to cart"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickAdd(product); }}
              className="text-foreground/80 hover:text-primary transition-colors shrink-0 p-0.5"
            >
              <ShoppingBag className="size-4 sm:size-5" />
            </button>
          </div>

          <div className="flex items-baseline gap-2 text-mono">
            <span className="font-bold text-sm sm:text-base text-foreground">{formatINR(product.price)}</span>
            {hasDiscount && (
              <span className="text-muted-foreground line-through text-xs sm:text-sm">
                {formatINR(product.compareAt!)}
              </span>
            )}
          </div>

          {/* Color Swatch Dots */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              {product.colors.map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="size-3 sm:size-3.5 border border-foreground/40 block shrink-0"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
