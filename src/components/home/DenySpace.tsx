import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle, ArrowRight, type LucideIcon,
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
  bg_media_url?: string;
  bg_media_type?: "image" | "video";
};

const ICON_MAP: Record<string, LucideIcon> = {
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle,
};

const DEFAULTS: DenySpaceConfig = {
  logo_url: "https://res.cloudinary.com/dsqeawg67/image/upload/v1783356678/WhatsApp_Image_2026-07-03_at_15.50.55-removebg-preview_i8wcnb.png",
  description: "DenySpace is StudioDeny's evolving cultural platform, created to bring fashion, art, music, movement, and creative expression together. It is a space for emerging voices and boundary-pushing creators who are shaping the culture of tomorrow.\n\nThrough DenySpace Loyalty, every StudioDeny customer becomes part of this world—gaining access to exclusive releases, curated experiences, events, rewards, and opportunities beyond the product.",
  benefits: [
    { icon: "Truck", label: "FREE SHIPPING", desc: "On every qualifying order" },
    { icon: "RotateCcw", label: "EASY RETURNS", desc: "7-day no-questions returns" },
    { icon: "ShieldCheck", label: "SECURE CHECKOUT", desc: "Your payments, protected" },
    { icon: "Gift", label: "EARLY ACCESS", desc: "48hr head start on new drops" },
  ],
  cta_label: "JOIN DENYSPACE",
  cta_href: "/rewards",
};

function PlayableDenyLogo({
  logoUrl,
  logoType,
}: {
  logoUrl: string;
  logoType?: "image" | "video";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isHovered = useMotionValue(0);

  const springConfig = { damping: 24, stiffness: 190, mass: 0.5 };

  const hoverRotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [14, -14]), springConfig);
  const hoverRotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-14, 14]), springConfig);
  const hoverTranslateX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);
  const hoverTranslateY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-12, 12]), springConfig);

  const dragRotateZ = useTransform(dragX, [-250, 250], [-25, 25]);
  const dragRotateX = useTransform(dragY, [-180, 180], [18, -18]);

  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseEnter = () => {
    isHovered.set(1);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    isHovered.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative select-none flex flex-col items-center justify-center p-0 touch-none"
    >
      {/* Draggable Physics & Magnetic 3D Tilt Container */}
      <motion.div
        drag
        dragSnapToOrigin
        dragElastic={0.7}
        dragTransition={{ bounceStiffness: 450, bounceDamping: 20 }}
        style={{
          x: isDragging ? dragX : hoverTranslateX,
          y: isDragging ? dragY : hoverTranslateY,
          rotateZ: isDragging ? dragRotateZ : 0,
          rotateX: isDragging ? dragRotateX : hoverRotateX,
          rotateY: isDragging ? 0 : hoverRotateY,
          perspective: 1000,
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          mouseX.set(0);
          mouseY.set(0);
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 1.08 }}
        whileDrag={{ scale: 1.12 }}
        className="relative z-10 p-0 rounded-2xl group touch-none select-none cursor-grab active:cursor-grabbing"
      >
        {/* Ambient Floating Motion (Breathing when idle) */}
        <motion.div
          animate={
            isDragging
              ? { y: 0, rotateZ: 0 }
              : {
                  y: [0, -6, 0],
                  rotateZ: [-0.6, 0.6, -0.6],
                }
          }
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10 flex flex-col items-center justify-center pointer-events-none select-none"
        >
          {logoType === "video" ? (
            <video
              src={logoUrl}
              autoPlay
              loop
              muted
              playsInline
              draggable={false}
              className="w-full max-w-[240px] sm:max-w-[320px] h-auto invert pointer-events-none select-none transition-transform duration-300"
            />
          ) : (
            <img
              src={logoUrl}
              alt="DenySpace"
              draggable={false}
              className="w-full max-w-[240px] sm:max-w-[320px] h-auto invert pointer-events-none select-none transition-transform duration-300"
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

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

  const bg = cfg.bg_color ?? "#080808";
  const hasBgMedia = !!cfg.bg_media_url;

  return (
    <section
      className="py-8 sm:py-12 px-4 sm:px-8 lg:px-16 relative overflow-hidden bg-[#080808] text-white select-none border-t border-b border-white/10"
      style={hasBgMedia ? undefined : { background: bg }}
    >
      {/* BACKGROUND MEDIA IF CONFIGURED */}
      {hasBgMedia && (
        cfg.bg_media_type === "video" ? (
          <video src={cfg.bg_media_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={cfg.bg_media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      )}



      {/* MAIN CONTAINER */}
      <div className="max-w-[840px] mx-auto relative z-10 text-center flex flex-col items-center">
        {/* DENY SPACE LOGO WITH FULL 3D INTERACTIVE MAGNETIC TILT & DRAGGABLE PHYSICS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="relative flex flex-col items-center mb-1 mt-0"
        >
          {/* Interactive Playable Physics & Magnetic Tilt Logo Component */}
          <PlayableDenyLogo logoUrl={cfg.logo_url} logoType={cfg.logo_type} />
        </motion.div>

        {/* SUB-HEADLINE */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="font-mono text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-white/90 mb-6 flex items-center justify-center gap-2"
        >
          <span className="text-white/40">—</span> A CULTURE. A COMMUNITY. A SPACE FOR WHAT’S NEXT. <span className="text-white/40">—</span>
        </motion.p>

        {/* BODY DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-xs sm:text-sm text-mono leading-relaxed max-w-2xl mx-auto mb-12 text-white/70 whitespace-pre-line font-normal"
        >
          {cfg.description}
        </motion.p>

        {/* BENEFITS GRID WITH THIN VERTICAL DIVIDERS */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 mb-14 border-t border-b border-white/10 py-8">
          {cfg.benefits.slice(0, 4).map((b, idx) => {
            const Icon = ICON_MAP[b.icon] ?? Star;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + idx * 0.08 }}
                viewport={{ once: true }}
                className={`flex flex-col items-center gap-3 px-3 group ${
                  idx < 3 ? "sm:border-r sm:border-white/10" : ""
                }`}
              >
                {/* Circular Icon with Glow Halo */}
                <div className="size-16 sm:size-18 rounded-full border border-white/30 flex items-center justify-center bg-black/60 shadow-[0_0_25px_rgba(255,255,255,0.12)] group-hover:border-white group-hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] transition-all duration-300">
                  <Icon className="size-6 sm:size-7 text-white stroke-[1.5]" />
                </div>
                <div className="text-mono text-[11px] font-bold tracking-[0.2em] uppercase text-white mt-1">
                  {b.label}
                </div>
                <p className="text-[11px] text-mono text-white/50 leading-snug max-w-[160px]">
                  {b.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* JOIN DENYSPACE CTA BUTTON (OUTLINE INITIALLY, SOLID WHITE ON HOVER) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Link
            to={cfg.cta_href}
            className="inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 bg-transparent text-white border-2 border-white font-mono text-xs sm:text-sm tracking-[0.2em] font-bold uppercase rounded-none hover:bg-white hover:text-black transition-all duration-300 shadow-2xl active:scale-95 group"
          >
            {cfg.cta_label}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
