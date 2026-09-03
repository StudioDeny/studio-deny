import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLenis } from "@/components/common/SmoothScroll";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";

const DEFAULTS: PreloaderSettings = {
  id: "",
  bg_type: "color",
  bg_image_url: null,
  bg_video_url: null,
  bg_color: "#0D0D0D",
  content_type: "text",
  content_image_url: "/deny-space-preloader.png",
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

  const dismissPreloader = useCallback(() => {
    setLoading(false);
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
  const brandText = cfg.content_text || "STUDIO DENY";

  if (shouldReduceMotion) {
    return (
      <AnimatePresence>
        {loading && (
          <motion.div
            key="preloader-reduced"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-[#0D0D0D] flex items-center justify-center pointer-events-auto select-none"
          >
            <span className="text-display font-black text-3xl tracking-widest text-white uppercase">
              {brandText}
            </span>
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
          exit={{
            opacity: 0,
            scale: 1.015,
            filter: "blur(4px)",
          }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center pointer-events-auto select-none overflow-hidden touch-none cursor-pointer"
          style={{
            backgroundColor: cfg.bg_type === "color" ? cfg.bg_color : "#0D0D0D",
          }}
          onClick={dismissPreloader}
        >
          {/* ════════ ADMIN CONFIGURABLE BACKDROP ════════ */}
          {cfg.bg_type === "image" && cfg.bg_image_url && (
            <img
              src={cfg.bg_image_url}
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

          {/* ════════ SUBTLE LUXURY GRADIENT OVERLAY ════════ */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />

          {/* ════════ CENTER BRAND IDENTITY REVEAL ════════ */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-5"
            >
              {isTextContent ? (
                <div className="flex flex-col items-center">
                  <div className="text-mono text-[10px] sm:text-[11px] tracking-[0.4em] text-primary mb-2 uppercase font-medium">
                    ◢ FORGE YOUR IDENTITY
                  </div>
                  <h1
                    className="text-display text-[clamp(2.75rem,8.5vw,5.5rem)] font-black uppercase tracking-wider leading-none select-none drop-shadow-lg"
                    style={{ color: cfg.text_color || "#FFFFFF" }}
                  >
                    {brandText}
                  </h1>
                </div>
              ) : (
                <img
                  src={cfg.content_image_url}
                  alt="STUDIO DENY"
                  className="w-[240px] sm:w-[340px] md:w-[420px] h-auto object-contain drop-shadow-xl"
                />
              )}

              {/* Minimal Line Progress */}
              <div className="w-36 sm:w-48 h-[2px] bg-white/10 overflow-hidden relative rounded-full mt-2">
                <motion.div
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.05 }}
                />
              </div>
            </motion.div>
          </div>

          {/* ════════ MINIMAL LUXURY FOOTER METRICS ════════ */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



