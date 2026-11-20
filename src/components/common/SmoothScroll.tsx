import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

// Native browser scrolling only (no inertia).
export function SmoothScroll({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isPopStateRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Forward/push navigation starts at the top; back/forward keeps the restored position.
  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return <>{children}</>;
}
