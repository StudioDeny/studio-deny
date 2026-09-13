import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STRIKE1 = {
  main: "M 370.0,-20.0 L 364.4,3.6 L 370.9,24.0 L 373.3,40.9 L 378.8,62.2 L 394.2,80.3 L 403.4,99.8 L 401.7,122.1 L 403.0,141.2 L 411.0,162.0 L 409.8,181.1 L 403.7,204.4 L 387.4,226.8 L 394.7,249.5 L 403.3,267.5 L 411.2,282.8 L 410.0,300.0",
  b1: "M 403.4,99.8 L 381.8,123.8 L 359.4,146.6 L 340.0,169.9 L 318.1,198.2 L 284.9,217.2 L 254.7,234.6 L 234.3,258.3 L 210.0,280.0",
  b2: "M 409.8,181.1 L 428.0,190.8 L 452.2,197.3 L 481.9,205.5 L 508.0,214.5 L 539.7,227.7 L 562.0,240.3 L 580.5,250.5 L 590.0,260.0",
  b3: "M 394.7,249.5 L 407.2,267.3 L 412.3,289.1 L 428.4,305.9 L 444.7,320.6 L 453.3,337.3 L 463.1,350.5 L 475.7,365.2 L 480.0,380.0",
};

const STRIKE2 = {
  main: "M 430.0,-20.0 L 435.1,0.8 L 429.8,25.7 L 419.4,43.6 L 414.7,64.3 L 421.5,81.6 L 423.7,101.9 L 434.8,119.2 L 443.5,138.6 L 433.3,160.0 L 412.6,182.4 L 408.9,203.5 L 405.6,223.9 L 409.1,249.8 L 410.9,271.7 L 404.7,296.2 L 390.0,320.0",
  b1: "M 421.5,81.6 L 395.2,101.0 L 379.3,121.2 L 356.9,146.8 L 325.1,168.9 L 313.7,186.0 L 289.5,206.4 L 270.5,223.3 L 260.0,240.0",
  b2: "M 408.9,203.5 L 419.1,219.4 L 429.1,236.9 L 454.7,249.1 L 474.6,264.0 L 488.1,276.2 L 509.8,288.0 L 512.0,297.5 L 520.0,310.0",
};

interface LightningStrikeProps {
  onStrike?: () => void;
}

/**
 * Hyper-realistic electric lightning strike effect
 * Generates instantaneous multi-pulse strobe flash, jagged branching SVG bolts,
 * and electric discharge arcs around the center identity.
 */
export function LightningStrike({ onStrike }: LightningStrikeProps) {
  const [phase, setPhase] = useState<"idle" | "strike1" | "intermission" | "strike2" | "done">("idle");

  useEffect(() => {
    // Fire primary strike right as typography finishes assembly (~850ms)
    const t1 = setTimeout(() => {
      setPhase("strike1");
      onStrike?.();
    }, 850);

    const t2 = setTimeout(() => {
      setPhase("intermission");
    }, 910);

    // Second explosive follow-up return bolt (classic lightning strobe)
    const t3 = setTimeout(() => {
      setPhase("strike2");
      onStrike?.();
    }, 960);

    const t4 = setTimeout(() => {
      setPhase("done");
    }, 1120);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onStrike]);

  const isStriking = phase === "strike1" || phase === "strike2";
  const currentBolt = phase === "strike1" ? STRIKE1 : STRIKE2;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
      {/* ─── 1. Instantaneous Atmospheric Flash ─── */}
      <AnimatePresence>
        {isStriking && (
          <motion.div
            key={`flash-${phase}`}
            initial={{ opacity: phase === "strike2" ? 0.75 : 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: phase === "strike2" ? 0.18 : 0.08, ease: "easeOut" }}
            className="absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      {/* ─── 2. Branching Lightning Bolt SVG ─── */}
      <AnimatePresence>
        {isStriking && (
          <motion.div
            key={`bolt-${phase}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          >
            <svg
              viewBox="0 0 800 500"
              className="w-full h-full max-w-[900px] object-contain drop-shadow-[0_0_12px_#ffffff]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Outer Electric Aura / Core Glow */}
              <path
                d={currentBolt.main}
                fill="none"
                stroke="#60A5FA"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="miter"
                opacity="0.6"
              />
              <path
                d={currentBolt.b1}
                fill="none"
                stroke="#60A5FA"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="miter"
                opacity="0.5"
              />
              <path
                d={currentBolt.b2}
                fill="none"
                stroke="#60A5FA"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="miter"
                opacity="0.5"
              />
              {"b3" in currentBolt && currentBolt.b3 && (
                <path
                  d={currentBolt.b3}
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                  opacity="0.4"
                />
              )}

              {/* Inner Razor-Sharp Pure White Core */}
              <path
                d={currentBolt.main}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
              <path
                d={currentBolt.b1}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
              <path
                d={currentBolt.b2}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
              {"b3" in currentBolt && currentBolt.b3 && (
                <path
                  d={currentBolt.b3}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                />
              )}

              {/* Impact Spark Burst */}
              <circle cx="410" cy="300" r="14" fill="#FFFFFF" opacity="0.9" />
              <circle cx="410" cy="300" r="28" fill="#60A5FA" opacity="0.4" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
