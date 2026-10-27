import { useEffect, type RefObject } from "react";

// Sections load their content after the page renders. On a phone the visitor
// is often already scrolling by then, and a section popping in (or growing)
// above them shoves everything down — they suddenly land in another section.
// Browsers' own scroll anchoring isn't reliable here (Safari on iPhone), so
// on touch screens this keeps the section at the top of the screen in place:
// when anything above it changes height, the page scrolls by the same amount.
// `root`'s direct children are the sections.
export function useScrollAnchor(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(pointer: coarse)").matches) return;

    const html = document.documentElement;
    const prevAnchor = html.style.overflowAnchor;
    html.style.overflowAnchor = "none"; // ours only, so the two never both correct

    let anchor: Element | null = null;
    let anchorTop = 0;
    const topbar = () => parseFloat(getComputedStyle(html).getPropertyValue("--topbar-h")) || 0;

    const pick = () => {
      anchor = null;
      const top = topbar();
      for (const child of Array.from(el.children)) {
        if (getComputedStyle(child).position === "fixed") continue;
        const r = child.getBoundingClientRect();
        if (r.height > 0 && r.bottom > top) {
          anchor = child;
          anchorTop = r.top;
          return;
        }
      }
    };

    const hold = () => {
      if (anchor?.isConnected && window.scrollY > 0) {
        const shift = anchor.getBoundingClientRect().top - anchorTop;
        if (Math.abs(shift) >= 1) window.scrollBy(0, shift);
      }
      pick();
    };

    pick();
    // Fires after layout, before paint — the correction is never seen.
    const ro = new ResizeObserver(hold);
    ro.observe(el);
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", pick);
      html.style.overflowAnchor = prevAnchor;
    };
  }, [root]);
}
