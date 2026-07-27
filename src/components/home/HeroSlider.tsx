import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FillLink } from "@/components/ui/FillLink";
import { SlideDots } from "@/components/ui/SlideDots";

export type HeroSlide = {
  id: string;
  media_type: "image" | "video";
  src: string;
  title: string; // use "\n" for line breaks
  subtitle: string;
  cta_label: string;
  cta_href: string;
  cta2_label?: string;
  cta2_href?: string;
};

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "default-1",
    media_type: "video",
    src: "https://studio-deny-demo.vercel.app/assets/hero-video.mp4",
    title: "IN THE CUT\nNOT IN THE CROWD",
    subtitle: "Elevated streetwear engineered for creators. Limited drops, premium cuts, and a fit made to stand apart.",
    cta_label: "SHOP THE DROP",
    cta_href: "/shop",
    cta2_label: "VIEW LOOKBOOK",
    cta2_href: "/lookbook",
  },
  {
    id: "default-2",
    media_type: "image",
    src: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=1600",
    title: "BUILT FOR\nTHE STREETS",
    subtitle: "300+ GSM heavyweight cotton. Engineered pattern making. Made to move with you, not against you.",
    cta_label: "SHOP NEW ARRIVALS",
    cta_href: "/shop",
    cta2_label: "SHOP ALL",
    cta2_href: "/shop",
  },
  {
    id: "default-3",
    media_type: "image",
    src: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80&w=1600",
    title: "LIMITED\nDROPS ONLY",
    subtitle: "One qualifying order unlocks Deny Space — earn points on every rupee, redeem real money off your next drop.",
    cta_label: "JOIN DENY SPACE",
    cta_href: "/rewards",
    cta2_label: "SHOP THE DROP",
    cta2_href: "/shop",
  },
];

const AUTOPLAY_MS = 6500;
const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroSlider({ slides }: { slides?: HeroSlide[] }) {
  const data = slides && slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;
  const [active, setActive] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (data.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % data.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [data.length]);

  const slide = data[Math.min(active, data.length - 1)];
  const lines = slide.title.split("\n");
  const parallax = Math.min(scrollY * 0.25, 90);

  return (
    <section
      className="relative w-full overflow-hidden min-h-[420px]"
      style={{ height: "calc(100vh - var(--topbar-h))" }}
    >
      {/* Media layers */}
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1.1, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE } }}
          className="absolute inset-0"
          style={{ transform: `translateY(${parallax}px)` }}
        >
          {slide.media_type === "video" ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.55)" }}
            >
              <source src={slide.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={slide.src}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.55)" }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-black/10 to-black/30 pointer-events-none" />

      {/* Text content is bottom-anchored (not vertically centered) — this keeps it
          clear of the fixed marquee+navbar stack regardless of exact bar height,
          and matches the reference layout. */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 lg:px-16 pb-12 sm:pb-16">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-[clamp(2.25rem,8vw,6rem)] leading-[0.95] tracking-[-0.03em] uppercase max-w-5xl text-display text-white">
              {lines.map((line, i) => (
                <span key={`${slide.id}-line-${i}`} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.08 }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              key={`${slide.id}-sub`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
              className="text-base sm:text-lg leading-relaxed max-w-xl text-mono text-white/80"
            >
              {slide.subtitle}
            </motion.p>

            <motion.div
              key={`${slide.id}-cta`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <FillLink to={slide.cta_href} tone="light">
                {slide.cta_label} <ArrowRight className="w-4 h-4" />
              </FillLink>
              {slide.cta2_label && slide.cta2_href && (
                <FillLink to={slide.cta2_href} tone="light">
                  {slide.cta2_label}
                </FillLink>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <SlideDots
        count={data.length}
        active={active}
        onSelect={setActive}
        durationMs={AUTOPLAY_MS}
        className="absolute z-10 bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2"
      />
    </section>
  );
}
