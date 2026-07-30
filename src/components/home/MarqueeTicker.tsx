import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarqueeConfig = { items: string[]; speed: number };
const DEFAULTS: MarqueeConfig = { items: [], speed: 40 };

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
        setCfg({
          items: row.config?.items ?? [],
          speed: row.config?.speed ?? DEFAULTS.speed,
        });
      });
  }, []);

  if (!visible || cfg.items.length === 0) return null;

  // Slower configured speed = a longer animation duration (fewer px/s).
  const durationSeconds = Math.max(8, 2000 / cfg.speed);

  return (
    <section className="border-y border-border bg-surface/50 overflow-hidden py-5 group">
      <div className="flex overflow-hidden">
        {[0, 1].map((dup) => (
          <div
            key={dup}
            aria-hidden={dup === 1}
            className="flex shrink-0 items-center ticker-scroll group-hover:[animation-play-state:paused]"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {cfg.items.map((item, i) => (
              <span key={`${dup}-${i}`} className="flex items-center shrink-0 whitespace-nowrap">
                <span className="text-display uppercase tracking-[-0.01em] px-6" style={{ fontSize: "clamp(1.2rem,2.5vw,1.8rem)" }}>
                  {item}
                </span>
                <span className="size-1.5 rounded-full bg-primary shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
