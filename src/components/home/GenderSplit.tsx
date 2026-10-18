import { useEffect, useState } from "react";
import { blurPlaceholder } from "@/lib/blurPlaceholder";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { SiteLink } from "@/components/ui/SiteLink";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EditorialHeading } from "@/components/ui/EditorialHeading";

type SplitCard = {
  media_type: "image" | "video";
  src: string;
  label: string;
  cta_href: string;
};

type GenderSplitConfig = { cards: SplitCard[]; explore_label?: string };

const DEFAULTS: GenderSplitConfig = { cards: [] };

const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

import { useWebsiteSectionConfig } from "@/lib/websiteSections";
import { responsiveImage } from "@/lib/image";

export function GenderSplit() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<GenderSplitConfig>("gender_split", DEFAULTS);

  if (!visible || cfg.cards.length === 0) return null;

  return (
    <section className={`bg-[#E2E2E4] grid grid-cols-1 ${GRID_COLS[cfg.cards.length] ?? "sm:grid-cols-3"} h-screen`}>
      {cfg.cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: idx * 0.12 }}
          viewport={{ once: true }}
          className="relative group overflow-hidden"
        >
          <SiteLink href={card.cta_href} className="absolute inset-0 z-10" aria-label={card.label} />
          {card.media_type === "video" ? (
            <video autoPlay loop muted playsInline preload="metadata"
              className="absolute inset-0 w-full h-full object-cover">
              <source src={card.src} type="video/mp4" />
            </video>
          ) : (
            <img
              {...responsiveImage(card.src, { maxWidth: 1600, sizes: "(min-width: 640px) 50vw, 100vw" })}
              style={blurPlaceholder(card.src)}
              alt={card.label}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-8 sm:bottom-12 left-6 sm:left-10 z-[1]">
            <EditorialHeading as="h3" className="text-white text-[clamp(1.75rem,4vw,3rem)] text-display uppercase tracking-wider mb-4" delay={idx * 0.1}>
              {card.label}
            </EditorialHeading>
            <span className="inline-flex items-center gap-2 px-6 py-2.5 border border-white text-white text-xs tracking-[0.14em] uppercase text-mono">
              {cfg.explore_label ?? "EXPLORE"} <ArrowRight className="size-3.5" />
            </span>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
