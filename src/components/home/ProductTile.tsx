import { useEffect, useMemo, useState } from "react";
import { skeletonStyle } from "@/lib/skeleton";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useQuickAdd } from "@/context/QuickAddContext";
import { responsiveImage } from "@/lib/image";
import { useTouchHover } from "@/hooks/useTouchHover";

// One product card used by every product carousel on the homepage
// (Best Sellers, New Arrivals, Sale). Photo on top; name and price below it.

export function ProductTile({ product, sizeClass }: { product: Product & { tag?: string }; sizeClass: string }) {
  const { add } = useCart();
  const { openQuickAdd } = useQuickAdd();
  const [mouseHover, setHover] = useState(false);
  // Phones: touching the tile and scrolling counts as hovering it.
  const { ref: tileRef, touchHover } = useTouchHover<HTMLAnchorElement>();
  const hover = mouseHover || touchHover;
  const [showSizes, setShowSizes] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);

  // All product photos (main image, hover image, gallery)
  const photos = useMemo(() => {
    const list = [
      product.image,
      product.hoverImage,
      ...(product.gallery ?? []).map((g) => g.url),
    ].filter(Boolean);
    return Array.from(new Set(list));
  }, [product.image, product.hoverImage, product.gallery]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Auto-scroll through next photos on hover
  useEffect(() => {
    if (!hover || photos.length <= 1) {
      setActivePhotoIndex(0);
      return;
    }
    // Phone touch-hover: straight to the second photo, and it stays.
    if (touchHover && !mouseHover) {
      setActivePhotoIndex(1);
      return;
    }

    const interval = setInterval(() => {
      setActivePhotoIndex((prev) => (prev + 1) % photos.length);
    }, 1400);

    return () => clearInterval(interval);
  }, [hover, touchHover, mouseHover, photos.length]);

  // Scrub through photos as mouse moves across the card width
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (photos.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0) {
      const xRatio = (e.clientX - rect.left) / rect.width;
      const index = Math.min(photos.length - 1, Math.max(0, Math.floor(xRatio * photos.length)));
      setActivePhotoIndex(index);
    }
  };

  const handleQuickAdd = (opt: VariantStock) => {
    if (!opt.inStock) return;
    add(product, opt.size, 1, opt.variantId, opt.stock);
    setShowSizes(false);
  };

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      ref={tileRef}
      className={`group relative shrink-0 flex flex-col text-left ${sizeClass}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowSizes(false); setActivePhotoIndex(0); }}
      onMouseMove={handleMouseMove}
    >
      {/* Photo area: fills the card above the name and price */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-surface rounded-2xl">
        {/* Product Photos Stack with Crossfade */}
        {photos.map((src, i) => (
          <img
            key={src + i}
            {...responsiveImage(src, { maxWidth: 828, sizes: "(min-width: 768px) 290px, (min-width: 640px) 260px, 220px" })}
            style={skeletonStyle}
            alt={i === 0 ? product.name : ""}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-400 ease-out ${i === activePhotoIndex ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
              }`}
          />
        ))}

        {product.tag && (
          <span
            className="absolute top-2.5 left-2.5 z-10 text-mono font-semibold uppercase text-zinc-950 bg-white/85 backdrop-blur-md border border-white/40 px-2.5 py-0.5 leading-none shadow-xs rounded-full"
            style={{ fontSize: "9px", letterSpacing: "0.14em" }}
          >
            {product.tag.toUpperCase()}
          </span>
        )}

        {/* Quick add — open centered modal */}
        <button
          aria-label="Quick add to cart"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickAdd(product); }}
          className={`absolute bottom-3 right-3 size-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-20 ${hover ? "md:opacity-100 md:scale-100" : "md:opacity-0 md:scale-90 opacity-100"
            } bg-black text-white hover:bg-black/80`}
        >
          <ShoppingBag className="size-4" />
        </button>

        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ${showSizes ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
            }`}
        >
          <div className="flex flex-wrap justify-center gap-1 p-2 bg-background/95 backdrop-blur-sm">
            {sizeOptions.map((opt) => (
              <button
                key={opt.variantId ?? opt.size}
                disabled={!opt.inStock}
                onClick={(e) => { e.preventDefault(); handleQuickAdd(opt); }}
                className={`rounded-full px-2.5 py-1 text-mono font-semibold border transition-colors ${opt.inStock
                    ? "border-foreground/30 hover:bg-foreground hover:text-background"
                    : "border-border opacity-30 line-through cursor-not-allowed"
                  }`}
                style={{ fontSize: "10px" }}
              >
                {opt.size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Name and price, below the photo. Fixed minimum height (room for a
          two-line name + price) so every card's photo is the same size. */}
      <div className="pt-3 min-h-[4.5rem] shrink-0 flex flex-col items-center gap-1 text-center min-w-0">
        <p className="text-sm sm:text-base font-bold uppercase tracking-[0.02em] leading-snug text-foreground">{product.name}</p>
        <p className="text-mono text-sm font-semibold text-foreground/80">{formatINR(product.price)}</p>
      </div>
    </Link>
  );
}
