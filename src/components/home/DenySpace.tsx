import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Benefit = { icon: string; label: string; desc: string };
type DenySpaceConfig = {
  logo_url: string;
  logo_type?: "image" | "video";
  description: string;
  benefits: Benefit[];
  cta_label: string;
  cta_href: string;
  bg_color?: string;
  text_color?: string;
};

const ICON_MAP: Record<string, LucideIcon> = {
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle,
};

const DEFAULTS: DenySpaceConfig = {
  logo_url: "https://res.cloudinary.com/dsqeawg67/image/upload/v1783356678/WhatsApp_Image_2026-07-03_at_15.50.55-removebg-preview_i8wcnb.png",
  description: "One qualifying order unlocks you into our private pool. After that, every rupee you spend earns points — and every point is real money off your next order.",
  benefits: [
    { icon: "Truck", label: "FREE SHIPPING", desc: "On every qualifying order" },
    { icon: "RotateCcw", label: "EASY RETURNS", desc: "7-day no-questions returns" },
    { icon: "ShieldCheck", label: "SECURE CHECKOUT", desc: "Your payments, protected" },
    { icon: "Gift", label: "EARLY ACCESS", desc: "48hr head start on new drops" },
  ],
  cta_label: "JOIN DENYSPACE",
  cta_href: "/rewards",
};

export function DenySpace() {
  const [cfg, setCfg] = useState<DenySpaceConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "denyspace")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        if (row.config && typeof row.config === "object") {
          setCfg({ ...DEFAULTS, ...(row.config as Partial<DenySpaceConfig>) });
        }
      });
  }, []);

  if (!visible) return null;

  const bg = cfg.bg_color ?? "#0d0d0d";
  const text = cfg.text_color ?? "#ffffff";

  return (
    <section
      className="py-20 sm:py-28 px-4 sm:px-8 lg:px-16 border-y border-border relative overflow-hidden"
      style={{ background: bg }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="max-w-[900px] mx-auto relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }} className="flex justify-center mb-8">
          {cfg.logo_type === "video" ? (
            <video src={cfg.logo_url} autoPlay loop muted playsInline className="w-full max-w-[220px] sm:max-w-[280px] h-auto invert" />
          ) : (
            <img src={cfg.logo_url} alt="DenySpace" className="w-full max-w-[220px] sm:max-w-[280px] h-auto invert" />
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-sm sm:text-base text-mono leading-relaxed max-w-lg mx-auto mb-14"
          style={{ color: text, opacity: 0.7 }}
        >
          {cfg.description}
        </motion.p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-14">
          {cfg.benefits.slice(0, 4).map((b, idx) => {
            const Icon = ICON_MAP[b.icon] ?? Star;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + idx * 0.08 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="size-16 sm:size-20 rounded-full border flex items-center justify-center" style={{ borderColor: `${text}40`, background: `${text}0d` }}>
                  <Icon className="size-6 sm:size-7" style={{ color: text }} strokeWidth={1.5} />
                </div>
                <div className="text-mono text-[11px] tracking-widest" style={{ color: text }}>{b.label}</div>
                <p className="text-xs text-mono leading-snug" style={{ color: text, opacity: 0.5 }}>{b.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} viewport={{ once: true }}>
          <Link
            to={cfg.cta_href}
            className="inline-flex items-center gap-2 px-10 py-3.5 text-xs tracking-[0.14em] uppercase text-mono font-bold transition-opacity hover:opacity-90"
            style={{ background: text, color: bg }}
          >
            {cfg.cta_label}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
