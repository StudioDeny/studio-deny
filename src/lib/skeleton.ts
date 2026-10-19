import type { CSSProperties } from "react";

/**
 * A shimmering placeholder for an image that hasn't loaded yet.
 *
 * Painted as the <img>'s own background: the browser shows an <img>'s
 * background until the real pixels arrive, so the slot reads as a loading
 * skeleton and is covered the moment the photo paints — no wrapper element,
 * no state, no JS.
 *
 * This replaces the earlier blurred-thumbnail preview, which stretched a 40px
 * copy over the whole slot and read as a smear rather than as loading.
 *
 * The sweep runs a finite number of times (~18s) so an image that is slow,
 * broken or never scrolled into view can't leave an animation running for the
 * life of the page. `prefers-reduced-motion` is honoured in styles.css.
 */
export const skeletonStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(100deg, var(--surface) 28%, var(--muted) 48%, var(--surface) 68%)",
  backgroundSize: "220% 100%",
  backgroundRepeat: "no-repeat",
  animation: "skeleton-sweep 1.5s ease-in-out 12",
};
