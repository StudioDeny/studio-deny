import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { SiteLink } from "@/components/ui/SiteLink";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Newsletter } from "./Newsletter";
import { Instagram, Youtube, MessageCircle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getBrandSettings, instagramHref, whatsappHref, outsideHref } from "@/lib/brand";
import type { NavMenuItem, BrandSettings } from "@/types/database";

type FooterColumn = { h: string; l: NavMenuItem[] };

function MagneticFooterLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const springConfig = { damping: 24, stiffness: 190, mass: 0.5 };

  const hoverRotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig);
  const hoverRotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);
  const hoverTranslateX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);
  const hoverTranslateY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-10, 10]), springConfig);

  const dragRotateZ = useTransform(dragX, [-200, 200], [-20, 20]);
  const dragRotateX = useTransform(dragY, [-150, 150], [15, -15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative select-none inline-block touch-none"
    >
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 1.08 }}
        whileDrag={{ scale: 1.1 }}
        className="relative z-10 touch-none select-none cursor-grab active:cursor-grabbing inline-block"
      >
        <motion.div
          animate={
            isDragging
              ? { y: 0, rotateZ: 0 }
              : {
                  y: [0, -4, 0],
                  rotateZ: [-0.5, 0.5, -0.5],
                }
          }
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-block"
        >
          <Link to="/" className="inline-block">
            <BrandLogo style={{ fontSize: "24px" }} />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Footer() {
  // Only what's set in Admin → Navigation (footer) and Admin → Settings.
  const [cols, setCols] = useState<FooterColumn[]>([]);
  const [brand, setBrand] = useState<Partial<BrandSettings>>({});

  useEffect(() => {
    supabase
      .from("navigation_menus")
      .select("items")
      .eq("location", "footer")
      .single()
      .then(({ data }) => {
        const items = (data?.items as NavMenuItem[] | undefined) ?? [];
        const grouped = new Map<string, NavMenuItem[]>();
        for (const item of items) {
          const key = item.group?.trim() || "MORE";
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(item);
        }
        setCols(Array.from(grouped.entries()).map(([h, l]) => ({ h, l })));
      });

    getBrandSettings().then(setBrand);
  }, []);

  const tagline = brand.tagline?.trim();
  const socials = [
    { href: instagramHref(brand.social_instagram), label: "Instagram", Icon: Instagram },
    { href: outsideHref(brand.social_youtube), label: "YouTube", Icon: Youtube },
    { href: whatsappHref(brand.social_whatsapp), label: "WhatsApp", Icon: MessageCircle },
  ].filter((s): s is { href: string; label: string; Icon: typeof Instagram } => !!s.href);

  return (
    <footer className="border-t border-border mt-24" style={{ background: "var(--color-surface)" }}>
      {/* Upper footer: the brand red sweeps in from the left on hover, like the
          STUDIO DENY strip below; text turns white on the red. */}
      <div className="btn-fill group/top">
        <span className="btn-fill-bg bg-accent" aria-hidden="true" />
        <div className="relative z-[1] px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-12 md:gap-16 lg:gap-24 max-w-[1560px] mx-auto">
          {/* Brand column */}
          <div className="md:w-[280px] lg:w-[340px] shrink-0">
            <MagneticFooterLogo />
            {tagline && (
              <p className="mt-4 text-muted-foreground group-hover/top:text-white/85 transition-colors duration-500 leading-relaxed whitespace-pre-line" style={{ fontSize: "13px", maxWidth: "240px" }}>
                {tagline}
              </p>
            )}

            <div className="mt-7">
              <div className="text-mono text-primary group-hover/top:text-white transition-colors duration-500 mb-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>◢ DROP ALERTS</div>
              <Newsletter />
            </div>

            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socials.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="size-9 border border-border flex items-center justify-center text-muted-foreground group-hover/top:border-white/60 group-hover/top:text-white hover:!border-white hover:bg-white hover:!text-accent transition-colors duration-500">
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns — admin-managed via /admin/navigation (footer tab), grouped by
              each item's "group" field. Adding a new group there creates a whole new column. */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12">
            {cols.map((c) => (
              <div key={c.h}>
                <div className="text-mono text-primary group-hover/top:text-white transition-colors duration-500 mb-5" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>{c.h}</div>
                <ul className="space-y-3">
                  {c.l.map((i) => (
                    <li key={`${i.label}-${i.href}`}>
                      <SiteLink
                        href={i.href}
                        className="text-muted-foreground group-hover/top:text-white/85 hover:!text-white hover:underline underline-offset-4 transition-colors duration-500 hover:translate-x-0.5 inline-block"
                        style={{ fontSize: "13px" }}
                      >
                        {i.label}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand strip: solid black, huge white "Studio Deny." in the logo lettering; the brand red
          sweeps in from the left on hover (same .btn-fill as the buttons). */}
      <Link to="/" className="btn-fill group block bg-foreground text-white" aria-label="STUDIO DENY home">
        <span className="btn-fill-bg bg-accent" />
        <span className="relative z-[1] block max-w-[1560px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <span className="block brand-logo-type text-white min-w-0" style={{ fontSize: "clamp(44px, 9vw, 136px)" }}>
            Studio Deny.
          </span>
        </span>
      </Link>

      {/* Studio credit: small line on the black, the studio name as a red tag. */}
      <div className="bg-foreground border-t border-white/10">
        <div className="max-w-[1560px] mx-auto px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-2">
          <span className="flex items-center gap-2 text-mono text-white/70" style={{ fontSize: "12px", letterSpacing: "0.3em" }}>
            <span className="size-2 rounded-full bg-accent pulse-dot" />
            MAINTAINED &amp; DEVELOPED BY
          </span>
          <a
            href="https://www.artechstudio.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 bg-accent text-white px-3.5 py-1.5 text-mono font-semibold hover:bg-white hover:text-foreground transition-colors duration-300"
            style={{ fontSize: "15px", letterSpacing: "0.25em" }}
          >
            AR TECH STUDIO
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>

      <div className="border-t border-border px-4 md:px-8 py-6 flex flex-col md:flex-row flex-wrap gap-3 md:gap-x-6 items-center justify-center md:justify-between" style={{ background: "var(--color-muted)" }}>
        <div className="w-full md:w-auto min-w-0 text-mono text-muted-foreground text-center break-words" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          © {new Date().getFullYear()} STUDIO DENY · ALL RIGHTS RESERVED
        </div>
        <div className="w-full md:w-auto flex flex-wrap justify-center items-center gap-5 sm:gap-6 text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          <Link to="/privacy" className="hover:text-foreground transition-colors">PRIVACY</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">TERMS</Link>
        </div>
      </div>
    </footer>
  );
}
