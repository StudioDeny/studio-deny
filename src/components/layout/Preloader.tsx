import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";

const DEFAULTS: PreloaderSettings = {
  id: "",
  bg_type: "image",
  bg_image_url: null,
  bg_video_url: null,
  bg_color: "#0a0a0a",
  content_type: "image",
  content_image_url: "/deny-space-preloader.png",
  content_text: "STUDIO DENY",
  text_color: "#000000",
  created_at: "",
  updated_at: "",
};

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<PreloaderSettings>(DEFAULTS);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("preloader_settings").select("*").limit(1).maybeSingle();
        if (data) setCfg(data as PreloaderSettings);
      } catch {
        // keep DEFAULTS
      } finally {
        setConfigLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    // Unmount preloader smoothly (~1.8s total)
    const exitTimeout = setTimeout(() => {
      setLoading(false);
    }, 1800);

    return () => clearTimeout(exitTimeout);
  }, [configLoaded]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10000] bg-[#E2E2E4] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {configLoaded && (
            <>
              {/* Admin-configured backdrop */}
              {cfg.bg_type === "image" && cfg.bg_image_url && (
                <img src={cfg.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {cfg.bg_type === "video" && cfg.bg_video_url && (
                <video
                  src={cfg.bg_video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {cfg.bg_type === "color" && (
                <div className="absolute inset-0 w-full h-full" style={{ background: cfg.bg_color }} />
              )}

              {/* Main Content Container — Sleek Luxury Brand Reveal */}
              <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-3xl text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="relative p-4 flex flex-col items-center gap-6"
                >
                  {cfg.content_type === "text" ? (
                    <span
                      className="block text-display text-[clamp(2.5rem,8vw,5rem)] uppercase tracking-tight font-black"
                      style={{ color: cfg.text_color }}
                    >
                      {cfg.content_text}
                    </span>
                  ) : (
                    <img
                      src={cfg.content_image_url}
                      alt="STUDIO DENY"
                      className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain"
                    />
                  )}

                  {/* Sleek Minimal Loading Line Progress */}
                  <div className="w-32 sm:w-44 h-[2px] bg-black/10 overflow-hidden relative rounded-full mt-2">
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-y-0 w-1/2 bg-black rounded-full"
                    />
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
