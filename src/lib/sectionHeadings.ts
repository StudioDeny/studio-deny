import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type SectionHeadingValue = { text: string; color?: string };

type HeadingRow = { heading_text: string; text_color: string | null };

// Bulk-fetched once per page load and shared by every consumer, so N
// headings on one page cost 1 query instead of N.
let cache: Record<string, HeadingRow> | null = null;
let inflight: Promise<Record<string, HeadingRow> | null> | null = null;

async function loadHeadings(): Promise<Record<string, HeadingRow> | null> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase.from("section_headings").select("key, heading_text, text_color");
      cache = Object.fromEntries((data ?? []).map((r) => [r.key, { heading_text: r.heading_text, text_color: r.text_color }]));
      return cache;
    })();
  }
  return inflight;
}

/** Looks up an admin-editable heading by its stable key, falling back to
 * `fallbackText` (and the surrounding theme color) if no row exists yet. */
export function useSectionHeading(key: string, fallbackText: string): SectionHeadingValue {
  const [value, setValue] = useState<SectionHeadingValue>({ text: fallbackText });

  useEffect(() => {
    let cancelled = false;
    loadHeadings().then((headings) => {
      if (cancelled) return;
      const row = headings?.[key];
      if (row) setValue({ text: row.heading_text || fallbackText, color: row.text_color ?? undefined });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return value;
}
