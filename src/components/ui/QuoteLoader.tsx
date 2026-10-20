import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QUOTES } from "@/lib/quotes";

/** How long one quote holds before the next replaces it. */
const HOLD_MS = 7000;

const EASE = [0.16, 1, 0.3, 1] as const;

// Lets one loading screen carry on from another without a seam. The product
// page shows one while its data loads (the route's pending screen) and then
// its own while the photos load: two separate mounts. Without this the second
// would pick a new random quote and replay its entrance — the text visibly
// swapping mid-read.
//
// The live loader publishes its quote while it is mounted, not only when it
// unmounts: React renders the incoming loader *before* running the outgoing
// one's cleanup, so a value written on unmount would arrive too late.
const handoff = { index: -1, liveUntil: 0, shownAt: 0 };
const CARRY_OVER_MS = 600;

/**
 * Once the screen is up it stays at least this long, then fades out.
 * Without a floor, a load served from cache showed it for a frame or two —
 * old page, flash of quote, new page — which read as a glitch rather than a
 * loading screen. Long enough for the quote to land and be read.
 */
const MIN_VISIBLE_MS = 1200;
const EXIT_S = 0.55;

/**
 * Loading screen for product routes: the page goes to the brand grey and a
 * fashion quotation settles into the centre, changing every seven seconds
 * for as long as the fetch runs.
 *
 * The motion is deliberately slow and monochrome. The quote drifts up out of
 * soft focus with its tracking easing in, and once settled a slow highlight
 * passes through the letters so the type is never quite still — earlier
 * versions used a glyph scramble and a red flicker, which read as aggressive
 * against type this large.
 *
 * The starting quote is random per mount — most fetches finish well inside
 * one hold, so otherwise every load would show the same first line.
 *
 * `delayMs` is 0 by default. A delay was worse than the flash it prevented:
 * for those milliseconds the route rendered its empty state and the quote
 * dropped in on top of an apparently empty page.
 */
export function QuoteLoader({
  active = true,
  delayMs = 0,
}: {
  active?: boolean;
  delayMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  // Carrying on from a loader that is on screen (or just left it): same quote,
  // no entrance, and the minimum-time clock keeps running from when *that*
  // one appeared. Otherwise a fresh random quote.
  const [continuing] = useState(() => handoff.index >= 0 && handoff.liveUntil > performance.now());
  // On screen from the very first render when there's no delay. Switching it
  // on in an effect was too late: effects run after the browser paints, so
  // the route's header, filters and footer flashed for a frame first.
  const [present, setPresent] = useState(() => active && delayMs <= 0);
  const shownAt = useRef(continuing ? handoff.shownAt : performance.now());
  const [firstIndex] = useState(() =>
    continuing ? handoff.index : Math.floor(Math.random() * QUOTES.length),
  );
  const [index, setIndex] = useState(firstIndex);
  // Only the quote we carried over skips its entrance; later rotations animate.
  const settled = continuing && index === firstIndex;

  // Show: immediately, after `delayMs`, or again if this page starts a new
  // load while the loader is still mounted.
  useEffect(() => {
    if (!active || present) return;
    const show = () => {
      shownAt.current = performance.now();
      setPresent(true);
    };
    if (delayMs <= 0) return show();
    const t = setTimeout(show, delayMs);
    return () => clearTimeout(t);
  }, [active, present, delayMs]);

  // Hide: not before the minimum. If the page starts loading again first,
  // the cleanup cancels this and the screen simply stays.
  useEffect(() => {
    if (active || !present) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt.current));
    const t = setTimeout(() => setPresent(false), wait);
    return () => clearTimeout(t);
  }, [active, present]);

  useEffect(() => {
    if (!present) return;
    handoff.index = index;
    handoff.shownAt = shownAt.current;
    handoff.liveUntil = Infinity;
    return () => {
      handoff.liveUntil = performance.now() + CARRY_OVER_MS;
    };
  }, [present, index]);

  useEffect(() => {
    if (!present) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), HOLD_MS);
    return () => clearInterval(t);
  }, [present]);

  // Portalled to <body>. The route renders inside the page-transition wrapper
  // in __root.tsx, which animates opacity and so opens a stacking context;
  // any z-index set in here is trapped inside it, and <Footer /> — a sibling
  // of <main>, later in the document — paints straight over the top of it.
  if (typeof document === "undefined") return null;
  const quote = QUOTES[index];

  // The portal stays mounted so AnimatePresence can play the exit.
  return createPortal(
    <AnimatePresence>
      {present && (
        <motion.div
          key="quote-screen"
          // No fade in — it has to cover the page on the first frame — but a
          // soft fade out, so the page is revealed rather than cut to.
          initial={false}
          exit={{
            opacity: 0,
            transition: { duration: reduceMotion ? 0.2 : EXIT_S, ease: [0.37, 0, 0.63, 1] },
          }}
          // Above the fixed top bar (z-100), so the screen really is the whole screen.
          className="fixed inset-0 z-200 flex flex-col items-center justify-center overflow-hidden bg-background px-6"
          role="status"
          aria-label="Loading products"
        >
          {/* Drifting light, behind everything. */}
          <span className="quote-loader__sheen" />

          <AnimatePresence mode="wait" initial={false}>
            <motion.blockquote
              key={index}
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 18, filter: "blur(14px)", letterSpacing: "0.12em" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.02em" }}
              exit={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: -14,
                      filter: "blur(10px)",
                      transition: { duration: 0.7, ease: EASE },
                    }
              }
              transition={{ duration: 1.3, ease: EASE }}
              className="relative z-10 max-w-4xl text-center"
            >
              {/* Drifts continuously; framer owns the blockquote's transform,
              so the float has to live on its own element. */}
              <div className="quote-loader__float">
                {/* The highlight sweep lives on the <p>: background-clip only
                reaches text inside the element carrying the gradient, so the
                line stays one unbroken run rather than a span per word. */}
                <p className="quote-loader__line text-display uppercase leading-[0.95] text-[clamp(1.75rem,5vw,4rem)]">
                  {quote.line}
                </p>

                <motion.footer
                  initial={reduceMotion || settled ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
                  className="mt-8 text-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                >
                  — {quote.author}
                </motion.footer>
              </div>
            </motion.blockquote>
          </AnimatePresence>

          {/* Outside AnimatePresence so it runs uninterrupted across quote
          changes, and with no entrance delay: on a load too short for the
          quote to finish settling, this is the only thing that shows. */}
          <motion.div
            initial={reduceMotion || continuing ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-14 z-10"
          >
            <span className="quote-loader__track">
              <span className="quote-loader__bar" />
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
