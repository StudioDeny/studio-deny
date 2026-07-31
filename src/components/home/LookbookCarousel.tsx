import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { SlideDots } from "@/components/ui/SlideDots";
import { useSectionHeading } from "@/lib/sectionHeadings";

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 6000;

export function LookbookCarousel() {
  const [slides, setSlides] = useState<LookbookSlide[]>([]);
  const [active, setActive] = useState(0);
  const heading = useSectionHeading("lookbook", "LOOKBOOK", { subtitle: "Swipe through curated fits built for daily movement." });

  useEffect(() => {
    supabase
      .from("lookbook_slides")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => { if (data) setSlides(data); });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[active];
  const go = (e: React.MouseEvent, dir: -1 | 1) => {
    e.preventDefault();
    e.stopPropagation();
    setActive((a) => (a + dir + slides.length) % slides.length);
  };

  const Frame = (
    <div className="relative w-full h-screen overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE } }}
          className="absolute inset-0"
        >
          <img src={slide.image_url} alt={slide.caption ?? ""} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {slide.caption && (
            <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-10 z-[1]">
              <p className="text-[clamp(2rem,7vw,4.5rem)] leading-none tracking-[-0.04em] uppercase text-display whitespace-pre-line text-white">
                {slide.caption}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={(e) => go(e, -1)}
            className="absolute z-[2] left-3 sm:left-6 top-1/2 -translate-y-1/2 size-10 sm:size-12 flex items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white transition-colors">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" aria-label="Next" onClick={(e) => go(e, 1)}
            className="absolute z-[2] right-3 sm:right-6 top-1/2 -translate-y-1/2 size-10 sm:size-12 flex items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white transition-colors">
            <ChevronRight className="size-5" />
          </button>

          <SlideDots
            count={slides.length}
            active={active}
            onSelect={setActive}
            durationMs={AUTOPLAY_MS}
            className="absolute z-[2] bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2"
          />
        </>
      )}
    </div>
  );

  return (
    <section className="py-14 sm:py-20 bg-[#CDCDCB] overflow-hidden border-t border-border">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-8 sm:mb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <h2
            className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.03em] uppercase text-display"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </h2>
          <p className="text-base sm:text-lg mt-3 opacity-80 max-w-xl text-mono">{heading.subtitle}</p>
        </motion.div>
      </div>
      {slide.link_href ? (
        <Link to={slide.link_href} className="block">{Frame}</Link>
      ) : (
        Frame
      )}
    </section>
  );
}
