import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, Gift, ArrowRight, Lock } from "lucide-react";
import { getSettings } from "@/lib/settings";

const SEEN_KEY = "sd_loyalty_modal_seen";

export function LoyaltyModal() {
  const [open, setOpen] = useState(false);
  const s = getSettings();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY)) return;

    let scrolled = false;
    const onScroll = () => { scrolled = true; };
    window.addEventListener("scroll", onScroll, { passive: true });

    const timer = setTimeout(() => {
      if (scrolled) setOpen(true);
    }, 15000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(SEEN_KEY, "1");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={dismiss}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 overflow-hidden"
              style={{ pointerEvents: "auto" }}
            >
              {/* Grid texture */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center border border-white/15 hover:border-white/40 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="relative p-8 sm:p-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1.5 mb-6">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-mono text-[10px] tracking-[0.25em] text-white/70">DENY WORLD</span>
                </div>

                <h2 className="text-display text-[clamp(2.2rem,6vw,3.5rem)] leading-[0.9] tracking-[-0.02em] uppercase mb-4">
                  EARN WHILE
                  <br />
                  <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.35)" }}>
                    YOU DROP.
                  </span>
                </h2>

                <p className="text-white/60 text-sm text-mono leading-relaxed mb-8 max-w-md">
                  Join Deny World — our private loyalty pool. One qualifying order unlocks you. After that, every rupee earns.
                </p>

                {/* Rules row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    {
                      icon: Lock,
                      label: "UNLOCK",
                      value: `₹${s.entryThreshold.toLocaleString()}`,
                      sub: "single order",
                    },
                    {
                      icon: Zap,
                      label: "EARN",
                      value: `1 PT`,
                      sub: `per ₹${s.rupeesPerEarnedPoint}`,
                    },
                    {
                      icon: Gift,
                      label: "REDEEM",
                      value: `₹${s.rupeesPerPoint}`,
                      sub: "per point",
                    },
                  ].map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.03] p-3 text-center">
                      <item.icon className="w-4 h-4 text-primary mx-auto mb-2 opacity-80" />
                      <div className="text-mono text-[9px] tracking-[0.2em] text-white/40 mb-1">{item.label}</div>
                      <div className="text-display text-xl leading-none">{item.value}</div>
                      <div className="text-mono text-[9px] text-white/40 mt-1">{item.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Tiers mini */}
                <div className="flex gap-1.5 mb-8">
                  {[
                    { name: "ROOKIE", color: "bg-white/10" },
                    { name: "RUNNER", color: "bg-blue-500/20" },
                    { name: "RIOT", color: "bg-primary/20" },
                    { name: "LEGEND", color: "bg-primary/40" },
                  ].map((t) => (
                    <div key={t.name} className={`flex-1 ${t.color} border border-white/10 py-2 text-center`}>
                      <div className="text-mono text-[9px] tracking-[0.15em] text-white/60">{t.name}</div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-3">
                  <Link
                    to="/rewards"
                    onClick={dismiss}
                    className="flex-1 bg-white text-black h-11 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest uppercase font-bold hover:bg-white/90 transition-colors"
                  >
                    LEARN MORE <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={dismiss}
                    className="border border-white/15 h-11 px-5 text-mono text-xs tracking-widest text-white/50 hover:text-white hover:border-white/40 transition-colors"
                  >
                    LATER
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
