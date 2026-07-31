import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Trophy, ArrowRight, Lock, Zap, Gift, Truck, RotateCcw, ShieldCheck, Star,
  Sparkles, Heart, Award, Package, Clock, CheckCircle, type LucideIcon,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import type { PopupPromo } from "@/types/database";

const ICON_MAP: Record<string, LucideIcon> = {
  Lock, Zap, Gift, Trophy, Truck, RotateCcw, ShieldCheck, Star,
  Sparkles, Heart, Award, Package, Clock, CheckCircle,
};

const DEFAULTS: PopupPromo = {
  id: "",
  enabled: true,
  delay_seconds: 15,
  bg_type: "none",
  bg_image_url: null,
  bg_video_url: null,
  logo_url: null,
  badge_text: "DENY WORLD",
  headline_line1: "EARN WHILE",
  headline_line2: "YOU DROP.",
  body_text: "Join Deny World — our private loyalty pool. One qualifying order unlocks you. After that, every rupee earns.",
  rule_unlock_label: "UNLOCK",
  rule_earn_label: "EARN",
  rule_redeem_label: "REDEEM",
  rule_unlock_icon: "Lock",
  rule_earn_icon: "Zap",
  rule_redeem_icon: "Gift",
  rule_earn_value: "1 PT",
  rule_unlock_sub: "single order",
  tier_1_label: "ROOKIE",
  tier_2_label: "RUNNER",
  tier_3_label: "RIOT",
  tier_4_label: "LEGEND",
  cta_primary_text: "LEARN MORE",
  cta_primary_href: "/rewards",
  cta_secondary_text: "LATER",
  created_at: "",
  updated_at: "",
};

/** Fires every page load, no "seen before" memory — the delay is the only gate. */
export function LoyaltyModal() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<PopupPromo>(DEFAULTS);
  const s = getSettings();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("popup_promo").select("*").limit(1).maybeSingle();
        if (data) setCfg(data as PopupPromo);
      } catch {
        // keep DEFAULTS — the popup must still show even if this fetch fails
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !cfg.enabled) return;
    const timer = setTimeout(() => setOpen(true), Math.max(0, cfg.delay_seconds) * 1000);
    return () => clearTimeout(timer);
  }, [cfg.enabled, cfg.delay_seconds]);

  const dismiss = () => setOpen(false);

  if (!cfg.enabled) return null;

  const tiers = [
    { name: cfg.tier_1_label, color: "bg-white/10" },
    { name: cfg.tier_2_label, color: "bg-blue-500/20" },
    { name: cfg.tier_3_label, color: "bg-primary/20" },
    { name: cfg.tier_4_label, color: "bg-primary/40" },
  ];

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
              className="relative w-full max-w-lg border border-white/10 overflow-hidden"
              style={{ pointerEvents: "auto", backgroundColor: "#0a0a0a" }}
            >
              {/* Background */}
              {cfg.bg_type === "image" && cfg.bg_image_url ? (
                <>
                  <img src={cfg.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/65" />
                </>
              ) : cfg.bg_type === "video" && cfg.bg_video_url ? (
                <>
                  <video
                    src={cfg.bg_video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/65" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
              )}

              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center border border-white/15 hover:border-white/40 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="relative p-8 sm:p-10">
                {cfg.logo_url && (
                  <img src={cfg.logo_url} alt="" className="h-8 mb-6 object-contain object-left" />
                )}

                {/* Badge */}
                <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1.5 mb-6">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-mono text-[10px] tracking-[0.25em] text-white/70">{cfg.badge_text}</span>
                </div>

                <h2 className="text-display text-[clamp(2.2rem,6vw,3.5rem)] leading-[0.9] tracking-[-0.02em] uppercase mb-4">
                  {cfg.headline_line1}
                  <br />
                  <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.35)" }}>
                    {cfg.headline_line2}
                  </span>
                </h2>

                <p className="text-white/60 text-sm text-mono leading-relaxed mb-8 max-w-md">
                  {cfg.body_text}
                </p>

                {/* Rules row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    {
                      icon: ICON_MAP[cfg.rule_unlock_icon] ?? Lock,
                      label: cfg.rule_unlock_label,
                      value: `₹${s.entryThreshold.toLocaleString()}`,
                      sub: cfg.rule_unlock_sub,
                    },
                    {
                      icon: ICON_MAP[cfg.rule_earn_icon] ?? Zap,
                      label: cfg.rule_earn_label,
                      value: cfg.rule_earn_value,
                      sub: `per ₹${s.rupeesPerEarnedPoint}`,
                    },
                    {
                      icon: ICON_MAP[cfg.rule_redeem_icon] ?? Gift,
                      label: cfg.rule_redeem_label,
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
                  {tiers.map((t) => (
                    <div key={t.name} className={`flex-1 ${t.color} border border-white/10 py-2 text-center`}>
                      <div className="text-mono text-[9px] tracking-[0.15em] text-white/60">{t.name}</div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-3">
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={cfg.cta_primary_href as any}
                    onClick={dismiss}
                    className="flex-1 bg-white text-black h-11 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest uppercase font-bold hover:bg-white/90 transition-colors"
                  >
                    {cfg.cta_primary_text} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={dismiss}
                    className="border border-white/15 h-11 px-5 text-mono text-xs tracking-widest text-white/50 hover:text-white hover:border-white/40 transition-colors"
                  >
                    {cfg.cta_secondary_text}
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
