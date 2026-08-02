import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";

const DEFAULTS: PreloaderSettings = {
  id: "",
  font_size_px: 14,
  font_weight: 800,
  font_family: "",
  font_color: "#FFFFFF",
  bg_type: "color",
  bg_color: "#000000",
  bg_image_url: null,
  bg_video_url: null,
  created_at: "",
  updated_at: "",
};

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [cfg, setCfg] = useState<PreloaderSettings>(DEFAULTS);
  const [glitchState, setGlitchState] = useState<{
    opacity: number;
    offsetX: number;
    skew: number;
  }>({
    opacity: 0,
    offsetX: 0,
    skew: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("preloader_settings").select("*").limit(1).maybeSingle();
        if (data) setCfg(data as PreloaderSettings);
      } catch {
        // keep DEFAULTS
      }
    })();
  }, []);

  useEffect(() => {
    // Rapid non-uniform glitch bursts packed into 1.8s
    const glitchBursts = [
      { time: 80, opacity: 0.9, duration: 35, x: -6, skew: 5 },
      { time: 120, opacity: 0.4, duration: 25, x: 8, skew: -8 },
      { time: 420, opacity: 0.85, duration: 50, x: 5, skew: -4 },
      { time: 750, opacity: 0.95, duration: 30, x: -10, skew: 12 },
      { time: 790, opacity: 0.3, duration: 25, x: 12, skew: -10 },
      { time: 830, opacity: 0.88, duration: 40, x: -4, skew: 3 },
      { time: 1150, opacity: 0.7, duration: 35, x: 6, skew: -6 },
      { time: 1400, opacity: 1.0, duration: 30, x: -12, skew: 15 },
      { time: 1435, opacity: 0.3, duration: 20, x: 14, skew: -12 },
      { time: 1470, opacity: 0.9, duration: 35, x: -8, skew: 6 },
      { time: 1650, opacity: 1.0, duration: 180, x: -5, skew: 8 }, // Final climax glitch blast
    ];

    const timeouts: NodeJS.Timeout[] = [];

    glitchBursts.forEach(({ time, opacity, duration, x, skew }) => {
      timeouts.push(
        setTimeout(() => {
          setGlitchState({
            opacity,
            offsetX: x,
            skew,
          });

          timeouts.push(
            setTimeout(() => {
              setGlitchState({
                opacity: 0,
                offsetX: 0,
                skew: 0,
              });
            }, duration)
          );
        }, time)
      );
    });

    // Fast 0-100% percentage counter (13ms per tick = ~1.3s count time)
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 13);

    // Completely unmount preloader by 1.85s (under 2s max)
    const exitTimeout = setTimeout(() => {
      setLoading(false);
    }, 1850);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
      clearTimeout(exitTimeout);
    };
  }, []);

  const isGlitched = glitchState.opacity > 0;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{ backgroundColor: cfg.bg_type === "color" ? cfg.bg_color : "#000000" }}
        >
          {/* Admin-configured backdrop (image/video) */}
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

          {/* Irregular Full-Screen Glitch Flash Strobe Layer */}
          <div
            className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-30 ease-linear mix-blend-difference"
            style={{ opacity: glitchState.opacity }}
          />

          {/* Ambient Dark Vignette Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/60 via-black to-black opacity-90" />

          {/* Main Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-3xl text-center">
            {/* DENY SPACE Logo with Irregular Glitch Jitter & RGB Aberration */}
            <div
              className="relative p-4 transition-transform duration-30"
              style={{
                transform: `translate3d(${glitchState.offsetX}px, 0, 0) skewX(${glitchState.skew}deg)`,
              }}
            >
              {/* Main Logo Image */}
              <img
                src="/deny-space-preloader.png"
                alt="DENY SPACE"
                className={`w-[300px] sm:w-[460px] md:w-[580px] h-auto object-contain invert brightness-200 contrast-200 transition-all duration-30 ${
                  isGlitched
                    ? "drop-shadow-[-8px_0_15px_rgba(255,0,85,0.9)] drop-shadow-[8px_0_15px_rgba(0,240,255,0.9)] brightness-[2.5]"
                    : "drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                }`}
              />

              {/* RGB Glitch Ghost Clone 1 */}
              {isGlitched && (
                <img
                  src="/deny-space-preloader.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain invert brightness-150 opacity-70 mix-blend-screen pointer-events-none"
                  style={{
                    transform: `translate3d(${-glitchState.offsetX * 1.5}px, ${Math.random() * 4 - 2}px, 0)`,
                    filter: "drop-shadow(0 0 10px #ff0055)",
                  }}
                />
              )}
            </div>

            {/* Percentage Counter and Glitch Line */}
            <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3 mt-4">
              <div
                className="flex items-center justify-between w-full tracking-[0.4em]"
                style={{
                  fontSize: `${cfg.font_size_px}px`,
                  fontWeight: cfg.font_weight,
                  fontFamily: cfg.font_family || undefined,
                }}
              >
                <span className={isGlitched ? "text-[#ff0055]" : "uppercase"} style={isGlitched ? undefined : { color: cfg.font_color }}>
                  {isGlitched ? "GLITCH // SYS" : "STUDIO DENY"}
                </span>
                <span className="tracking-[0.2em]" style={{ color: isGlitched ? "#00f0ff" : cfg.font_color }}>
                  {count}%
                </span>
              </div>

              {/* Progress Line with Glitch Color Shift */}
              <div className="w-full h-[2px] bg-zinc-900 relative overflow-hidden rounded-full border border-zinc-800">
                <motion.div
                  className={`h-full transition-colors duration-30 ${
                    isGlitched
                      ? "bg-[#ff0055] shadow-[0_0_15px_#ff0055]"
                      : "bg-white shadow-[0_0_15px_#ffffff]"
                  }`}
                  style={{ width: `${count}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}





