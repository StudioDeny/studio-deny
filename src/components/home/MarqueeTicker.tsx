import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarqueeConfig = { items: string[]; speed: number };
const DEFAULTS: MarqueeConfig = {
  items: [
    "STUDIO DENY",
    "NEW DROP LIVE",
    "FREE SHIPPING ALL INDIA",
    "HEAVYWEIGHT COTTON",
    "STREETWEAR FOR THE RESTLESS",
    "RAW GRAPHICS",
    "LIMITED EDITION",
  ],
  speed: 120,
};

import { useWebsiteSectionConfig } from "@/lib/websiteSections";

export function MarqueeTicker() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<MarqueeConfig>("marquee", DEFAULTS);

  if (!visible) return null;
  const validItems = (cfg.items ?? []).map((s) => s.trim()).filter(Boolean);
  const items = validItems.length > 0 ? validItems : DEFAULTS.items;

  // Fast, seamless infinite scrolling
  const durationSeconds = Math.max(6, Math.min(14, 1200 / (cfg.speed || 100)));

  return (
    <section className="relative bg-[#FFE600] text-black overflow-hidden py-2.5 sm:py-3 select-none border-y-2 border-black group shadow-md">
      {/* Top Hazard Diagonal Stripe Tape Border */}
      <div className="absolute top-0 inset-x-0 h-2 bg-[repeating-linear-gradient(-45deg,#000,#000_10px,#FFE600_10px,#FFE600_20px)] border-b border-black/20 z-10 pointer-events-none" />

      <div className="flex overflow-hidden my-0.5">
        {[0, 1, 2, 3].map((dup) => (
          <div
            key={dup}
            aria-hidden={dup > 0}
            className="flex shrink-0 items-center ticker-scroll group-hover:[animation-play-state:paused]"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {items.map((item, i) => (
              <span key={`${dup}-${i}`} className="flex items-center shrink-0 whitespace-nowrap">
                <span
                  className="font-display font-black uppercase tracking-wider px-4 sm:px-6 text-black"
                  style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.6rem)" }}
                >
                  {item}
                </span>
                
                {/* Large Prominent Slash Separator */}
                <span className="font-mono text-3xl sm:text-4xl font-black text-black px-4 sm:px-7 leading-none">
                  /
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Hazard Diagonal Stripe Tape Border */}
      <div className="absolute bottom-0 inset-x-0 h-2 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#FFE600_10px,#FFE600_20px)] border-t border-black/20 z-10 pointer-events-none" />
    </section>
  );
}

