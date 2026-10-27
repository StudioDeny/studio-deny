import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { buildMeta, buildLinks, SITE_URL, orgJsonLd, websiteJsonLd, storeJsonLd } from "@/lib/seo";
import { useState, useEffect, useRef } from "react";
import { useScrollAnchor } from "@/hooks/useScrollAnchor";
import { LoyaltyModal } from "@/components/home/LoyaltyModal";
import { HeroSlider, type HeroSlide } from "@/components/home/HeroSlider";
import { MarqueeTicker } from "@/components/home/MarqueeTicker";
import { NewArrivalsGrid } from "@/components/home/NewArrivalsGrid";
import { LookbookCarousel } from "@/components/home/LookbookCarousel";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { FaqSection } from "@/components/home/FaqSection";
import { GenderSplit } from "@/components/home/GenderSplit";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { DenySpace } from "@/components/home/DenySpace";
import { PopularNowGrid } from "@/components/home/PopularNowGrid";
import { FabricTabsSection } from "@/components/home/FabricTabsSection";
import { MotionPictureSection } from "@/components/home/MotionPictureSection";
import { CommunityBento } from "@/components/home/CommunityBento";
import { InfluencerPicksGrid } from "@/components/home/InfluencerPicksGrid";
import { ContactSupportSection } from "@/components/home/ContactSupportSection";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: buildMeta({
      title: "STUDIO DENY — Streetwear For The Restless",
      description: "Studio Deny — heavyweight streetwear, raw graphics, made in India. Limited drops. Hoodies, tees, cargos, outerwear.",
      url: SITE_URL,
    }),
    links: buildLinks(SITE_URL),
    scripts: [
      { type: "application/ld+json", children: orgJsonLd() },
      { type: "application/ld+json", children: websiteJsonLd() },
      { type: "application/ld+json", children: storeJsonLd() },
    ],
  }),
});

// Every section type here is backed by a `website_sections` row (page_slug
// "home") and renders itself in position order below. Each component fetches
// its own config/visibility — this map only decides *which* component a
// section_type dispatches to. "hero" is handled separately above the loop
// since it needs its slides fetched once, not re-fetched per row, so it's
// intentionally absent here and simply skipped if encountered.
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  marquee: MarqueeTicker,
  gender_split: GenderSplit,
  category_carousel: CategoryCarousel,
  popular_now: PopularNowGrid,
  why_us: WhyUsSection,
  lookbook: LookbookCarousel,
  new_arrivals: NewArrivalsGrid,
  fabric_tabs: FabricTabsSection,
  denyspace: DenySpace,
  influencer_picks: InfluencerPicksGrid,
  motion_picture: MotionPictureSection,
  community: CommunityBento,
  contact_support: ContactSupportSection,
  testimonials: TestimonialsSection,
  newsletter: NewsletterSection,
  faq: FaqSection,
};

import { useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import { useWebsiteSectionsOrder, useWebsiteSectionConfig } from "@/lib/websiteSections";
import { HeroLogo } from "@/components/home/HeroLogo";
import { sectionAnchor } from "@/lib/siteLinks";

function Index() {
  const allowedKeys = useMemo(() => Object.keys(SECTION_COMPONENTS), []);
  const orderedTypes = useWebsiteSectionsOrder(allowedKeys);
  const { config: heroConfig, isVisible: heroVisible, loaded: heroLoaded } = useWebsiteSectionConfig<{ slides?: HeroSlide[] }>("hero", {});
  const heroSlides = (heroConfig.slides ?? []).filter((s) => s.src);
  // Sections that load in above the visitor don't push them into another one.
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollAnchor(pageRef);

  // Buttons can point at a home page section ("/#new-arrivals"). Sections
  // load their content after the page renders, so scroll again once they
  // have had time to grow.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const go = () => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const timers = [150, 900, 1800].map((ms) => window.setTimeout(go, ms));
    return () => timers.forEach(clearTimeout);
  }, [hash, orderedTypes.length]);

  return (
    <div ref={pageRef} className="bg-background text-foreground overflow-x-hidden min-h-screen font-body">
      <LoyaltyModal />

      {/* Carries the preloader's logo to the hero centre, then into the
          navbar on scroll. Undefined until we know whether there is a hero. */}
      <HeroLogo hasHero={heroLoaded ? heroVisible && heroSlides.length > 0 : undefined} />

      {/* Only the admin's slides ever show. Until they load, an empty block
          holds the hero's space so the page doesn't jump. */}
      {!heroLoaded ? (
        <div aria-hidden className="min-h-[420px]" style={{ height: "calc(100vh - var(--topbar-h))" }} />
      ) : heroVisible && heroSlides.length > 0 ? (
        <HeroSlider slides={heroSlides} />
      ) : null}

      {orderedTypes.map((type) => {
        const Section = SECTION_COMPONENTS[type];
        if (!Section) return null;
        return (
          <div key={type} id={sectionAnchor(type)} className="scroll-mt-[var(--topbar-h)]">
            <Section />
          </div>
        );
      })}
    </div>
  );
}
