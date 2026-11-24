import { useEffect, useRef, useState } from "react";
import { SiteLink } from "@/components/ui/SiteLink";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { listProducts, type Product } from "@/lib/productsStore";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading } from "@/components/ui/EditorialHeading";
import { useWebsiteSectionConfig } from "@/lib/websiteSections";
import { ProductTile } from "./ProductTile";

type ArrivalsConfig = { cta_label: string };

const DEFAULTS: ArrivalsConfig = { cta_label: "" };

// The products shown here are the ones ticked "New Arrival" in the product form,
// newest first. "Explore collection" and "View All" open that filtered shop page.
const NEW_ARRIVALS_HREF = "/shop";

// Same uniform tile size as the Best Sellers section.
const TILE_SIZE_CLASS = "w-[220px] sm:w-[260px] md:w-[290px] h-[370px] sm:h-[440px]";

export function NewArrivalsGrid() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<ArrivalsConfig>("new_arrivals", DEFAULTS);
  const [products, setProducts] = useState<Product[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heading = useSectionHeading("new_arrivals", "NEW ARRIVALS");

  useEffect(() => {
    listProducts().then((all) => setProducts(all.filter((p) => p.isNewArrival)));
  }, []);

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
          href={NEW_ARRIVALS_HREF}
          className="btn-fill relative inline-flex items-center whitespace-nowrap border border-foreground hover:border-white px-6 py-3 text-mono text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-foreground transition-colors duration-500 rounded-full"
        >
          <span className="btn-fill-bg bg-white" aria-hidden="true" />
          <span className="btn-fill-front inline-flex items-center gap-2">
            {cfg.cta_label || "EXPLORE COLLECTION"}
          </span>
          <span className="btn-fill-back inline-flex items-center gap-2 text-black" aria-hidden="true">
            {cfg.cta_label || "EXPLORE COLLECTION"}
          </span>
        </SiteLink>
      </div>

    </section>
  );
}
