import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import Lenis from "lenis";

interface SmoothScrollContextType {
  lenis: Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({ lenis: null });

export const useLenis = () => useContext(SmoothScrollContext);

interface SmoothScrollProps {
  children: ReactNode;
  duration?: number;
  lerp?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
  smoothWheel?: boolean;
}

export function SmoothScroll({
  children,
  duration = 1.2,
  lerp = 0.1,
  wheelMultiplier = 1.0,
  touchMultiplier = 1.5,
  smoothWheel = true,
}: SmoothScrollProps) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const location = useLocation();
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Accessibility check: honor user's reduced-motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      duration,
      lerp,
      wheelMultiplier,
      touchMultiplier,
      smoothWheel,
      autoResize: true,
    });

    setLenisInstance(lenis);

    function raf(time: number) {
      lenis.raf(time);
      reqIdRef.current = requestAnimationFrame(raf);
    }

    reqIdRef.current = requestAnimationFrame(raf);

    return () => {
      if (reqIdRef.current) {
        cancelAnimationFrame(reqIdRef.current);
      }
      lenis.destroy();
      setLenisInstance(null);
    };
  }, [duration, lerp, wheelMultiplier, touchMultiplier, smoothWheel]);

  // Route change handler: reset scroll position smoothly / immediately on navigation
  useEffect(() => {
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true });
    }
  }, [location.pathname, lenisInstance]);

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisInstance }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
