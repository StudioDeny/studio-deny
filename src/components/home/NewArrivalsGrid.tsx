import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listProducts, getVariantStock, type Product, type VariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";

type ArrivalsConfig = { eyebrow: string; title: string; subtitle: string; cta_label: string; product_slugs: string[] };

const DEFAULTS: ArrivalsConfig = {
  eyebrow: "FRESH OFF THE PRESS",
  title: "NEW ARRIVALS",
  subtitle: "",
  cta_label: "SHOP THE DROP",
  product_slugs: [],
};

// Uneven card widths/heights, cycling every 3 tiles — same mixed-size look as Popular Now.
const SIZE_CLASSES = [
  "w-[210px] sm:w-[260px] h-[320px] sm:h-[380px]",
  "w-[150px] sm:w-[190px] h-[260px] sm:h-[300px]",
  "w-[150px] sm:w-[190px] h-[320px] sm:h-[380px]",
];

function ArrivalTile({ product, sizeClass }: { product: Product; sizeClass: string }) {
  const { add } = useCart();
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
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
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

      <div
        className={`absolute inset-x-0 bottom-0 transition-all duration-300 hidden md:block ${
          hover ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        {added ? (
          <div className="w-full text-mono font-bold text-center py-2 bg-secondary text-secondary-foreground" style={{ fontSize: "10px", letterSpacing: "0.15em" }}>
            ✓ ADDED
          </div>
        ) : !showSizes ? (
          <button
            onClick={(e) => { e.preventDefault(); handleOpenSizes(); }}
            className="w-full bg-foreground/95 text-background text-mono font-bold py-2 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5"
            style={{ fontSize: "10px", letterSpacing: "0.15em" }}
          >
            <ShoppingBag className="size-3" /> QUICK ADD
          </button>
        ) : (
          <div className="flex bg-foreground text-background overflow-x-auto no-scrollbar">
            {sizeOptions.map((opt) => (
              <button
                key={opt.variantId ?? opt.size}
                disabled={!opt.inStock}
                onClick={(e) => { e.preventDefault(); handleQuickAdd(opt); }}
                className={`flex-1 min-w-[30px] text-mono py-2 transition-colors border-l border-black/10 first:border-l-0 ${
                  opt.inStock ? "hover:bg-primary hover:text-primary-foreground" : "opacity-30 line-through cursor-not-allowed"
                }`}
                style={{ fontSize: "10px" }}
              >
                {opt.size}
              </button>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function NewArrivalsGrid() {
  const [cfg, setCfg] = useState<ArrivalsConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

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
          eyebrow: cfgData.eyebrow || DEFAULTS.eyebrow,
          title: cfgData.title || DEFAULTS.title,
          subtitle: cfgData.subtitle ?? DEFAULTS.subtitle,
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
    <section className="py-16 sm:py-24 relative">
      <div className="px-4 sm:px-8 lg:px-16 mb-8 sm:mb-12 flex items-end justify-between flex-wrap gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {cfg.eyebrow && (
            <div className="text-mono text-primary mb-2" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>◢ {cfg.eyebrow}</div>
          )}
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display">
            {cfg.title}
          </h2>
          {cfg.subtitle && <p className="mt-3 max-w-xl text-sm sm:text-base opacity-80 text-mono">{cfg.subtitle}</p>}
        </motion.div>
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
