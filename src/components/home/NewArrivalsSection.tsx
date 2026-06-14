import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getSettings, type ArrivalsConfig } from "@/lib/settings";
import { listProducts } from "@/lib/productsStore";
import type { Product } from "@/lib/products";
import { formatINR } from "@/context/CartContext";

export function NewArrivalsSection() {
  const [cfg, setCfg] = useState<ArrivalsConfig | null>(null);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const s = getSettings();
    setCfg(s.arrivals);
    const all = listProducts();
    let chosen: Product[];
    if (s.arrivals.productSlugs.length) {
      const map = new Map(all.map((p) => [p.slug, p] as const));
      chosen = s.arrivals.productSlugs.map((slug) => map.get(slug)).filter(Boolean) as Product[];
    } else {
      // Fallback: most recent (NEW DROP badge first), max 8
      chosen = [...all].sort((a, b) => (a.badge === "NEW DROP" ? -1 : 0) - (b.badge === "NEW DROP" ? -1 : 0)).slice(0, 8);
    }
    setItems(chosen.slice(0, 8));
  }, []);

  if (!cfg || !cfg.enabled || items.length === 0) return null;

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Eye-catching backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(200,255,0,0.03)] via-transparent to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black 30%, transparent 75%)",
        }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.5 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4 }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-secondary/10 blur-[140px] pointer-events-none"
      />

      <div className="relative max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 border border-secondary/40 bg-secondary/5 text-secondary text-[10px] sm:text-[11px] tracking-[0.3em] text-mono">
              <Sparkles className="size-3" /> {cfg.eyebrow}
            </div>
            <h2 className="text-[clamp(2.4rem,9vw,6rem)] leading-[0.86] tracking-[-0.04em] uppercase text-display">
              {cfg.title.split(" ").map((w, i) => (
                <span key={i} className={i === 1 ? "text-transparent" : ""} style={i === 1 ? { WebkitTextStroke: "2px currentColor" } : undefined}>
                  {w}{" "}
                </span>
              ))}
            </h2>
            <p className="mt-4 max-w-xl text-base sm:text-lg opacity-80 text-mono">{cfg.subtitle}</p>
          </motion.div>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 text-mono text-xs sm:text-sm tracking-[0.2em] uppercase border-b border-foreground/40 pb-1 hover:border-secondary hover:text-secondary transition-colors"
          >
            {cfg.ctaLabel}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Mosaic grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {items.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
              className={`relative group overflow-hidden border border-border bg-surface ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
            >
              <Link to="/product/$slug" params={{ slug: p.slug }} className="block relative">
                <div className={`relative w-full overflow-hidden ${i === 0 ? "aspect-[4/5] md:aspect-square" : "aspect-[4/5]"}`}>
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {p.badge && (
                    <span className="absolute top-3 left-3 text-mono px-2 py-1 bg-secondary text-secondary-foreground" style={{ fontSize: "9px", letterSpacing: "0.25em" }}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <div className="text-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-white/60">
                    {p.category.toUpperCase()}
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <h3 className={`text-white font-semibold leading-tight truncate ${i === 0 ? "text-lg sm:text-2xl" : "text-sm sm:text-base"}`}>
                      {p.name}
                    </h3>
                    <span className="text-mono text-secondary text-xs sm:text-sm shrink-0">{formatINR(p.price)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
