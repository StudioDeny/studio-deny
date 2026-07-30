import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { buildMeta, buildLinks, SITE_URL, orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { useState, useEffect } from "react";
import { LoyaltyModal } from "@/components/home/LoyaltyModal";
import { HeroSlider, type HeroSlide } from "@/components/home/HeroSlider";
import { MarqueeTicker } from "@/components/home/MarqueeTicker";
import { NewArrivalsGrid } from "@/components/home/NewArrivalsGrid";
import { LookbookCarousel } from "@/components/home/LookbookCarousel";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
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
    ],
  }),
});

// Every section type here is backed by a `website_sections` row (page_slug
// "home") and renders itself in position order below. Each component fetches
// its own config/visibility — this map only decides *which* component a
// section_type dispatches to. "hero" is handled separately above the loop
// (it needs its slides fetched once, not re-fetched per row) and "faq" has
// no homepage component (dedicated /faq page exists instead), so both are
// intentionally absent here and simply skipped if encountered.
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  marquee: MarqueeTicker,
  new_arrivals: NewArrivalsGrid,
  lookbook: LookbookCarousel,
  testimonials: TestimonialsSection,
  why_us: WhyUsSection,
  instagram_feed: InstagramFeedSection,
  newsletter: NewsletterSection,
  gender_split: GenderSplit,
  category_carousel: CategoryCarousel,
  denyspace: DenySpace,
  popular_now: PopularNowGrid,
  fabric_tabs: FabricTabsSection,
  motion_picture: MotionPictureSection,
};

function Index() {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[] | undefined>(undefined);
  const [orderedTypes, setOrderedTypes] = useState<string[]>(Object.keys(SECTION_COMPONENTS));

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config")
      .eq("page_slug", "home")
      .eq("section_type", "hero")
      .single()
      .then(({ data }) => {
        const cfg = data?.config as { slides?: HeroSlide[] } | undefined;
        if (cfg?.slides && cfg.slides.length > 0) setHeroSlides(cfg.slides);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("section_type, position")
      .eq("page_slug", "home")
      .order("position")
      .then(({ data }) => {
        if (!data) return;
        setOrderedTypes(data.map((r) => r.section_type).filter((t) => t in SECTION_COMPONENTS));
      });
  }, []);

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen font-body">
      <LoyaltyModal />

      <HeroSlider slides={heroSlides} />

      {orderedTypes.map((type) => {
        const Section = SECTION_COMPONENTS[type];
        return <Section key={type} />;
      })}

      {/* Table-driven sections below aren't part of the website_sections
          position system (no matching section_type exists for them), so
          they stay pinned here rather than being reorderable. */}
      <InfluencerPicksGrid />
      <CommunityBento />
      <ContactSupportSection />
    </div>
  );
}
