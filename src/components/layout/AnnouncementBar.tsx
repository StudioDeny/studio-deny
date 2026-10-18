import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SiteLink } from "@/components/ui/SiteLink";
import type { AnnouncementBar } from "@/types/database";

function isActive(bar: AnnouncementBar): boolean {
  const now = Date.now();
  if (bar.starts_at && new Date(bar.starts_at).getTime() > now) return false;
  if (bar.ends_at && new Date(bar.ends_at).getTime() < now) return false;
  return true;
}

export function AnnouncementBar() {
  // null = "haven't checked yet"; only bars set in Admin → Announcements show.
  const [bars, setBars] = useState<AnnouncementBar[] | null>(null);

  useEffect(() => {
    supabase
      .from("announcement_bars")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => {
        const live = (data ?? []).filter(isActive);
        setBars(live);
      });
  }, []);

  if (!bars || bars.length === 0) return null;

  // The track itself stays a neutral black base — but each message now
  // actually renders in its own configured bg_color/text_color as a pill,
  // instead of every row being forced to black/white regardless of what
  // the CMS says. Per-message (not per-bar) so one loud color choice
  // doesn't take over the whole strip, just its own chip.
  return (
    <div
      className="overflow-hidden relative flex"
      style={{ height: "36px", background: "#0A0A0A", color: "#FFFFFF" }}
    >
      {[0, 1].map((dup) => (
        <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center h-full ticker-scroll">
          {bars.map((bar, i) => (
            <span
              key={`${bar.id}-${dup}-${i}`}
              className="mx-3 flex items-center gap-8 font-semibold tracking-[0.22em] uppercase whitespace-nowrap"
              style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)" }}
            >
              <span
                className="px-3 py-1"
                style={{ background: bar.bg_color, color: bar.text_color }}
              >
                {bar.cta_href ? (
                  <SiteLink href={bar.cta_href} className="hover:underline">
                    {bar.message}
                    {bar.cta_label && <span className="ml-2 opacity-70">— {bar.cta_label} →</span>}
                  </SiteLink>
                ) : (
                  bar.message
                )}
              </span>
              <span className="opacity-50 text-xs">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
