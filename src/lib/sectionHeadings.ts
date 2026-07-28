import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type SectionHeadingValue = { text: string; color?: string; eyebrow?: string; subtitle?: string };

type HeadingRow = { heading_text: string; text_color: string | null; eyebrow_text: string | null; subtitle_text: string | null };

// Bulk-fetched once per page load and shared by every consumer, so N
// headings on one page cost 1 query instead of N.
let cache: Record<string, HeadingRow> | null = null;
let inflight: Promise<Record<string, HeadingRow> | null> | null = null;

async function loadHeadings(): Promise<Record<string, HeadingRow> | null> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase.from("section_headings").select("key, heading_text, text_color, eyebrow_text, subtitle_text");
      cache = Object.fromEntries((data ?? []).map((r) => [r.key, { heading_text: r.heading_text, text_color: r.text_color, eyebrow_text: r.eyebrow_text, subtitle_text: r.subtitle_text }]));
      return cache;
    })();
  }
  return inflight;
}

/** Looks up an admin-editable heading (+ optional eyebrow/subtitle/color) by
 * its stable key, falling back to `fallbackText` (and any fallback
 * eyebrow/subtitle passed in) if no row exists yet. */
export function useSectionHeading(
  key: string,
  fallbackText: string,
  fallbacks?: { eyebrow?: string; subtitle?: string }
): SectionHeadingValue {
  const [value, setValue] = useState<SectionHeadingValue>({
    text: fallbackText,
    eyebrow: fallbacks?.eyebrow,
    subtitle: fallbacks?.subtitle,
  });

  useEffect(() => {
    let cancelled = false;
    loadHeadings().then((headings) => {
      if (cancelled) return;
      const row = headings?.[key];
      if (row) {
        setValue({
          text: row.heading_text || fallbackText,
          color: row.text_color ?? undefined,
          eyebrow: row.eyebrow_text ?? fallbacks?.eyebrow,
          subtitle: row.subtitle_text ?? fallbacks?.subtitle,
        });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return value;
}
