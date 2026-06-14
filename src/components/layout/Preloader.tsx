import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Percentage counter logic
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    // Fade out timer
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.85, 0, 0.15, 1] }}
          className="fixed inset-0 z-[1000] bg-[#0a0a0a] flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="relative overflow-hidden px-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-display text-5xl md:text-[10rem] leading-none text-white tracking-tighter uppercase text-center">
                STUDIO <br className="md:hidden" /> DENY
              </h1>
              
              <div className="mt-8 md:mt-12 flex items-center gap-6 overflow-hidden">
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-12 md:w-24 h-[1px] bg-primary origin-left opacity-30" 
                />
                <div className="text-mono text-[11px] md:text-[13px] tracking-[0.5em] text-primary glow-primary-sm">
                  {count}%
                </div>
                <motion.div 
                   initial={{ scaleX: 0 }}
                   animate={{ scaleX: 1 }}
                   transition={{ duration: 1, delay: 0.5 }}
                   className="w-12 md:w-24 h-[1px] bg-primary origin-right opacity-30" 
                />
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-10 text-mono text-[9px] tracking-[0.4em] text-muted-foreground opacity-30 uppercase"
          >
            ◢ IDENTITY IS STREET
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
