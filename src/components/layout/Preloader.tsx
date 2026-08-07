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
  const [glitchState, setGlitchState] = useState<{
    isGlitched: boolean;
    offsetX: number;
    skew: number;
    redShiftX: number;
    sliceTop: number;
    sliceBot: number;
  }>({
    isGlitched: false,
    offsetX: 0,
    skew: 0,
    redShiftX: 0,
    sliceTop: 0,
    sliceBot: 0,
  });

  useEffect(() => {
    // High-frequency dynamic red glitch bursts
    const glitchBursts = [
      { time: 100, duration: 80, x: -4, skew: 1.5, redX: 7, sliceTop: 10, sliceBot: 60 },
      { time: 260, duration: 110, x: 6, skew: -2, redX: -9, sliceTop: 45, sliceBot: 15 },
      { time: 480, duration: 70, x: -3, skew: 1, redX: 5, sliceTop: 70, sliceBot: 5 },
      { time: 690, duration: 130, x: 9, skew: -3.5, redX: -12, sliceTop: 20, sliceBot: 40 },
      { time: 940, duration: 90, x: -7, skew: 2.5, redX: 10, sliceTop: 55, sliceBot: 20 },
      { time: 1180, duration: 140, x: 11, skew: -4, redX: -15, sliceTop: 15, sliceBot: 50 },
      { time: 1440, duration: 80, x: -5, skew: 2, redX: 8, sliceTop: 35, sliceBot: 30 },
      { time: 1680, duration: 150, x: 10, skew: -3, redX: -11, sliceTop: 65, sliceBot: 8 },
      { time: 1980, duration: 110, x: -8, skew: 3, redX: 12, sliceTop: 25, sliceBot: 35 },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    glitchBursts.forEach(({ time, duration, x, skew, redX, sliceTop, sliceBot }) => {
      timeouts.push(
        setTimeout(() => {
          setGlitchState({
            isGlitched: true,
            offsetX: x,
            skew,
            redShiftX: redX,
            sliceTop,
            sliceBot,
          });

          timeouts.push(
            setTimeout(() => {
              setGlitchState({
                isGlitched: false,
                offsetX: 0,
                skew: 0,
                redShiftX: 0,
                sliceTop: 0,
                sliceBot: 0,
              });
            }, duration)
          );
        }, time)
      );
    });

    // Unmount preloader smoothly (~2.35s total)
    const exitTimeout = setTimeout(() => {
      setLoading(false);
    }, 2350);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(exitTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {/* Main Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-3xl text-center">
            {/* DENY SPACE Graphic Logo with High-Frequency Solid Red Glitch Invert */}
            <div
              className="relative p-4 transition-transform duration-70 ease-out"
              style={{
                transform: `translate3d(${glitchState.offsetX}px, 0, 0) skewX(${glitchState.skew}deg)`,
              }}
            >
              {/* Base Solid Black Logo Graphic */}
              <img
                src="/deny-space-preloader.png"
                alt="DENY SPACE"
                className="w-[300px] sm:w-[460px] md:w-[580px] h-auto object-contain transition-transform duration-70 ease-out"
              />

              {/* Crisp Solid Red Flashing / Sliced Glitch Layer */}
              {glitchState.isGlitched && (
                <img
                  src="/deny-space-preloader.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-transform duration-50 ease-out z-20"
                  style={{
                    transform: `translate3d(${glitchState.redShiftX}px, 0, 0)`,
                    filter:
                      "invert(16%) sepia(99%) saturate(7400%) hue-rotate(352deg) brightness(95%) contrast(110%)",
                    clipPath: `inset(${glitchState.sliceTop}% 0 ${glitchState.sliceBot}% 0)`,
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
