import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SplitCard = {
  media_type: "image" | "video";
  src: string;
  label: string;
  cta_href: string;
};

type GenderSplitConfig = { cards: SplitCard[] };

const DEFAULTS: GenderSplitConfig = {
  cards: [
    { media_type: "image", src: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&q=80&w=1200", label: "SHOP MEN", cta_href: "/collections/men" },
    { media_type: "image", src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200", label: "SHOP WOMEN", cta_href: "/collections/women" },
  ],
};

export function GenderSplit() {
  const [cfg, setCfg] = useState<GenderSplitConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "gender_split")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        const cfgData = row.config as Partial<GenderSplitConfig>;
        if (cfgData?.cards && cfgData.cards.length > 0) setCfg({ cards: cfgData.cards });
      });
  }, []);

  if (!visible) return null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 h-[70vh] sm:h-[85vh]">
      {cfg.cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: idx * 0.15 }}
          viewport={{ once: true }}
          className="relative group overflow-hidden"
        >
          <Link to={card.cta_href} className="absolute inset-0 z-10" aria-label={card.label} />
          {card.media_type === "video" ? (
            <video autoPlay loop muted playsInline preload="metadata"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]">
              <source src={card.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={card.src}
              alt={card.label}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-8 sm:bottom-12 left-6 sm:left-10 z-[1]">
            <h3 className="text-white text-[clamp(1.75rem,4vw,3rem)] text-display uppercase tracking-wider mb-4">
              {card.label}
            </h3>
            <span className="inline-flex items-center gap-2 px-6 py-2.5 border border-white text-white text-xs tracking-[0.14em] uppercase text-mono">
              EXPLORE <ArrowRight className="size-3.5" />
            </span>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
