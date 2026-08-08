import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
  bg_media_url?: string;
  bg_media_type?: "image" | "video";
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
          className="relative z-10 flex justify-center pointer-events-none select-none"
        >
          {logoType === "video" ? (
            <video
              src={logoUrl}
              autoPlay
              loop
              muted
              playsInline
              draggable={false}
              className="w-full max-w-[220px] sm:max-w-[300px] h-auto invert pointer-events-none select-none transition-transform duration-300"
            />
          ) : (
            <img
              src={logoUrl}
              alt="DenySpace"
              draggable={false}
              className="w-full max-w-[220px] sm:max-w-[300px] h-auto invert pointer-events-none select-none transition-transform duration-300"
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

  const bg = cfg.bg_color ?? "#0d0d0d";
  const text = cfg.text_color ?? "#ffffff";
  const hasBgMedia = !!cfg.bg_media_url;

  return (
    <section
      className="py-10 sm:py-16 px-4 sm:px-8 lg:px-16 border-y border-border relative overflow-hidden"
      style={hasBgMedia ? undefined : { background: bg }}
    >
      {hasBgMedia && (
        cfg.bg_media_type === "video" ? (
          <video src={cfg.bg_media_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={cfg.bg_media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      )}
      {!hasBgMedia && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      )}
      {hasBgMedia && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}
      <div className="max-w-[900px] mx-auto relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }} className="flex justify-center mb-0 mt-0">
          <PlayableDenyLogo logoUrl={cfg.logo_url} logoType={cfg.logo_type} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          viewport={{ once: true }}
          className="text-sm sm:text-base text-mono leading-relaxed max-w-lg mx-auto mt-1 mb-10 whitespace-pre-line"
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
