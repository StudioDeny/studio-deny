import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [flashOpacity, setFlashOpacity] = useState(0);

  useEffect(() => {
    // Strobe / Flash sequence timings (in ms)
    const flashTimes = [
      { time: 100, opacity: 0.95 },
      { time: 180, opacity: 0.2 },
      { time: 260, opacity: 0.85 },
      { time: 340, opacity: 0.1 },
      { time: 800, opacity: 0.7 },
      { time: 1400, opacity: 0.85 },
      { time: 2100, opacity: 1.0 }, // Final full-screen flash at 100%
    ];

    const timeouts: NodeJS.Timeout[] = [];

    // Trigger strobe flashes
    flashTimes.forEach(({ time, opacity }) => {
      timeouts.push(
        setTimeout(() => {
          setFlashOpacity(opacity);
          // Quick turn off after flash
          timeouts.push(
            setTimeout(() => {
              setFlashOpacity(0);
            }, 60)
          );
        }, time)
      );
    });

    // Percentage counter logic
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 18);

    // Exit preloader after final flash
    const exitTimeout = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      clearInterval(interval);
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
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
          className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {/* Full Screen Flash Strobe Overlay */}
          <div
            className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-75 ease-out"
            style={{ opacity: flashOpacity }}
          />

          {/* Flash Background Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950 to-black opacity-90" />

          {/* Center Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-2xl text-center">
            {/* DENY SPACE Logo Image with Inverted Black/White Filter */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative mb-8"
            >
              <img
                src="/deny-space-preloader.png"
                alt="DENY SPACE"
                className="w-[280px] sm:w-[420px] md:w-[560px] h-auto object-contain invert brightness-200 contrast-200 drop-shadow-[0_0_35px_rgba(255,255,255,0.6)]"
              />
            </motion.div>

            {/* Counter and Strobe Progress Line */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full max-w-xs sm:max-w-md flex flex-col items-center gap-3"
            >
              <div className="flex items-center justify-between w-full text-mono text-xs sm:text-sm tracking-[0.4em] text-zinc-300 font-bold">
                <span className="text-zinc-500">LOADING</span>
                <span className="text-white glow-white">{count}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-[2px] bg-zinc-800 relative overflow-hidden rounded-full">
                <motion.div
                  className="h-full bg-white shadow-[0_0_15px_#ffffff]"
                  style={{ width: `${count}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

