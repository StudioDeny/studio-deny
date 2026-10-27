import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Phones have no hover. Putting a finger on a product card and scrolling
// counts as hovering it: the card shows its hover look and keeps it until
// another card is touched or it scrolls off screen. One card at a time.

let active: object | null = null;
const listeners = new Set<() => void>();

function setActive(token: object | null) {
  if (active === token) return;
  active = token;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** `verticalOnly`: a sideways swipe doesn't count — for cards whose photos
 *  are themselves swiped sideways. */
export function useTouchHover<T extends HTMLElement>({ verticalOnly = false } = {}) {
  const ref = useRef<T>(null);
  const [token] = useState(() => ({}));
  const touchHover = useSyncExternalStore(subscribe, () => active === token, () => false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t ? { x: t.clientX, y: t.clientY } : null;
      if (active !== token) setActive(null);
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!start || !t || active === token) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.hypot(dx, dy) < 10) return;
      if (verticalOnly && Math.abs(dx) > Math.abs(dy)) { start = null; return; }
      setActive(token);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && active === token) setActive(null);
    });

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    io.observe(el);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      io.disconnect();
      if (active === token) setActive(null);
    };
  }, [token, verticalOnly]);

  const clear = () => { if (active === token) setActive(null); };
  return { ref, touchHover, clear };
}
