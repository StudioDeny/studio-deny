import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";

/* ─── CMS DEFAULTS ─── */
const DEFAULTS: PreloaderSettings = {
  id: "",
  bg_type: "image",
  bg_image_url: null,
  bg_video_url: null,
  content_type: "image",
  content_image_url: "/deny-space-preloader.png",
  content_text: "STUDIO DENY",
  text_color: "#FFFFFF",
  created_at: "",
  updated_at: "",
};

/* ─── TIMINGS (ms) ─── */
const TIMINGS = {
  STABILIZE: 2600,   // Glitch duration before snapping perfectly clean
  EXIT_TRIGGER: 3200, // Zoom exit trigger
} as const;

const EASE_CINEMATIC = [0.76, 0, 0.24, 1] as const;

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<PreloaderSettings>(DEFAULTS);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [glitching, setGlitching] = useState(true);
  const [phase, setPhase] = useState<"glitch" | "clean" | "exit">("glitch");

  const shouldReduceMotion = useReducedMotion();

  /* ─── Fetch CMS Settings ─── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("preloader_settings").select("*").limit(1).maybeSingle();
        if (data) setCfg(data as PreloaderSettings);
      } catch {
        // Keep DEFAULTS
      } finally {
        setConfigLoaded(true);
      }
    })();
  }, []);

  /* ─── Master Animation Sequence ─── */
  useEffect(() => {
    if (!configLoaded) return;

    // Snap cleanly
    const tClean = setTimeout(() => {
      setGlitching(false);
      setPhase("clean");
    }, TIMINGS.STABILIZE);

    // Zoom-through exit into website
    const tExit = setTimeout(() => {
      setPhase("exit");
      setTimeout(() => setLoading(false), 700);
    }, TIMINGS.EXIT_TRIGGER);

    return () => {
      clearTimeout(tClean);
      clearTimeout(tExit);
    };
  }, [configLoaded]);

  const isTextContent = cfg.content_type === "text";
  const brandText = cfg.content_text || "STUDIO DENY";

  /* ─── Reduced Motion Support ─── */
  if (shouldReduceMotion) {
    return (
      <AnimatePresence>
        {loading && (
          <motion.div
            key="preloader-reduced"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center pointer-events-none select-none"
          >
            {configLoaded && (
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                {isTextContent ? (
                  <span className="text-display text-[clamp(2.5rem,8.5vw,5.5rem)] uppercase tracking-widest font-black text-white">
                    {brandText}
                  </span>
                ) : (
                  <img
                    src={cfg.content_image_url}
                    alt="STUDIO DENY"
                    className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain"
                  />
                )}
                <div className="text-[10px] font-mono tracking-[0.4em] text-white/60 uppercase">
                  L O A D I N G
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE_CINEMATIC }}
          className="fixed inset-0 z-[10000] bg-[#030303] text-white flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {configLoaded && (
            <>
              {/* ════════ STABLE BACKGROUND MEDIA LAYER ════════ */}
              <div className="absolute inset-0 z-0">
                {/* Base Dark Background */}
                <div className="absolute inset-0 bg-[#030303]" />

                {/* Optional Uploaded Image Background */}
                {cfg.bg_type === "image" && cfg.bg_image_url && (
                  <img
                    src={cfg.bg_image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25"
                  />
                )}

                {/* Optional Uploaded Video Background */}
                {cfg.bg_type === "video" && cfg.bg_video_url && (
                  <video
                    src={cfg.bg_video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-25"
                  />
                )}

                {/* Dark Vignette Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.92) 100%)",
                  }}
                />
              </div>

              {/* ════════ SCANLINE OVERLAY ════════ */}
              <div
                className="absolute inset-0 pointer-events-none z-[4] opacity-20"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.6) 3px, transparent 4px)",
                }}
              />

              {/* ════════ SUBTLE HORIZONTAL STREAK CANVAS ════════ */}
              <GlitchStreakCanvas glitching={glitching} />

              {/* ════════ MAIN CONTENT CONTAINER WITH ZOOM EXIT ════════ */}
              <motion.div
                className="relative z-10 flex flex-col items-center justify-center px-4 w-full max-w-5xl"
                animate={
                  phase === "exit"
                    ? {
                        scale: 4.2,
                        opacity: 0,
                        filter: "blur(16px)",
                      }
                    : {
                        scale: 1,
                        opacity: 1,
                        filter: "blur(0px)",
                      }
                }
                transition={{ duration: 0.7, ease: EASE_CINEMATIC }}
              >
                {/* HERO BRANDING LOCKUP WITH CONTROLLED HIGH-PRECISION RGB GLITCH */}
                {isTextContent ? (
                  <RGBGlitchText text={brandText} glitching={glitching} />
                ) : (
                  <RGBGlitchImage src={cfg.content_image_url} glitching={glitching} />
                )}

                {/* ELEGANT FLOOR REFLECTION PLANE */}
                <div className="relative w-full max-w-2xl h-10 mt-1 pointer-events-none opacity-50 overflow-hidden">
                  <div
                    className="w-full h-full transform scale-y-[-1] blur-[2.5px] opacity-35"
                    style={{
                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
                    }}
                  >
                    {isTextContent ? (
                      <span className="block text-center text-display text-[clamp(2.5rem,8vw,5.5rem)] uppercase font-black tracking-widest text-white/70">
                        {brandText}
                      </span>
                    ) : (
                      <img src={cfg.content_image_url} alt="" className="h-14 mx-auto object-contain opacity-70" />
                    )}
                  </div>

                  {/* Floor Ambient Color Light Reflections */}
                  <div className="absolute inset-0 flex justify-center gap-14 pointer-events-none opacity-40 blur-md">
                    <div className="w-16 h-3 bg-[#FF003C] rounded-full" />
                    <div className="w-20 h-3 bg-[#FFD700] rounded-full" />
                    <div className="w-16 h-3 bg-[#00F0FF] rounded-full" />
                  </div>
                </div>

                {/* BOTTOM LOADING BAR & CROSSHAIR */}
                <div className="mt-8 flex flex-col items-center gap-3 relative">
                  {/* Thin Loading Bar with Glow Pill */}
                  <div className="w-48 sm:w-60 h-[1.5px] bg-white/20 relative overflow-hidden rounded-full">
                    <motion.div
                      className="absolute inset-y-0 w-1/3 bg-white shadow-[0_0_8px_#FFFFFF] rounded-full"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>

                  {/* L O A D I N G Text & Red Crosshair Accent */}
                  <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.45em] text-white/70 uppercase font-medium">
                    <span>L O A D I N G</span>
                    <span className="text-[#FF003C] font-bold tracking-normal text-xs animate-pulse">+</span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   HIGH-PRECISION RGB GLITCH TEXT ENGINE
   Dominant white main text + controlled Red (#FF003C), Cyan (#00F0FF) & Yellow (#FFD700)
   ═════════════════════════════════════════════════════════════════════════ */
function RGBGlitchText({ text, glitching }: { text: string; glitching: boolean }) {
  const [activeGlitch, setActiveGlitch] = useState(false);
  const [sliceOffset, setSliceOffset] = useState({ top: 0, mid: 0, btm: 0 });
  const [redX, setRedX] = useState(-4);
  const [cyanX, setCyanX] = useState(4);
  const [yellowX, setYellowX] = useState(2);

  useEffect(() => {
    if (!glitching) {
      setActiveGlitch(false);
      return;
    }

    // Rhythmic burst sequence: short glitch burst -> pause -> burst -> clean
    let timeoutId: NodeJS.Timeout;
    const triggerCycle = () => {
      setActiveGlitch(true);
      setSliceOffset({
        top: (Math.random() - 0.5) * 16,
        mid: (Math.random() - 0.5) * 22,
        btm: (Math.random() - 0.5) * 14,
      });
      setRedX(-3 - Math.random() * 5);
      setCyanX(3 + Math.random() * 5);
      setYellowX((Math.random() - 0.5) * 6);

      // Settle back after 120ms burst
      timeoutId = setTimeout(() => {
        setActiveGlitch(false);
        // Schedule next burst after a clean pause (200ms - 450ms)
        timeoutId = setTimeout(triggerCycle, 200 + Math.random() * 250);
      }, 120);
    };

    triggerCycle();

    return () => clearTimeout(timeoutId);
  }, [glitching]);

  return (
    <div className="relative select-none py-3 px-6 text-center">
      {/* ─── DOMINANT CRISP MAIN WHITE TYPOGRAPHY (Always 100% Readable) ─── */}
      <h1 className="relative z-10 text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider text-white whitespace-nowrap drop-shadow-[0_0_20px_rgba(255,255,255,0.45)]">
        {text}
      </h1>

      {/* ─── RED CHROMATIC DISPLACEMENT LAYER ─── */}
      {glitching && (
        <h1
          className="absolute inset-0 z-20 text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider whitespace-nowrap pointer-events-none mix-blend-screen transition-all duration-75"
          style={{
            color: "#FF003C",
            transform: `translateX(${activeGlitch ? redX : -3}px)`,
            opacity: activeGlitch ? 0.85 : 0.4,
          }}
        >
          {text}
        </h1>
      )}

      {/* ─── CYAN CHROMATIC DISPLACEMENT LAYER ─── */}
      {glitching && (
        <h1
          className="absolute inset-0 z-20 text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider whitespace-nowrap pointer-events-none mix-blend-screen transition-all duration-75"
          style={{
            color: "#00F0FF",
            transform: `translateX(${activeGlitch ? cyanX : 3}px)`,
            opacity: activeGlitch ? 0.85 : 0.4,
          }}
        >
          {text}
        </h1>
      )}

      {/* ─── YELLOW ACCENT CHROMATIC LAYER ─── */}
      {glitching && activeGlitch && (
        <h1
          className="absolute inset-0 z-25 text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider whitespace-nowrap pointer-events-none mix-blend-screen opacity-70"
          style={{
            color: "#FFD700",
            clipPath: "inset(35% 0% 35% 0%)",
            transform: `translateX(${yellowX}px)`,
          }}
        >
          {text}
        </h1>
      )}

      {/* ─── HORIZONTAL SLICE TEAR TOP (0% to 35%) ─── */}
      {glitching && activeGlitch && (
        <div
          className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
          style={{
            clipPath: "inset(0% 0% 65% 0%)",
            transform: `translateX(${sliceOffset.top}px)`,
          }}
        >
          <span className="block text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider text-white whitespace-nowrap">
            {text}
          </span>
        </div>
      )}

      {/* ─── HORIZONTAL SLICE TEAR MIDDLE (35% to 68%) ─── */}
      {glitching && activeGlitch && (
        <div
          className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
          style={{
            clipPath: "inset(35% 0% 32% 0%)",
            transform: `translateX(${sliceOffset.mid}px)`,
          }}
        >
          <span className="block text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider text-white whitespace-nowrap">
            {text}
          </span>
        </div>
      )}

      {/* ─── HORIZONTAL SLICE TEAR BOTTOM (68% to 100%) ─── */}
      {glitching && activeGlitch && (
        <div
          className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
          style={{
            clipPath: "inset(68% 0% 0% 0%)",
            transform: `translateX(${sliceOffset.btm}px)`,
          }}
        >
          <span className="block text-display text-[clamp(2.8rem,9vw,6.5rem)] uppercase font-black leading-none tracking-wider text-white whitespace-nowrap">
            {text}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   HIGH-PRECISION RGB GLITCH IMAGE ENGINE (FOR CMS IMAGE LOGOS)
   ═════════════════════════════════════════════════════════════════════════ */
function RGBGlitchImage({ src, glitching }: { src: string; glitching: boolean }) {
  const [activeGlitch, setActiveGlitch] = useState(false);
  const [sliceOffset, setSliceOffset] = useState({ top: 0, mid: 0 });

  useEffect(() => {
    if (!glitching) {
      setActiveGlitch(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const triggerCycle = () => {
      setActiveGlitch(true);
      setSliceOffset({
        top: (Math.random() - 0.5) * 16,
        mid: (Math.random() - 0.5) * 20,
      });

      timeoutId = setTimeout(() => {
        setActiveGlitch(false);
        timeoutId = setTimeout(triggerCycle, 220 + Math.random() * 250);
      }, 120);
    };

    triggerCycle();

    return () => clearTimeout(timeoutId);
  }, [glitching]);

  return (
    <div className="relative select-none p-4">
      {/* BASE LOGO IMAGE */}
      <img
        src={src}
        alt="STUDIO DENY"
        className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain relative z-10 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.45)]"
      />

      {/* RED CHROMA LAYER */}
      {glitching && (
        <img
          src={src}
          alt=""
          className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-70 filter drop-shadow-[-5px_0_0_#FF003C]"
        />
      )}

      {/* CYAN CHROMA LAYER */}
      {glitching && (
        <img
          src={src}
          alt=""
          className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-70 filter drop-shadow-[5px_0_0_#00F0FF]"
        />
      )}

      {/* YELLOW CHROMA LAYER */}
      {glitching && activeGlitch && (
        <img
          src={src}
          alt=""
          className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain absolute inset-0 z-25 pointer-events-none mix-blend-screen opacity-65 filter drop-shadow-[0_3px_0_#FFD700]"
          style={{ clipPath: "inset(35% 0% 35% 0%)" }}
        />
      )}

      {/* TOP SLICE */}
      {glitching && activeGlitch && (
        <div
          className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
          style={{
            clipPath: "inset(0% 0% 55% 0%)",
            transform: `translateX(${sliceOffset.top}px)`,
          }}
        >
          <img src={src} alt="" className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain" />
        </div>
      )}

      {/* BOTTOM SLICE */}
      {glitching && activeGlitch && (
        <div
          className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
          style={{
            clipPath: "inset(50% 0% 0% 0%)",
            transform: `translateX(${sliceOffset.mid}px)`,
          }}
        >
          <img src={src} alt="" className="w-[260px] sm:w-[380px] md:w-[460px] h-auto object-contain" />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   SUBTLE HORIZONTAL STREAK CANVAS
   Draws refined horizontal noise particles & light streaks
   ═════════════════════════════════════════════════════════════════════════ */
function GlitchStreakCanvas({ glitching }: { glitching: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = ["#FF003C", "#00F0FF", "#FFD700", "#FFFFFF"];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (glitching && Math.random() < 0.65) {
        const streakCount = Math.floor(Math.random() * 6) + 2;

        for (let i = 0; i < streakCount; i++) {
          const y = height / 2 + (Math.random() - 0.5) * 140;
          const x = (Math.random() - 0.5) * width * 0.75 + width / 2;
          const len = Math.random() * 90 + 15;
          const h = Math.random() * 1.5 + 1;
          const color = colors[Math.floor(Math.random() * colors.length)];

          ctx.fillStyle = color;
          ctx.globalAlpha = Math.random() * 0.45 + 0.15;
          ctx.fillRect(x - len / 2, y, len, h);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [glitching]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-2" />;
}
