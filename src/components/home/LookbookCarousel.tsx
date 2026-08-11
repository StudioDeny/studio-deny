import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";

type MiniProduct = { slug: string; name: string; price: number };

// 9 Curated Editorial Lookbook Slides
const FALLBACK_SLIDES: LookbookSlide[] = [
  {
    id: "fb-1",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 0,
    product_slug: "denim-jacket",
    caption: "2 TONE EMBROIDERY CAP",
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
    caption: "OVERSIZED HOODIE",
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
    caption: "TACTICAL CARGO PANTS",
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
    caption: "BASIC OVERSIZED GRAPHIC TEE",
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
    caption: "VINTAGE LEATHER BOMBER",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-6",
    image_url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 5,
    product_slug: "denim-jacket",
    caption: "RAW STREETWEAR SHOT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-7",
    image_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 6,
    product_slug: "oversized-hoodie",
    caption: "MODERN MINIMALIST EDIT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-8",
    image_url: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 7,
    product_slug: "cargo-pants",
    caption: "EDITORIAL TAILORED FIT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-9",
    image_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 8,
    product_slug: "graphic-tee",
    caption: "URBAN UTILITY SHOT",
    link_href: null,
    created_at: "",
  },
];

const FALLBACK_PRODUCTS: Record<string, MiniProduct> = {
  "denim-jacket": { slug: "denim-jacket", name: "RIPPED DENIM JACKET", price: 4999 },
  "oversized-hoodie": { slug: "oversized-hoodie", name: "OVERSIZED HOODIE", price: 3499 },
  "cargo-pants": { slug: "cargo-pants", name: "TACTICAL CARGO PANTS", price: 3999 },
  "graphic-tee": { slug: "graphic-tee", name: "BASIC OVERSIZED GRAPHIC TEE", price: 2199 },
  "leather-bomber": { slug: "leather-bomber", name: "VINTAGE LEATHER BOMBER", price: 7999 },
};

export function LookbookCarousel() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<LookbookSlide[]>([]);
  const [products, setProducts] = useState<Record<string, MiniProduct>>({});
  
  // Track Index dictates which card is currently positioned at POSITION 4 (CENTER - 1)
  const [trackIndex, setTrackIndex] = useState(3);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const pointerStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch Supabase data if available
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

  const baseSlides = slides.length > 0 ? slides : FALLBACK_SLIDES;
  
  // Expand slide ring to ensure 9 visible card positions can seamlessly cycle
  const rawSlides = (() => {
    let list = [...baseSlides];
    while (list.length < 18) {
      list = [...list, ...baseSlides];
    }
    return list;
  })();

  const mergedProducts = { ...FALLBACK_PRODUCTS, ...products };
  const total = rawSlides.length;

  const handleNext = useCallback(() => {
    setTrackIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setTrackIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Cinematic automatic card progression right to left through the fixed Position 4 active zone
  useEffect(() => {
    if (isSectionHovered || isDragging || total === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 3200);
    return () => clearInterval(timer);
  }, [isSectionHovered, isDragging, total, handleNext]);

  // Smooth mouse wheel / trackpad scroll
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 180) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta > 15) {
      handleNext();
      lastWheelTime.current = now;
    } else if (delta < -15) {
      handlePrev();
      lastWheelTime.current = now;
    }
  };

  // Pointer drag swiping
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    setIsDragging(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current !== null) {
      const deltaX = e.clientX - pointerStartX.current;
      if (deltaX > 35) {
        handlePrev();
      } else if (deltaX < -35) {
        handleNext();
      }
    }
    pointerStartX.current = null;
    setTimeout(() => setIsDragging(false), 50);
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
    setIsDragging(false);
  };

  if (total === 0) return null;

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // STRICT SPEC RULE: POSITION 4 IS THE FIXED ACTIVE ZONE (CENTER - 1).
  // The card at trackIndex % total is currently occupying POSITION 4!
  const activeCardIndex = trackIndex % total;

  const handleCardClick = (idx: number, slide: LookbookSlide) => {
    if (idx === activeCardIndex) {
      const slug = slide.product_slug ?? "denim-jacket";
      navigate({ to: "/product/$slug", params: { slug } });
    } else {
      setTrackIndex(idx);
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full py-16 sm:py-28 bg-neutral-950 text-neutral-900 select-none overflow-hidden"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      {/* 12. LARGE PHOTOGRAPHIC BACKGROUND (behind the ivory lookbook panel) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1800&auto=format&fit=crop"
          alt="Editorial Backdrop"
          className="w-full h-full object-cover filter grayscale contrast-125 opacity-40 transform scale-105"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      {/* 1. OVERALL LAYOUT CONTAINER */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8">
        
        {/* Ivory/Cream Floating Editorial Panel Sheet */}
        <div className="w-full bg-[#F5F4F0] text-neutral-900 shadow-2xl p-6 sm:p-12 md:p-16 rounded-none border border-black/10 relative overflow-hidden">
          
          {/* TOP HEADER: TOP LEFT Oversized Typography + TOP RIGHT Minimal Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 sm:pb-12 border-b border-black/10">
            {/* TOP LEFT Oversized Title */}
            <h2 className="font-sans text-5xl sm:text-7xl md:text-8xl font-black lowercase tracking-tighter text-black leading-none flex items-center">
              lookbook<span className="text-2xl sm:text-4xl font-mono align-super ml-1">©</span>
            </h2>

            {/* TOP RIGHT Understated Navigation */}
            <div className="flex items-center gap-6 sm:gap-10 font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] text-neutral-700 uppercase">
              <Link to="/lookbook" className="hover:text-black transition-colors">GALLERY</Link>
              <Link to="/about" className="hover:text-black transition-colors">ABOUT</Link>
              <Link to="/contact" className="hover:text-black transition-colors">CONTACT</Link>
            </div>
          </div>

          {/* MIDDLE / LOWER INTERACTIVE LOOKBOOK STAGE */}
          <div className="relative pt-10 sm:pt-16 w-full flex flex-col items-center">

            {/* 9-CARD HORIZONTAL SEQUENCE WITH FIXED POSITION 4 (CENTER - 1) ACTIVE ZONE */}
            <div
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="w-full flex items-center justify-center gap-3 sm:gap-4 overflow-visible py-4 cursor-grab active:cursor-grabbing relative h-[360px] sm:h-[480px]"
              style={{ perspective: "1000px" }}
            >
              {rawSlides.map((slide, idx) => {
                // Signed offset relative to activeCardIndex (which sits at POSITION 4)
                let offset = (idx - activeCardIndex + total) % total;
                if (offset > total / 2) offset -= total;
                if (offset < -total / 2) offset += total;

                // Render visible surrounding cards (-4 to +4)
                const maxVisibleOffset = isMobile ? 2 : isTablet ? 3 : 4;
                if (Math.abs(offset) > maxVisibleOffset) return null;

                // STRICT RULE: POSITION 4 IS THE FIXED ACTIVE ZONE (offset === 0)
                const isActive = offset === 0;

                // Geometry math: Position 4 (isActive) sits at X = -offsetDelta to align at Position 4 (Center - 1)
                const normalWidth = isMobile ? 115 : isTablet ? 140 : 165;
                const activeWidth = isMobile ? 220 : isTablet ? 270 : 315;
                const gap = isMobile ? 12 : 16;

                // Calculate X translation relative to Position 4 (CENTER - 1)
                let x = 0;
                // Position 4 is offset slightly to the left of stage center (CENTER - 1)
                const centerShiftX = isMobile ? -60 : -140;

                if (offset === 0) {
                  x = centerShiftX;
                } else if (offset > 0) {
                  x = centerShiftX + (activeWidth / 2) + gap + (normalWidth / 2) + (offset - 1) * (normalWidth + gap);
                } else {
                  x = centerShiftX - ((activeWidth / 2) + gap + (normalWidth / 2) + (Math.abs(offset) - 1) * (normalWidth + gap));
                }

                const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;
                const slideNum = String((idx % baseSlides.length) + 1).padStart(2, "0");

                // Depth & Scale hierarchy (Section 10)
                // Normal cards: scale ~0.78 - 0.85; Active card: scale 1.0
                const cardScale = isActive ? 1.0 : Math.max(0.78, 1 - Math.abs(offset) * 0.06);

                return (
                  <motion.div
                    key={`${slide.id}-${idx}`}
                    onClick={() => handleCardClick(idx, slide)}
                    animate={{
                      x,
                      scale: cardScale,
                      height: isActive ? (isMobile ? "310px" : "440px") : (isMobile ? "160px" : "240px"),
                      width: isActive ? (isMobile ? "220px" : "315px") : (isMobile ? "115px" : "165px"),
                      opacity: isActive ? 1.0 : Math.max(0.75, 1 - Math.abs(offset) * 0.08),
                      zIndex: isActive ? 50 : 20 - Math.abs(offset),
                    }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ position: "absolute" }}
                    className={`shrink-0 overflow-hidden rounded-none cursor-pointer group transition-all duration-300 border ${
                      isActive
                        ? "border-black shadow-2xl ring-1 ring-black/10"
                        : "border-black/10 bg-neutral-200"
                    }`}
                  >
                    {/* Portrait Photographic Image / Video */}
                    {slide.media_type === "video" ? (
                      <video src={slide.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                    )}

                    {/* 6. ACTIVE CARD INFORMATION UI — Integrated directly ON TOP of active photograph */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-5 text-white pointer-events-auto">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 0.05 }}
                          className="font-mono space-y-1"
                        >
                          {/* 7. INFORMATION HIERARCHY */}
                          <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                            ({slideNum}) / PORTRAIT
                          </p>
                          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white leading-tight font-sans truncate">
                            {product ? product.name : slide.caption || "PROFESSIONAL PORTRAIT"}
                          </h3>
                          <p className="text-[9px] text-white/60 uppercase tracking-widest">
                            STUDIO DENY — 2026
                          </p>
                          <div className="pt-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-white uppercase hover:text-primary transition-colors">
                              VIEW PROJECT <span className="text-primary font-bold">→</span>
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* BOTTOM EDITORIAL METADATA & MORE LINK */}
            <div className="mt-8 sm:mt-12 text-center flex flex-col items-center gap-2">
              <Link
                to="/lookbook"
                className="font-mono text-xs sm:text-sm font-bold tracking-[0.25em] text-neutral-800 hover:text-black uppercase underline underline-offset-8 transition-colors"
              >
                (MORE)
              </Link>
              <p className="font-mono text-[9px] text-neutral-500 tracking-[0.2em] uppercase mt-1">
                STUDIO DENY — STREETWEAR PHOTOGRAPHY — 2026
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
