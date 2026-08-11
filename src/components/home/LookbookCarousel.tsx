import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";

type MiniProduct = { slug: string; name: string; price: number };

// Fallback slides in case database has fewer items, ensuring 9 cards can always be displayed
const FALLBACK_SLIDES: LookbookSlide[] = [
  {
    id: "fb-1",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 0,
    product_slug: "denim-jacket",
    caption: null,
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-2",
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 1,
    product_slug: "oversized-hoodie",
    caption: null,
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-3",
    image_url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 2,
    product_slug: "cargo-pants",
    caption: null,
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-4",
    image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 3,
    product_slug: "graphic-tee",
    caption: null,
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-5",
    image_url: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 4,
    product_slug: "leather-bomber",
    caption: null,
    link_href: null,
    created_at: "",
  },
];

const FALLBACK_PRODUCTS: Record<string, MiniProduct> = {
  "denim-jacket": { slug: "denim-jacket", name: "RIPPED DENIM JACKET", price: 4999 },
  "oversized-hoodie": { slug: "oversized-hoodie", name: "OVERSIZED HOODIE", price: 3499 },
  "cargo-pants": { slug: "cargo-pants", name: "TACTICAL CARGO PANTS", price: 3999 },
  "graphic-tee": { slug: "graphic-tee", name: "HEAVYWEIGHT GRAPHIC TEE", price: 2199 },
  "leather-bomber": { slug: "leather-bomber", name: "VINTAGE LEATHER BOMBER", price: 7999 },
};

export function LookbookCarousel() {
  const [slides, setSlides] = useState<LookbookSlide[]>([]);
  const [products, setProducts] = useState<Record<string, MiniProduct>>({});
  const heading = useSectionHeading("lookbook", "LOOKBOOK", { subtitle: "Swipe through curated fits built for daily movement." });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isInView, setIsInView] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStartX = useRef<number | null>(null);

  // Resize listener for responsive breakpoint calculations
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch Supabase data
  useEffect(() => {
    supabase
      .from("lookbook_slides")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(async ({ data }) => {
        if (!data || data.length === 0) return;
        const withProduct = data.filter((s) => s.product_slug);
        if (withProduct.length > 0) {
          setSlides(withProduct);
          const slugs = withProduct.map((s) => s.product_slug).filter((s): s is string => !!s);
          if (slugs.length > 0) {
            const { data: prods } = await supabase.from("products").select("slug,name,price").in("slug", slugs);
            if (prods && prods.length > 0) {
              const map: Record<string, MiniProduct> = {};
              (prods as MiniProduct[]).forEach((p) => { map[p.slug] = p; });
              setProducts(map);
            }
          }
        }
      });
  }, []);

  // IntersectionObserver for viewport pause/resume
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Prepare source slides & ring array
  const rawSlides = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const mergedProducts = { ...FALLBACK_PRODUCTS, ...products };

  // Expand slides so ring length is >= 12 for seamless infinite circular cycling
  const ring = (() => {
    if (rawSlides.length === 0) return [];
    let list = [...rawSlides];
    while (list.length < 12) {
      list = [...list, ...rawSlides];
    }
    return list;
  })();

  const total = ring.length;

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Motion pauses ONLY when mouse goes directly onto a card (isCardHovered is true)
  useEffect(() => {
    if (!isInView || isCardHovered || isDragging || total === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [isInView, isCardHovered, isDragging, total, handleNext]);

  // Trackpad / Mouse Wheel Scroll Handler
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 200) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta > 15) {
      handleNext();
      lastWheelTime.current = now;
    } else if (delta < -15) {
      handlePrev();
      lastWheelTime.current = now;
    }
  };

  // Touch / Mouse Drag event handlers for real-time fluid gesture swiping
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    setIsDragging(true);
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const deltaX = e.clientX - pointerStartX.current;
    setDragX(deltaX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current !== null) {
      const deltaX = e.clientX - pointerStartX.current;
      if (deltaX > 40) {
        handlePrev();
      } else if (deltaX < -40) {
        handleNext();
      }
    }
    pointerStartX.current = null;
    setDragX(0);
    setTimeout(() => setIsDragging(false), 50);
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
    setDragX(0);
    setIsDragging(false);
  };

  if (total === 0) return null;

  // Responsive Breakpoints:
  // Desktop (>= 1024): 9 participating cards (maxOffset = 4)
  // Tablet (768 - 1023): 7 participating cards (maxOffset = 3)
  // Mobile (< 768): 5 participating cards (maxOffset = 2)
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const maxOffset = isMobile ? 2 : isTablet ? 3 : 4;
  const baseCardWidth = isMobile ? 160 : isTablet ? 200 : 240;

  return (
    <section
      ref={containerRef}
      onWheel={handleWheel}
      className="py-16 sm:py-24 bg-[#E2E2E4] overflow-hidden border-t border-border select-none relative"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => {
        setIsSectionHovered(false);
        setIsCardHovered(false);
      }}
    >
      {/* BACKGROUND LAYER 1: Tactile Canvas Grain Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* BACKGROUND LAYER 2: Soft Studio Floor Lighting Spotlight */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(255, 255, 255, 0.85) 0%, rgba(226, 226, 228, 0.45) 45%, transparent 80%)",
        }}
      />

      {/* BACKGROUND LAYER 3: Architectural Layout Grid */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-40 sm:opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.035) 1px, transparent 1px)",
          backgroundSize: isMobile ? "70px 70px" : isTablet ? "110px 110px" : "140px 140px",
        }}
      />

      {/* BACKGROUND LAYER 4: Giant Ghost Typography ("STUDIO DENY") */}
      <div
        className="absolute inset-0 pointer-events-none z-0 flex items-center justify-between px-4 sm:px-12 overflow-hidden select-none"
        aria-hidden="true"
      >
        <span className="font-display text-[clamp(6rem,22vw,24rem)] leading-none uppercase tracking-tight text-black/[0.04] font-black transform -translate-y-2">
          STUDIO
        </span>
        <span className="font-display text-[clamp(6rem,22vw,24rem)] leading-none uppercase tracking-tight text-black/[0.04] font-black transform -translate-y-2">
          DENY
        </span>
      </div>

      {/* BACKGROUND LAYER 5: Precision Architectural Crosshairs (+) */}
      <div className="absolute inset-0 pointer-events-none z-0 select-none hidden sm:block">
        {/* Top Center Crosshair */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-black/25">
          <svg className="w-5 h-5" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1">
            <line x1="10" y1="0" x2="10" y2="20" />
            <line x1="0" y1="10" x2="20" y2="10" />
          </svg>
        </div>
        {/* Left Side Crosshairs */}
        <div className="absolute top-28 left-12 text-black/25">
          <svg className="w-4 h-4" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1">
            <line x1="8" y1="0" x2="8" y2="16" />
            <line x1="0" y1="8" x2="16" y2="8" />
          </svg>
        </div>
        <div className="absolute top-1/2 left-24 -translate-y-1/2 text-black/20">
          <svg className="w-4 h-4" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1">
            <line x1="8" y1="0" x2="8" y2="16" />
            <line x1="0" y1="8" x2="16" y2="8" />
          </svg>
        </div>
        {/* Right Side Crosshairs */}
        <div className="absolute top-28 right-12 text-black/25">
          <svg className="w-4 h-4" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1">
            <line x1="8" y1="0" x2="8" y2="16" />
            <line x1="0" y1="8" x2="16" y2="8" />
          </svg>
        </div>
        <div className="absolute top-1/2 right-24 -translate-y-1/2 text-black/20">
          <svg className="w-4 h-4" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1">
            <line x1="8" y1="0" x2="8" y2="16" />
            <line x1="0" y1="8" x2="16" y2="8" />
          </svg>
        </div>
      </div>

      {/* BACKGROUND LAYER 6: Micro Technical Metadata & Ruler Scale Annotations */}
      <div className="absolute inset-x-6 sm:inset-x-12 top-6 bottom-6 pointer-events-none z-0 hidden sm:flex flex-col justify-between text-black/35 font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase select-none">
        {/* Top Annotation Row */}
        <div className="flex justify-between items-start">
          <div className="leading-tight">
            <p className="font-bold text-black/40">STUDIO DENY</p>
            <p className="text-black/30">LOOKBOOK 01</p>
          </div>
          <div className="text-right leading-tight">
            <p className="font-bold text-black/40">SS / FW</p>
            <p className="text-black/30">24</p>
          </div>
        </div>

        {/* Bottom Annotation Row */}
        <div className="flex justify-between items-end">
          <div className="space-y-1.5">
            <p className="text-[8px] text-black/30 tracking-[0.25em]">18.5204° N, 73.8567° E</p>
            <div className="leading-tight">
              <p className="font-bold text-black/40">CURATED FITS</p>
              <p className="text-black/30">BUILT FOR DAILY MOVEMENT</p>
            </div>
            {/* Technical Ruler Scale */}
            <div className="w-36 h-2 border-t border-black/20 flex justify-between pt-1">
              <div className="w-px h-1.5 bg-black/40" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1.5 bg-black/40" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1.5 bg-black/40" />
            </div>
          </div>

          <div className="text-right space-y-1.5 flex flex-col items-end">
            <div className="flex items-center gap-1.5 justify-end">
              <div className="leading-tight">
                <p className="font-bold text-black/40">MADE IN INDIA</p>
                <p className="text-black/30">WORN WORLDWIDE</p>
              </div>
              <svg className="w-3.5 h-3.5 text-black/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
            {/* Technical Ruler Scale */}
            <div className="w-36 h-2 border-t border-black/20 flex justify-between pt-1">
              <div className="w-px h-1.5 bg-black/40" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1.5 bg-black/40" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1 bg-black/20" />
              <div className="w-px h-1.5 bg-black/40" />
            </div>
          </div>
        </div>
      </div>

      {/* FOREGROUND LAYER 7: Heading */}
      <div className="relative z-10 max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-8 sm:mb-12 text-center">
        <h2
          className="text-[clamp(3.5rem,11vw,7rem)] leading-none tracking-[-0.04em] uppercase text-display font-black"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </h2>
        {heading.subtitle && (
          <p className="text-base sm:text-lg mt-3 opacity-70 max-w-xl mx-auto text-mono font-medium">
            {heading.subtitle}
          </p>
        )}
      </div>

      {/* Full-Bleed 3D Stage with Ground Shadows & Real-time Gesture Swiping */}
      <div
        className="relative z-10 w-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y overflow-visible"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
          height: isMobile ? "410px" : isTablet ? "510px" : "610px",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {ring.map((slide, i) => {
          // Calculate relative signed offset in ring (-total/2 to +total/2)
          let offset = (i - (activeIndex % total) + total) % total;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;

          const absOffset = Math.abs(offset);
          const isVisible = absOffset <= maxOffset;

          if (!isVisible) return null;

          const isCenter = offset === 0;
          const sign = Math.sign(offset);

          // 1. Scale relationship: Center Hero = 1.50x, Step 1 = 1.25x, Step 2 = 1.10x, Step 3 = 0.95x, Step 4 = 0.80x
          const scale = isCenter
            ? 1.50
            : absOffset === 1
            ? (isMobile ? 1.15 : isTablet ? 1.20 : 1.25)
            : absOffset === 2
            ? (isMobile ? 0.95 : isTablet ? 1.05 : 1.10)
            : absOffset === 3
            ? (isTablet ? 0.90 : 0.95)
            : 0.80;

          // 2. Horizontal Spread across full-bleed screen (medium ~10-20% controlled overlap)
          const getX = () => {
            if (absOffset === 0) return 0;
            if (isMobile) {
              return sign * (absOffset === 1 ? 145 : 265);
            }
            if (isTablet) {
              return sign * (absOffset === 1 ? 215 : absOffset === 2 ? 395 : 550);
            }
            // Desktop: full-bleed wide spread
            return sign * (absOffset === 1 ? 260 : absOffset === 2 ? 485 : absOffset === 3 ? 680 : 850);
          };

          const x = getX() + dragX;

          // 3. Z-Depth (Elevation & spatial distance)
          const getZ = () => {
            if (isCenter) return 0;
            if (isMobile) return -absOffset * 35;
            if (isTablet) return -absOffset * 45;
            return -absOffset * 60;
          };

          const z = getZ();

          // 4. Vertical alignment: ALL cards share the same primary vertical centerline
          const y = 0;

          // 5. Zero Card Tilt: perfectly upright
          const rotateY = 0;

          // 6. Opacity: Center 100%, Side cards 95-98% (all fully visible & readable)
          const opacity = isCenter ? 1.0 : Math.max(0.95, 1 - absOffset * 0.012);

          // 7. Z-Index: Hero on top, side cards layered behind
          const zIndex = 100 - absOffset * 10;

          const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;

          // Calculate vertical floor offset so all card contact shadows rest on the unified studio floor plane
          const maxHeroRenderedHeight = baseCardWidth * (4 / 3) * 1.50;
          const currentRenderedHeight = baseCardWidth * (4 / 3) * scale;
          const shadowFloorOffsetPx = (maxHeroRenderedHeight - currentRenderedHeight) / 2;

          return (
            <motion.div
              key={`${slide.id}-${i}`}
              onClick={() => {
                if (!isCenter) {
                  setActiveIndex(i);
                }
              }}
              animate={{
                x,
                y,
                z,
                rotateY,
                scale,
                opacity,
              }}
              transition={{
                duration: isDragging ? 0.05 : 0.75,
                ease: isDragging ? "linear" : [0.16, 1, 0.3, 1],
              }}
              style={{
                position: "absolute",
                zIndex,
                transformStyle: "preserve-3d",
                width: `${baseCardWidth}px`,
                aspectRatio: "3 / 4",
              }}
              onMouseEnter={() => {
                setIsCardHovered(true);
              }}
              onMouseLeave={() => {
                setIsCardHovered(false);
              }}
              className="group relative cursor-pointer"
            >
              {/* Realistic Ground Floor Contact Shadow aligned to unified floor baseline */}
              <div
                className="absolute left-1/2 w-[85%] h-6 bg-black/50 blur-lg rounded-[100%] pointer-events-none transition-all duration-700"
                style={{
                  bottom: `${-16 - shadowFloorOffsetPx / scale}px`,
                  transform: `translateX(-50%) scaleY(0.35) scale(${isCenter ? 1.15 : 0.95})`,
                  opacity: isCenter ? 0.65 : Math.max(0.2, 0.45 - absOffset * 0.08),
                }}
              />

              {/* Card Container */}
              <div className="relative w-full h-full overflow-hidden rounded-xl sm:rounded-2xl bg-neutral-900 shadow-xl border border-black/10">
                {/* 100% Full-Bleed Image/Video */}
                {slide.media_type === "video" ? (
                  <video
                    src={slide.image_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={slide.image_url}
                    alt={product?.name ?? ""}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}

                {/* Black Gradient Overlay — Fades in ONLY when mouse hovers onto the card */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Bottom Text Overlay — Slides UP from bottom ONLY when mouse hovers onto the card */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 z-10 flex items-center justify-between gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-white truncate">
                    {product ? product.name : "STUDIO DENY"}
                  </span>
                  <Link
                    to="/product/$slug"
                    params={{ slug: product?.slug ?? "denim-jacket" }}
                    className="shrink-0 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-white hover:text-primary transition-colors flex items-center gap-1"
                  >
                    SHOP THE LOOK <span className="text-primary font-bold">→</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Manual Page Dot Indicators */}
      <div className="relative z-20 flex justify-center items-center gap-2 mt-4 sm:mt-6">
        {rawSlides.map((_, idx) => {
          const isSelected = (activeIndex % rawSlides.length) === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                isSelected ? "w-7 bg-black" : "w-1.5 bg-black/25 hover:bg-black/60"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}
