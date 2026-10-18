import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** How long one quote holds before the next replaces it. */
const HOLD_MS = 7000;

const EASE = [0.16, 1, 0.3, 1] as const;

const QUOTES: { line: string; author: string }[] = [
  { line: "Fashion fades, only style remains the same.", author: "Coco Chanel" },
  { line: "Fashion should be a form of escapism, and not a form of imprisonment.", author: "Alexander McQueen" },
  { line: "Clothes mean nothing until someone lives in them.", author: "Marc Jacobs" },
  { line: "Elegance is elimination.", author: "Cristóbal Balenciaga" },
  { line: "What you wear is how you present yourself to the world.", author: "Miuccia Prada" },
  { line: "Fashion is the armour to survive the reality of everyday life.", author: "Bill Cunningham" },
  { line: "In order to be irreplaceable, one must always be different.", author: "Coco Chanel" },
  { line: "I don't design clothes. I design dreams.", author: "Ralph Lauren" },
  { line: "Style is a way to say who you are without having to speak.", author: "Rachel Zoe" },
  { line: "Simplicity is the keynote of all true elegance.", author: "Coco Chanel" },
];

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
export function QuoteLoader({ delayMs = 0 }: { delayMs?: number }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), HOLD_MS);
    return () => clearInterval(t);
  }, [visible]);

  // Portalled to <body>. The route renders inside the page-transition wrapper
  // in __root.tsx, which animates opacity and so opens a stacking context;
  // any z-index set in here is trapped inside it, and <Footer /> — a sibling
  // of <main>, later in the document — paints straight over the top of it.
  if (!visible || typeof document === "undefined") return null;
  const quote = QUOTES[index];

  return createPortal(
    <div
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
          initial={reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(14px)", letterSpacing: "0.12em" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.02em" }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -14, filter: "blur(10px)", transition: { duration: 0.7, ease: EASE } }}
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
              initial={reduceMotion ? false : { opacity: 0 }}
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
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute bottom-14 z-10"
      >
        <span className="quote-loader__track">
          <span className="quote-loader__bar" />
        </span>
      </motion.div>
    </div>,
    document.body,
  );
}
