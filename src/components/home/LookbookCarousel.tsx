import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";

type MiniProduct = { slug: string; name: string; price: number };

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
        if (!data) return;
        // Only cards with a real product picked are ready to show — never
        // fall back to placeholder data, that would link to products that
        // don't exist in the catalog.
        const withProduct = data.filter((s) => s.product_slug);
        setSlides(withProduct);
        const slugs = withProduct.map((s) => s.product_slug).filter((s): s is string => !!s);
        if (slugs.length > 0) {
          const { data: prods } = await supabase.from("products").select("slug,name,price").in("slug", slugs);
          if (prods) {
            const map: Record<string, MiniProduct> = {};
            (prods as MiniProduct[]).forEach((p) => { map[p.slug] = p; });
            setProducts(map);
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
  const rawSlides = slides;
  const mergedProducts = products;

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
  const baseCardWidth = isMobile ? 175 : isTablet ? 220 : 260;

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


      {/* BACKGROUND LAYER: Giant Ghost Typography ("STUDIO DENY") */}
      <div
        className="absolute inset-0 pointer-events-none z-0 flex items-center justify-between px-4 sm:px-12 overflow-hidden select-none"
        aria-hidden="true"
      >
        <span className="font-display text-[clamp(6rem,22vw,24rem)] leading-none uppercase tracking-[0.2em] text-black/[0.04] font-black transform -translate-y-2">
          STUDIO
        </span>
        <span className="font-display text-[clamp(6rem,22vw,24rem)] leading-none uppercase tracking-[0.2em] text-black/[0.04] font-black transform -translate-y-2">
          DENY
        </span>
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
          height: isMobile ? "490px" : isTablet ? "610px" : "730px",
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
          const cardRatio = 1.45;
          const maxHeroRenderedHeight = baseCardWidth * cardRatio * 1.50;
          const currentRenderedHeight = baseCardWidth * cardRatio * scale;
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
                aspectRatio: "3 / 4.35",
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

              {/* Card Container with Sharp Edges */}
              <div className="relative w-full h-full overflow-hidden rounded-none bg-neutral-900 shadow-xl border border-black/10">
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
                {product && (
                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 z-10 flex items-center justify-between gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-white truncate">
                      {product.name}
                    </span>
                    <Link
                      to="/product/$slug"
                      params={{ slug: product.slug }}
                      className="shrink-0 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-white hover:text-primary transition-colors flex items-center gap-1"
                    >
                      SHOP THE LOOK <span className="text-primary font-bold">→</span>
                    </Link>
                  </div>
                )}
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
