import { useEffect, useState } from "react";
import { skeletonStyle } from "@/lib/skeleton";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { SiteLink } from "@/components/ui/SiteLink";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EditorialHeading } from "@/components/ui/EditorialHeading";

type SplitCard = {
  media_type: "image" | "video";
  src: string;
  /** Optional phone-only photo/video; falls back to src. */
  mobile_src?: string;
  mobile_media_type?: "image" | "video";
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
import { useIsMobile } from "@/hooks/use-mobile";

export function GenderSplit() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<GenderSplitConfig>("gender_split", DEFAULTS);
  const isMobile = useIsMobile();

  if (!visible || cfg.cards.length === 0) return null;

  return (
    <section className={`bg-[#E2E2E4] grid grid-cols-1 ${GRID_COLS[cfg.cards.length] ?? "sm:grid-cols-3"} h-screen`}>
      {cfg.cards.map((card, idx) => {
        const useMobile = isMobile && !!card.mobile_src;
        const src = useMobile ? card.mobile_src! : card.src;
        const mediaType = useMobile ? (card.mobile_media_type ?? "image") : card.media_type;
        return (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: idx * 0.12 }}
          viewport={{ once: true }}
          // Hovering anywhere on the card plays the button's fill: the card
          // is the link, so the button itself is never hovered.
          className="relative group overflow-hidden btn-fill-trigger"
        >
          <SiteLink href={card.cta_href} className="absolute inset-0 z-10" aria-label={card.label} />
          {mediaType === "video" ? (
            <video key={src} autoPlay loop muted playsInline preload="metadata"
              className="absolute inset-0 w-full h-full object-cover">
              <source src={src} type="video/mp4" />
            </video>
          ) : (
            <img
              {...responsiveImage(src, { maxWidth: 1920, sizes: "(min-width: 640px) 50vw, 100vw" })}
              style={skeletonStyle}
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
            {/* White sweeps in from the left; the label wipes to black. */}
            <span className="btn-fill inline-flex items-center px-6 py-2.5 border border-white text-xs tracking-[0.14em] uppercase text-mono">
              <span className="btn-fill-bg bg-white" aria-hidden />
              <span className="btn-fill-front inline-flex items-center gap-2 text-white">
                {cfg.explore_label ?? "EXPLORE"}
                <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
              <span className="btn-fill-back inline-flex items-center gap-2 text-black" aria-hidden>
                {cfg.explore_label ?? "EXPLORE"}
                <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </span>
          </div>
        </motion.div>
        );
      })}
    </section>
  );
}
