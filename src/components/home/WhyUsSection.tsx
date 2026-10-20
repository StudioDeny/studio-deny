import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Package, Zap, Shield, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useWebsiteSectionConfig } from "@/lib/websiteSections";

type Feature = { label: string; desc: string };
type WhyUsConfig = {
  features: Feature[];
};

const ICONS = [Package, Zap, Shield, CheckCircle];

const DEFAULTS: WhyUsConfig = { features: [] };

/** Time each card holds before the row advances on its own. */
const AUTOPLAY_MS = 3500;
/** After the visitor drags, swipes or presses an arrow, wait this long. */
const RESUME_AFTER_MS = 6000;

/**
 * "Built different": the brand's reasons, as a swipeable card carousel.
 *
 * Cards are sized so the next one always peeks in at the edge — on a phone
 * one and a bit, on a wide screen three and a bit — which is what tells
 * people the row continues. Embla (via ui/carousel) handles dragging,
 * swiping and the arrow keys; the controls underneath are square to match
 * the rest of the site rather than the wrapper's round defaults.
 *
 * Every feature the admin adds is shown. The old grid stopped at four.
 *
 * It also advances on its own every few seconds (see the autoplay effect).
 */
export function WhyUsSection() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<WhyUsConfig>(
    "why_us",
    DEFAULTS,
  );
  const heading = useSectionHeading("why_us", "BUILT DIFFERENT.", {
    eyebrow: "WHY STUDIO DENY",
    subtitle: "STAYS DIFFERENT.",
  });

  const [api, setApi] = useState<CarouselApi>();
  const [progress, setProgress] = useState(0);
  const [snaps, setSnaps] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSnaps(api.scrollSnapList().length);
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    const onScroll = () => setProgress(Math.min(1, Math.max(0, api.scrollProgress())));
    sync();
    onScroll();
    api.on("select", sync).on("reInit", sync).on("scroll", onScroll).on("reInit", onScroll);
    return () => {
      api.off("select", sync).off("reInit", sync).off("scroll", onScroll).off("reInit", onScroll);
    };
  }, [api]);

  // Auto-scroll. Advances one card at a time and wraps from the end back to
  // the start. Holds while the pointer is over the row (desktop), for a few
  // seconds after any drag, swipe or arrow press so it never pulls away a
  // card someone just chose, while the section is off screen or the tab is
  // hidden, and not at all for reduced-motion users.
  const reduceMotion = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const bleedRef = useRef<HTMLDivElement>(null);
  const inset = useRef(0);

  // Keep `inset` (see the bleed wrapper below) right as the window resizes.
  useEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      const bleed = bleedRef.current;
      if (!row || !bleed) return;
      const next = Math.max(
        0,
        row.getBoundingClientRect().left - bleed.getBoundingClientRect().left,
      );
      if (Math.abs(next - inset.current) < 0.5) return;
      inset.current = next;
      api?.reInit();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [api, visible]);
  const hovering = useRef(false);
  const heldUntil = useRef(0);
  const hold = () => (heldUntil.current = performance.now() + RESUME_AFTER_MS);

  useEffect(() => {
    // The carousel, not the whole row: from sm up it is display:none, never
    // intersects, and so never auto-advances behind the grid.
    const el = bleedRef.current;
    if (!api || !el || reduceMotion) return;

    let onScreen = false;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    api.on("pointerDown", hold);

    const t = window.setInterval(() => {
      if (api.scrollSnapList().length < 2) return;
      if (!onScreen || document.hidden || hovering.current) return;
      if (performance.now() < heldUntil.current) return;
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, AUTOPLAY_MS);

    return () => {
      clearInterval(t);
      io.disconnect();
      api.off("pointerDown", hold);
    };
  }, [api, reduceMotion]);

  if (!visible || cfg.features.length === 0) return null;

  const renderCard = (feature: Feature, idx: number) => {
    const Icon = ICONS[idx % ICONS.length];
    return (
      <article className="group/card h-full min-h-[340px] sm:min-h-[400px] flex flex-col justify-between border border-border bg-surface/40 p-6 sm:p-8 transition-colors duration-500 hover:bg-foreground hover:text-white">
        <div className="flex items-start justify-between gap-4">
          <span
            aria-hidden
            className="text-display leading-[0.85] text-foreground/15 transition-colors duration-500 group-hover/card:text-white/25"
            style={{ fontSize: "clamp(64px, 6vw, 96px)" }}
          >
            {String(idx + 1).padStart(2, "0")}
          </span>
          <Icon
            className="size-6 shrink-0 transition-transform duration-500 group-hover/card:-rotate-6 group-hover/card:scale-110"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>

        <div>
          <h3
            className="text-display uppercase leading-[0.95]"
            style={{ fontSize: "clamp(26px, 2.4vw, 34px)" }}
          >
            {feature.label}
          </h3>
          <p
            className="mt-4 font-medium leading-relaxed text-foreground/70 transition-colors duration-500 group-hover/card:text-white/75"
            style={{ fontSize: "15px" }}
          >
            {feature.desc}
          </p>
        </div>
      </article>
    );
  };

  // When every card fits on screen there is nothing to scroll: hide controls.
  const scrollable = snaps > 1;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border/30 bg-[#E2E2E4] overflow-hidden">
      <div>
        <div className="mb-10 sm:mb-12 flex flex-col">
          {heading.eyebrow && (
            <span className="text-mono text-primary mb-3 text-xs tracking-[0.35em]">
              ◢ {heading.eyebrow}
            </span>
          )}
          <EditorialHeading
            className="text-display leading-none"
            style={
              heading.color
                ? { fontSize: "clamp(36px, 7vw, 80px)", color: heading.color }
                : { fontSize: "clamp(36px, 7vw, 80px)" }
            }
          >
            {heading.text}
          </EditorialHeading>
          {heading.subtitle && (
            <EditorialSubheading
              className="mt-2 text-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground/75"
              delay={0.2}
            >
              {heading.subtitle}
            </EditorialSubheading>
          )}
        </div>

        <motion.div
          ref={rowRef}
          onMouseEnter={() => (hovering.current = true)}
          onMouseLeave={() => (hovering.current = false)}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
        >
          {/* The row bleeds past the content column to both screen edges, so
              cards slide off either side instead of being cut at the column
              with an empty strip beside them. In a centred column the gap to
              each viewport edge is 50vw − 50%; the section's overflow-hidden
              stops it adding a horizontal scrollbar.

              Each card still comes to rest lined up with the heading: `align`
              offsets every snap by `inset` — the distance from the row's
              (screen-edge) start to the heading's left edge, measured rather
              than assumed. containScroll is off because containment would
              pull the first card back to the screen edge. */}
          {/* Tablet and up: every card at once, no carousel. */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cfg.features.map((feature, idx) => (
              <div key={idx}>{renderCard(feature, idx)}</div>
            ))}
          </div>

          {/* Phones only: the swipeable, auto-scrolling carousel. */}
          <div className="sm:hidden">
            <div
              ref={bleedRef}
              style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
            >
              <Carousel
                setApi={setApi}
                opts={{ align: () => inset.current, containScroll: false }}
                aria-label={heading.text}
              >
                <CarouselContent className="-ml-4 sm:-ml-5">
                  {cfg.features.map((feature, idx) => (
                    <CarouselItem key={idx} className="pl-4 basis-[86%]">
                      {renderCard(feature, idx)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            {scrollable && (
              <div className="mt-8 flex items-center gap-5 sm:gap-8">
                {/* How far through the row you are. */}
                <div className="relative h-px flex-1 bg-foreground/15 overflow-hidden" aria-hidden>
                  <div
                    className="absolute inset-y-0 left-0 w-full bg-foreground origin-left"
                    style={{ transform: `scaleX(${Math.max(0.08, progress)})` }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hold();
                      api?.scrollPrev();
                    }}
                    disabled={!canPrev}
                    aria-label="Previous"
                    className="size-11 flex items-center justify-center border border-foreground/25 transition-colors hover:bg-foreground hover:text-white hover:border-foreground disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowLeft className="size-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hold();
                      api?.scrollNext();
                    }}
                    disabled={!canNext}
                    aria-label="Next"
                    className="size-11 flex items-center justify-center border border-foreground/25 transition-colors hover:bg-foreground hover:text-white hover:border-foreground disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowRight className="size-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
