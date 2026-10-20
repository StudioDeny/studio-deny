import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import { useLenis } from "@/components/common/SmoothScroll";
import { markPreloaderDone } from "@/lib/preloaderStore";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PreloaderSettings } from "@/types/database";
import { responsiveImage } from "@/lib/image";

const DEFAULTS: PreloaderSettings = {
  id: "",
  bg_type: "color",
  bg_image_url: null,
  bg_video_url: null,
  bg_color: "#0D0D0D",
  content_type: "text",
  content_image_url: "",
  content_text: "STUDIO DENY",
  text_color: "#FFFFFF",
  created_at: "",
  updated_at: "",
};

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<PreloaderSettings>(DEFAULTS);
  const [progress, setProgress] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const { lenis } = useLenis();

  // On the home page the logo shown here is drawn by HeroLogo instead, which
  // sits exactly over this spot and then carries on to the hero — so this one
  // keeps its space (the progress bar stays put) but is not painted.
  const handsOffLogo = useLocation().pathname === "/" && !shouldReduceMotion;

  const dismissPreloader = useCallback(() => {
    setLoading(false);
    markPreloaderDone();
  }, []);

  /* ─── 1. Fetch CMS Preloader Settings ─── */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("preloader_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (isMounted && data) {
          setCfg(data as PreloaderSettings);
        }
      } catch {
        // Fallback to DEFAULTS
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ─── 2. Lock page scrolling and Lenis while active ─── */
  useEffect(() => {
    if (!loading) return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    if (lenis) {
      lenis.stop();
    }

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalTouchAction;
      if (lenis) {
        lenis.start();
      }
    };
  }, [loading, lenis]);

  /* ─── 3. Smooth Progress Counter (0 -> 100% in 1.4s) ─── */
  useEffect(() => {
    if (shouldReduceMotion) {
      const timer = setTimeout(() => dismissPreloader(), 300);
      return () => clearTimeout(timer);
    }

    const startTime = performance.now();
    const duration = 1400; // 1.4s snappy total load time

    let animFrame: number;
    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(rawProgress);

      if (rawProgress < 100) {
        animFrame = requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => {
          dismissPreloader();
        }, 150);
      }
    };

    animFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [shouldReduceMotion, dismissPreloader]);

  /* ─── 4. Keyboard Listener for Instant Skip ─── */
  useEffect(() => {
    if (!loading) return;

    const handleKeyDown = () => {
      dismissPreloader();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, dismissPreloader]);

  const isTextContent = cfg.content_type === "text";

  if (shouldReduceMotion) {
    return (
      <AnimatePresence>
        {loading && (
          <motion.div
            key="preloader-reduced"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="dark-section fixed inset-0 z-[99999] bg-[#0D0D0D] flex items-center justify-center pointer-events-auto select-none"
          >
            <BrandLogo className="text-white" style={{ fontSize: "clamp(28px, 5vw, 48px)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="studio-deny-luxury-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Long and symmetrical so the dark screen dissolves rather than
          // cuts; roughly the length of the logo's glide to the hero, so the
          // two finish together.
          transition={{
            duration: 1,
            ease: [0.37, 0, 0.63, 1],
          }}
          className="dark-section fixed inset-0 z-[99999] flex flex-col items-center justify-center pointer-events-auto select-none overflow-hidden touch-none cursor-pointer"
          style={{
            backgroundColor: cfg.bg_type === "color" ? cfg.bg_color : "#0D0D0D",
          }}
          onClick={dismissPreloader}
        >
          {/* ════════ ADMIN CONFIGURABLE BACKDROP ════════ */}
          {cfg.bg_type === "image" && cfg.bg_image_url && (
            <img
              {...responsiveImage(cfg.bg_image_url, { maxWidth: 2560, sizes: "100vw" })}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}
          {cfg.bg_type === "video" && cfg.bg_video_url && (
            <video
              src={cfg.bg_video_url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}

          {/* ════════ CENTER BRAND IDENTITY REVEAL WITH ANIMATED LOGO ════════ */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              // Leaves ahead of the backdrop, so the long fade isn't carrying
              // a half-transparent progress bar across the hero.
              exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6 relative"
            >
              {/* Studio Deny logo (text). HeroLogo measures this element to
                  know where to draw itself while the preloader runs. */}
              <span data-preloader-logo className={handsOffLogo ? "invisible" : undefined}>
                <BrandLogo className="text-white" style={{ fontSize: "clamp(32px, 6vw, 64px)" }} />
              </span>

              {/* Minimal Luxury Progress Bar */}
              <div className="w-44 sm:w-60 h-[2.5px] bg-white/10 overflow-hidden relative rounded-full mt-2">
                <motion.div
                  className="h-full bg-primary relative rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.05 }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* ════════ MINIMAL LUXURY FOOTER METRICS ════════ */}
          <motion.div
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-mono text-[10px] tracking-[0.3em] text-white/70 uppercase">
                LOADING ARCHIVE
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-mono text-[11px] tracking-widest text-white/90 font-bold">
                {Math.round(progress).toString().padStart(2, "0")}%
              </span>
              <span className="text-mono text-[9px] tracking-[0.2em] text-white/40 uppercase hidden sm:inline-block">
                CLICK ANYWHERE TO SKIP
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



