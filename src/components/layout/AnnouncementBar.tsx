import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AnnouncementBar } from "@/types/database";

const FALLBACK: AnnouncementBar[] = [
  {
    id: "fb-1", message: "FREE SHIPPING ON ORDERS ABOVE ₹999", cta_label: null, cta_href: null,
    bg_color: "#c8f135", text_color: "#0a0a0a", is_active: true, position: 0, starts_at: null, ends_at: null, created_at: "",
  },
  {
    id: "fb-2", message: "MADE IN INDIA · WORN WORLDWIDE · NO APOLOGIES", cta_label: null, cta_href: null,
    bg_color: "#c8f135", text_color: "#0a0a0a", is_active: true, position: 1, starts_at: null, ends_at: null, created_at: "",
  },
];

function isActive(bar: AnnouncementBar): boolean {
  const now = Date.now();
  if (bar.starts_at && new Date(bar.starts_at).getTime() > now) return false;
  if (bar.ends_at && new Date(bar.ends_at).getTime() < now) return false;
  return true;
}

export function AnnouncementBar() {
  const [bars, setBars] = useState<AnnouncementBar[]>(FALLBACK);

  useEffect(() => {
    supabase
      .from("announcement_bars")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const live = data.filter(isActive);
          if (live.length > 0) setBars(live);
        }
      });
  }, []);

  const messages = bars.flatMap((b) => [b, b, b]);

  // Use the first bar's colors as baseline for the bar background
  const firstBar = bars[0];
  const bgColor = firstBar?.bg_color ?? "#c8f135";
  const textColor = firstBar?.text_color ?? "#0a0a0a";

  return (
    <div
      className="overflow-hidden relative"
      style={{ height: "36px", background: bgColor, color: textColor }}
    >
      <div className="flex whitespace-nowrap marquee items-center h-full" style={{ width: "max-content" }}>
        {messages.map((bar, i) => (
          <span
            key={`${bar.id}-${i}`}
            className="mx-8 flex items-center gap-8 font-semibold tracking-[0.22em] uppercase"
            style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)" }}
          >
            {bar.cta_href ? (
              <a href={bar.cta_href} className="hover:underline">
                {bar.message}
                {bar.cta_label && <span className="ml-2 opacity-70">— {bar.cta_label} →</span>}
              </a>
            ) : (
              bar.message
            )}
            <span className="opacity-50 text-xs">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
