import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { listProducts, type Product } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";

type PopularNowConfig = { title: string; product_slugs: string[] };

const DEFAULTS: PopularNowConfig = { title: "POPULAR NOW", product_slugs: [] };

// Bento rhythm: every 4th tile (0-indexed 0 and 3) spans 2 columns and 2 rows
// for the mixed small/large "uneven grid" look; the rest are single tiles.
const LARGE_INDICES = new Set([0, 3]);

export function PopularNowGrid() {
  const [cfg, setCfg] = useState<PopularNowConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "popular_now")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        const cfgData = row.config as Partial<PopularNowConfig>;
        if (cfgData) setCfg({ title: cfgData.title ?? DEFAULTS.title, product_slugs: cfgData.product_slugs ?? [] });
      });
  }, []);

  useEffect(() => {
    if (cfg.product_slugs.length === 0) { setProducts([]); return; }
    listProducts().then((all) => {
      const bySlug = new Map(all.map((p) => [p.slug, p]));
      setProducts(cfg.product_slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p)));
    });
  }, [cfg.product_slugs]);

  if (!visible || products.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-8 sm:mb-12"
      >
        {cfg.title}
      </motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-[280px] sm:auto-rows-[320px]">
        {products.map((p, i) => (
          <Link
            key={p.slug}
            to="/product/$slug"
            params={{ slug: p.slug }}
            className={`group relative overflow-hidden bg-surface ${LARGE_INDICES.has(i) ? "col-span-2 row-span-2" : ""}`}
          >
            <img
              src={p.image}
              alt={p.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white text-sm font-semibold uppercase tracking-[0.08em] truncate">{p.name}</p>
              <p className="text-white/80 text-mono text-xs">{formatINR(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
