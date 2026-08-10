import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listProducts, getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { useQuickAdd } from "@/context/QuickAddContext";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";

type ArrivalsConfig = { cta_label: string; product_slugs: string[] };

const DEFAULTS: ArrivalsConfig = {
  cta_label: "SHOP THE DROP",
  product_slugs: [],
};

// Mixed tile shapes cycling every 3: tall rectangle, square, narrow rectangle — same look as Popular Now.
const SIZE_CLASSES = [
  "w-[210px] sm:w-[260px] h-[320px] sm:h-[380px]",
  "w-[210px] sm:w-[260px] h-[210px] sm:h-[260px]",
  "w-[150px] sm:w-[190px] h-[320px] sm:h-[380px]",
];

function ArrivalTile({ product, sizeClass }: { product: Product; sizeClass: string }) {
  const { add } = useCart();
  const { openQuickAdd } = useQuickAdd();
  const [hover, setHover] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);
  const [added, setAdded] = useState(false);

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
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`group relative shrink-0 overflow-hidden bg-surface ${sizeClass}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowSizes(false); }}
    >
      {product.imageType === "video" ? (
        <video
          src={product.image}
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      )}
      {product.badge && (
        <span className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-mono font-semibold px-2 py-1" style={{ fontSize: "9px", letterSpacing: "0.2em" }}>
          {product.badge.toUpperCase()}
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
      <div className="absolute bottom-2.5 left-2.5 right-2.5">
        <p className="text-white text-xs font-semibold uppercase tracking-[0.06em] truncate">{product.name}</p>
        <p className="text-white/80 text-mono text-[11px]">{formatINR(product.price)}</p>
      </div>

      {/* Quick add — open centered modal */}
      <button
        aria-label="Quick add to cart"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickAdd(product); }}
        className={`absolute bottom-2 right-2 size-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          hover ? "md:opacity-100 md:scale-100" : "md:opacity-0 md:scale-90 opacity-100"
        } bg-black text-white hover:bg-black/80`}
      >
        <ShoppingBag className="size-3.5" />
      </button>

      <div
        className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
          showSizes ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-wrap justify-center gap-1 p-2 bg-background/95 backdrop-blur-sm">
          {sizeOptions.map((opt) => (
            <button
              key={opt.variantId ?? opt.size}
              disabled={!opt.inStock}
              onClick={(e) => { e.preventDefault(); handleQuickAdd(opt); }}
              className={`rounded-full px-2.5 py-1 text-mono font-semibold border transition-colors ${
                opt.inStock
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
    </Link>
  );
}

export function NewArrivalsGrid() {
  const [cfg, setCfg] = useState<ArrivalsConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heading = useSectionHeading("new_arrivals", "NEW ARRIVALS", { eyebrow: "FRESH OFF THE PRESS", subtitle: "" });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "new_arrivals")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        const cfgData = row.config as Partial<ArrivalsConfig>;
        if (cfgData) setCfg({
          cta_label: cfgData.cta_label || DEFAULTS.cta_label,
          product_slugs: cfgData.product_slugs ?? [],
        });
      });
  }, []);

  useEffect(() => {
    if (cfg.product_slugs.length === 0) { setProducts([]); return; }
    listProducts().then((all) => {
      const bySlug = new Map(all.map((p) => [p.slug, p]));
      const chosen = cfg.product_slugs.map((slug) => bySlug.get(slug)).filter(Boolean) as Product[];
      setProducts(chosen);
    });
  }, [cfg.product_slugs]);

  if (!visible || products.length === 0) return null;

  const slide = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-24 relative bg-[#E2E2E4]">
      <div className="px-4 sm:px-8 lg:px-16 mb-8 sm:mb-12 flex items-end justify-between flex-wrap gap-6">
        <div className="flex flex-col">
          {heading.eyebrow && (
            <span className="text-mono text-primary mb-2 text-xs tracking-[0.35em]">◢ {heading.eyebrow}</span>
          )}
          <EditorialHeading
            className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </EditorialHeading>
          {heading.subtitle && (
            <EditorialSubheading className="mt-3 max-w-xl text-sm sm:text-base opacity-80 text-mono" delay={0.2}>
              {heading.subtitle}
            </EditorialSubheading>
          )}
        </div>
        {cfg.cta_label && (
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 text-mono text-xs sm:text-sm tracking-[0.2em] uppercase border-b border-foreground/40 pb-1 hover:border-primary hover:text-primary transition-colors"
          >
            {cfg.cta_label}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => slide(-1)}
          className="hidden sm:flex absolute z-[2] left-2 lg:left-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => slide(1)}
          className="hidden sm:flex absolute z-[2] right-2 lg:right-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <ChevronRight className="size-5" />
        </button>

        <div ref={scrollerRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 px-4 sm:px-8 lg:px-16 no-scrollbar">
          {products.map((p, i) => (
            <ArrivalTile key={p.slug} product={p} sizeClass={SIZE_CLASSES[i % SIZE_CLASSES.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
