import { useEffect, useRef, useState, useMemo } from "react";
import { skeletonStyle } from "@/lib/skeleton";
import { Link } from "@tanstack/react-router";
import { SiteLink } from "@/components/ui/SiteLink";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listProducts, getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { useQuickAdd } from "@/context/QuickAddContext";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";
import { responsiveImage } from "@/lib/image";
import { useTouchHover } from "@/hooks/useTouchHover";

type PopularNowItem = { slug: string; tag?: string };
type PopularNowConfig = { items: PopularNowItem[] };

const DEFAULTS: PopularNowConfig = { items: [] };

// "Explore collection" and the "View all" tile open the Best Sellers page:
// every product with "Best Seller" ticked in its product form.
const BEST_SELLERS_HREF = "/shop";

// Every bestseller tile (and the "View All" tile) uses this one uniform size.
const TILE_SIZE_CLASS = "w-[220px] sm:w-[260px] md:w-[290px] h-[370px] sm:h-[440px]";

import { useWebsiteSectionConfig } from "@/lib/websiteSections";
import { ProductTile } from "./ProductTile";

export function PopularNowGrid() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<PopularNowConfig>("popular_now", DEFAULTS);
  const [products, setProducts] = useState<(Product & { tag?: string })[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heading = useSectionHeading("popular_now", "BEST SELLERS");

  useEffect(() => {
    if (cfg.items.length === 0) { setProducts([]); return; }
    listProducts().then((all) => {
      const bySlug = new Map(all.map((p) => [p.slug, p]));
      const withTags: (Product & { tag?: string })[] = [];
      for (const item of cfg.items) {
        const p = bySlug.get(item.slug);
        if (p) withTags.push({ ...p, tag: item.tag });
      }
      setProducts(withTags);
    });
  }, [cfg.items]);

  if (!visible || products.length === 0) return null;

  const slide = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-24 relative bg-[#E2E2E4]">
      <div className="px-4 sm:px-8 lg:px-16 mb-8 sm:mb-12 flex flex-col items-center gap-6">
        <EditorialHeading
          className="type-h2"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </EditorialHeading>
      </div>

      <div className="group/carousel relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => slide(-1)}
          className="hidden sm:flex absolute rounded-full opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto z-[2] left-2 lg:left-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => slide(1)}
          className="hidden sm:flex absolute rounded-full opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto z-[2] right-2 lg:right-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          <ChevronRight className="size-5" />
        </button>

        <div ref={scrollerRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 px-4 sm:px-8 lg:px-16 no-scrollbar">
          {products.map((p) => (
            <ProductTile key={p.slug} product={p} sizeClass={TILE_SIZE_CLASS} />
          ))}
        </div>
      </div>

      <div className="mt-10 sm:mt-12 flex justify-center px-4">
        <SiteLink
          href={BEST_SELLERS_HREF}
          className="btn-fill relative inline-flex items-center whitespace-nowrap border border-foreground hover:border-white px-6 py-3 text-mono text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-foreground transition-colors duration-500"
        >
          <span className="btn-fill-bg bg-white" aria-hidden="true" />
          <span className="btn-fill-front inline-flex items-center gap-2">
            EXPLORE COLLECTION
          </span>
          <span className="btn-fill-back inline-flex items-center gap-2 text-black" aria-hidden="true">
            EXPLORE COLLECTION
          </span>
        </SiteLink>
      </div>

      {/* Section Segregation Line */}
      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-black/20 border-b border-black/10" />
    </section>
  );
}
