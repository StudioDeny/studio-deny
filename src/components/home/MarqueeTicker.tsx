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

export function MarqueeTicker() {
  const [cfg, setCfg] = useState<MarqueeConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "marquee")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: Partial<MarqueeConfig> };
        setVisible(row.is_visible);
        const loadedItems = row.config?.items ?? [];
        setCfg({
          items: loadedItems.length > 0 ? loadedItems : DEFAULTS.items,
          speed: row.config?.speed ?? DEFAULTS.speed,
        });
      });
  }, []);

  if (!visible) return null;
  const items = cfg.items.length > 0 ? cfg.items : DEFAULTS.items;

  // Fast, seamless infinite scrolling (10s - 14s duration for crisp high-speed motion)
  const durationSeconds = Math.max(6, Math.min(14, 1200 / (cfg.speed || 100)));

  return (
    <section className="border-y border-border bg-[#E2E2E4] overflow-hidden py-4 sm:py-5 group">
      <div className="flex overflow-hidden select-none">
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
                  className="text-display uppercase tracking-[-0.01em] px-6 sm:px-8 font-bold"
                  style={{ fontSize: "clamp(1.4rem, 3.2vw, 2.2rem)" }}
                >
                  {item}
                </span>
                <span className="size-2 rounded-full bg-primary shrink-0 opacity-80" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

