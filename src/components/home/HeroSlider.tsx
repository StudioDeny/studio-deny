import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FillLink } from "@/components/ui/FillLink";
import { SlideDots } from "@/components/ui/SlideDots";
import { useIsMobile } from "@/hooks/use-mobile";
import { responsiveImage } from "@/lib/image";

export type HeroSlide = {
  id: string;
  media_type: "image" | "video";
  src: string;
  mobile_src?: string;
  mobile_media_type?: "image" | "video";
  title: string; // use "\n" for line breaks
  subtitle: string;
  cta_label: string;
  cta_href: string;
  cta2_label?: string;
  cta2_href?: string;
};

// A slide saved as "video" with a photo uploaded (or the other way round)
// rendered nothing: a photo can't play in <video>. Trust the file when its
// URL says what it is (Cloudinary's /image/ or /video/ path, or extension).
function fileMediaType(src: string, saved: "image" | "video"): "image" | "video" {
  if (/\/image\/upload\/|\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(src)) return "image";
  if (/\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(src)) return "video";
  return saved;
}

const AUTOPLAY_MS = 6500;
const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroSlider({ slides: data }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const isMobile = useIsMobile();

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
  const mediaSrc = isMobile && slide.mobile_src ? slide.mobile_src : slide.src;
  const mediaType = fileMediaType(mediaSrc, isMobile && slide.mobile_src ? (slide.mobile_media_type ?? "image") : slide.media_type);
  const lines = slide.title.split("\n");
  const parallax = Math.min(scrollY * 0.25, 90);

  return (
    <section
      className="dark-section relative w-full overflow-hidden min-h-[420px]"
      style={{ height: "calc(100vh - var(--topbar-h))" }}
    >
      {/* Media layers — no dark filter, grain or placeholder over the photos.
          The old slide stays fully visible until the new one has faded in on
          top of it, so no background shows between slides. */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1.1, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.6, delay: 1.1, ease: EASE } }}
          className="absolute inset-0"
          style={{ transform: `translateY(${parallax}px)` }}
        >
          {mediaType === "video" ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={mediaSrc} type="video/mp4" />
            </video>
          ) : (
            <img
              {...responsiveImage(mediaSrc, { maxWidth: 1920, sizes: "100vw" })}
              alt=""
              aria-hidden
              fetchPriority={active === 0 ? "high" : "auto"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Text content is bottom-anchored (not vertically centered) — this keeps it
          clear of the fixed marquee+navbar stack regardless of exact bar height,
          and matches the reference layout. */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 lg:px-16 pb-12 sm:pb-16">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-[clamp(2.25rem,8vw,6rem)] leading-[0.95] tracking-[-0.03em] uppercase max-w-5xl text-display text-white">
              {slide.title.split("\n").map((line, lineIdx) => (
                <span key={`${slide.id}-line-${lineIdx}`} className="block overflow-hidden py-1">
                  {line.split(" ").map((word, wordIdx) => (
                    <motion.span
                      key={`${word}-${wordIdx}`}
                      className="inline-block mr-[0.25em]"
                      initial={{ opacity: 0, y: "120%" }}
                      animate={{ opacity: 1, y: "0%" }}
                      transition={{
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1],
                        delay: 0.1 + (lineIdx * 4 + wordIdx) * 0.06,
                      }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>

            <motion.p
              key={`${slide.id}-sub`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
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
              <FillLink link={slide.cta_href} tone="light">
                {slide.cta_label} <ArrowRight className="w-4 h-4" />
              </FillLink>
              {slide.cta2_label && slide.cta2_href && (
                <FillLink link={slide.cta2_href} tone="light">
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
