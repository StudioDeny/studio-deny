import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SlideDots } from "@/components/ui/SlideDots";

const AUTOPLAY_MS = 6000;

type CarouselSlide = {
  media_type: "image" | "video";
  src: string;
  label: string;
  href: string;
  subtitle?: string;
  cta_label?: string;
};

type CategoryCarouselConfig = { slides: CarouselSlide[] };

const DEFAULTS: CategoryCarouselConfig = {
  slides: [
    { media_type: "image", src: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1600", label: "BEST SELLERS", href: "/shop?sort=best" },
    { media_type: "image", src: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=1600", label: "NEW DROPS", href: "/shop?sort=new" },
  ],
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function CategoryCarousel() {
  const [cfg, setCfg] = useState<CategoryCarouselConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "category_carousel")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        const cfgData = row.config as Partial<CategoryCarouselConfig>;
        if (cfgData?.slides && cfgData.slides.length > 0) setCfg({ slides: cfgData.slides });
      });
  }, []);

  useEffect(() => {
    if (cfg.slides.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % cfg.slides.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [cfg.slides.length]);

  if (!visible || cfg.slides.length === 0) return null;

  const slide = cfg.slides[active];
  const go = (dir: -1 | 1) => setActive((a) => (a + dir + cfg.slides.length) % cfg.slides.length);

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#E2E2E4]">
      <AnimatePresence mode="sync">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
          className="absolute inset-0"
        >
          <Link to={slide.href} className="absolute inset-0 z-[1]" aria-label={slide.label} />
          {slide.media_type === "video" ? (
            <video autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover">
              <source src={slide.src} type="video/mp4" />
            </video>
          ) : (
            <img src={slide.src} alt={slide.label} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center text-center pointer-events-none overflow-hidden px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.15 } }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.3 } }}
            className="flex flex-col items-center"
          >
            <h2 className="text-white text-[clamp(2.5rem,8vw,6rem)] text-display uppercase tracking-wider">
              {slide.label}
            </h2>
            {slide.subtitle && (
              <p className="text-white/85 text-mono text-sm sm:text-base mt-3 max-w-md">{slide.subtitle}</p>
            )}
            {slide.cta_label && (
              <Link
                to={slide.href}
                className="pointer-events-auto mt-6 inline-flex items-center gap-2 px-6 py-2.5 border border-white text-white text-xs tracking-[0.14em] uppercase text-mono hover:bg-white hover:text-black transition-colors"
              >
                {slide.cta_label}
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {cfg.slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute z-[3] left-3 sm:left-6 top-1/2 -translate-y-1/2 size-10 sm:size-12 flex items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute z-[3] right-3 sm:right-6 top-1/2 -translate-y-1/2 size-10 sm:size-12 flex items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>

          <SlideDots
            count={cfg.slides.length}
            active={active}
            onSelect={setActive}
            durationMs={AUTOPLAY_MS}
            className="absolute z-[3] bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2"
          />
        </>
      )}
    </section>
  );
}
