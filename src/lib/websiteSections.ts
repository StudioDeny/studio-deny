import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { WebsiteSection, SectionType } from "@/types/database";

export const DEFAULT_SECTION_ORDER: string[] = [
  "marquee",
  "gender_split",
  "category_carousel",
  "popular_now",
  "why_us",
  "lookbook",
  "new_arrivals",
  "fabric_tabs",
  "denyspace",
  "influencer_picks",
  "motion_picture",
  "community",
  "contact_support",
  "testimonials",
  "newsletter",
  "faq",
];

// In-memory cache for all website sections to eliminate N-query waterfall and prevent layout jitter
let sectionsCache: Record<string, WebsiteSection> | null = null;
let orderedTypesCache: string[] | null = null;
let inflightPromise: Promise<Record<string, WebsiteSection> | null> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Bulk-fetches all website_sections for 'home' in a single query.
 * Cached in memory so subsequent page renders and back-navigations are instant with zero layout shift.
 */
export async function loadAllWebsiteSections(): Promise<Record<string, WebsiteSection> | null> {
  if (sectionsCache) return sectionsCache;
  if (!inflightPromise) {
    inflightPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("website_sections")
          .select("*")
          .eq("page_slug", "home")
          .order("position");

        if (error || !data) {
          return sectionsCache;
        }

        const map: Record<string, WebsiteSection> = {};
        const ordered: string[] = [];

        data.forEach((row) => {
          map[row.section_type] = row as WebsiteSection;
          ordered.push(row.section_type);
        });

        sectionsCache = map;
        orderedTypesCache = ordered;
        notifyListeners();
        return sectionsCache;
      } catch {
        return sectionsCache;
      } finally {
        inflightPromise = null;
      }
    })();
  }
  return inflightPromise;
}

/**
 * Invalidate cache (used by admin panel when saving changes)
 */
export function invalidateWebsiteSectionsCache() {
  sectionsCache = null;
  orderedTypesCache = null;
  inflightPromise = null;
  loadAllWebsiteSections();
}

/**
 * Hook to get the ordered section types for the homepage.
 * Returns synchronous cached order immediately on back-navigation to prevent layout jumping.
 */
export function useWebsiteSectionsOrder(allowedKeys?: string[]): string[] {
  const [types, setTypes] = useState<string[]>(() => {
    if (orderedTypesCache && orderedTypesCache.length > 0) {
      return allowedKeys
        ? orderedTypesCache.filter((t) => allowedKeys.includes(t))
        : orderedTypesCache;
    }
    return allowedKeys ?? DEFAULT_SECTION_ORDER;
  });

  useEffect(() => {
    let mounted = true;

    const update = () => {
      if (mounted && orderedTypesCache && orderedTypesCache.length > 0) {
        const next = allowedKeys
          ? orderedTypesCache.filter((t) => allowedKeys.includes(t))
          : orderedTypesCache;
        setTypes(next);
      }
    };

    listeners.add(update);
    loadAllWebsiteSections().then(() => {
      if (mounted) update();
    });

    return () => {
      mounted = false;
      listeners.delete(update);
    };
  }, [allowedKeys]);

  return types;
}

/**
 * Hook to get a specific section's configuration and visibility.
 * Returns synchronous cached data if available to prevent flash of content/collapse.
 */
export function useWebsiteSectionConfig<T>(
  sectionType: SectionType | string,
  fallbackConfig: T
): { config: T; isVisible: boolean; loaded: boolean } {
  const [state, setState] = useState<{ config: T; isVisible: boolean; loaded: boolean }>(() => {
    if (sectionsCache && sectionsCache[sectionType]) {
      const row = sectionsCache[sectionType];
      const cfg = row.config as Partial<T> | undefined;
      return {
        config: cfg ? { ...fallbackConfig, ...cfg } : fallbackConfig,
        isVisible: row.is_visible,
        loaded: true,
      };
    }
    return {
      config: fallbackConfig,
      isVisible: true,
      loaded: false,
    };
  });

  useEffect(() => {
    let mounted = true;

    const update = () => {
      if (!mounted) return;
      if (sectionsCache && sectionsCache[sectionType]) {
        const row = sectionsCache[sectionType];
        const cfg = row.config as Partial<T> | undefined;
        setState({
          config: cfg ? { ...fallbackConfig, ...cfg } : fallbackConfig,
          isVisible: row.is_visible,
          loaded: true,
        });
      } else {
        setState((prev) => ({ ...prev, loaded: true }));
      }
    };

    listeners.add(update);
    loadAllWebsiteSections().then(() => {
      if (mounted) update();
    });

    return () => {
      mounted = false;
      listeners.delete(update);
    };
  }, [sectionType]);

  return state;
}
