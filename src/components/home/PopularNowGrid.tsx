import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { listProducts, type Product } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";

type PopularNowItem = { slug: string; tag?: string };
type PopularNowConfig = { title: string; items: PopularNowItem[] };

const DEFAULTS: PopularNowConfig = { title: "POPULAR NOW", items: [] };

// Uneven card widths/heights, cycling every 3 tiles for the mixed-size look.
const SIZE_CLASSES = [
  "w-[210px] sm:w-[260px] h-[320px] sm:h-[380px]",
  "w-[150px] sm:w-[190px] h-[260px] sm:h-[300px]",
  "w-[150px] sm:w-[190px] h-[320px] sm:h-[380px]",
];

export function PopularNowGrid() {
  const [cfg, setCfg] = useState<PopularNowConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [products, setProducts] = useState<(Product & { tag?: string })[]>([]);

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
        if (cfgData) setCfg({ title: cfgData.title ?? DEFAULTS.title, items: cfgData.items ?? [] });
      });
  }, []);

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

  return (
    <section className="py-16 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-8 sm:mb-12 px-4 sm:px-8 lg:px-16"
      >
        {cfg.title}
      </motion.h2>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 px-4 sm:px-8 lg:px-16 [scrollbar-width:thin]">
        {products.map((p, i) => (
          <Link
            key={p.slug}
            to="/product/$slug"
            params={{ slug: p.slug }}
            className={`group relative shrink-0 overflow-hidden bg-surface ${SIZE_CLASSES[i % SIZE_CLASSES.length]}`}
          >
            <img
              src={p.image}
              alt={p.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            {p.tag && (
              <span className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-mono font-semibold px-2 py-1" style={{ fontSize: "9px", letterSpacing: "0.2em" }}>
                {p.tag.toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
            <div className="absolute bottom-2.5 left-2.5 right-2.5">
              <p className="text-white text-xs font-semibold uppercase tracking-[0.06em] truncate">{p.name}</p>
              <p className="text-white/80 text-mono text-[11px]">{formatINR(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
