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
  
  // Continuous global sequence index — increases infinitely to move right to left
  const [globalIndex, setGlobalIndex] = useState(1000);
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
  const mergedProducts = { ...FALLBACK_PRODUCTS, ...products };
  const total = baseSlides.length;

  const handleNext = useCallback(() => {
    setGlobalIndex((prev) => prev + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setGlobalIndex((prev) => prev - 1);
  }, []);

  // Cinematic continuous right-to-left progression through Position 4
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

  const cardBaseWidth = isMobile ? 150 : isTablet ? 190 : 230;
  const cardBaseHeight = isMobile ? 220 : isTablet ? 280 : 330;
  const cardGap = isMobile ? 14 : 22;
  const centerShiftX = isMobile ? -75 : isTablet ? -110 : -140;

  // Visible slot offsets around the current globalIndex
  const visibleOffsets = isMobile
    ? [-2, -1, 0, 1, 2]
    : isTablet
    ? [-3, -2, -1, 0, 1, 2, 3]
    : [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  return (
    <section
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 bg-[#F5F4F0] text-neutral-900 border-t border-border select-none overflow-hidden"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      {/* FULL-WIDTH EDITORIAL CONTAINER */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8">
        
        {/* TOP HEADER: TOP LEFT Oversized Typography + TOP RIGHT Minimal Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 sm:pb-12 border-b border-black/10">
          <h2 className="font-sans text-5xl sm:text-7xl md:text-8xl font-black lowercase tracking-tighter text-black leading-none flex items-center">
            lookbook<span className="text-2xl sm:text-4xl font-mono align-super ml-1">©</span>
          </h2>

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
            className="w-full flex items-center justify-center overflow-visible py-4 cursor-grab active:cursor-grabbing relative h-[380px] sm:h-[480px]"
            style={{ perspective: "1000px" }}
          >
            {visibleOffsets.map((offset) => {
              const absIndex = globalIndex + offset;
              const slideIndex = ((absIndex % total) + total) % total;
              const slide = baseSlides[slideIndex];

              // STRICT SPEC RULE: POSITION 4 IS THE FIXED ACTIVE ZONE (offset === 0)
              const isActive = offset === 0;

              // Smooth scale interpolation: Active = 1.32x, Nearby = 0.85x - 0.78x
              const scale = isActive ? 1.32 : Math.max(0.78, 0.88 - Math.abs(offset) * 0.04);
              const opacity = isActive ? 1.0 : Math.max(0.70, 0.85 - Math.abs(offset) * 0.05);

              // X position math: Continuous forward spacing keyed by continuous absolute index
              const x = centerShiftX + offset * (cardBaseWidth + cardGap);

              const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;
              const slideNum = String((slideIndex % total) + 1).padStart(2, "0");

              return (
                <motion.div
                  key={`card-pos-${absIndex}`} // Continuous linear key: NO CARDS EVER FLY BACKWARDS!
                  onClick={() => {
                    if (isActive) {
                      const slug = slide.product_slug ?? "denim-jacket";
                      navigate({ to: "/product/$slug", params: { slug } });
                    } else {
                      setGlobalIndex(absIndex);
                    }
                  }}
                  initial={{ opacity: 0, scale: scale * 0.9, x: x + (offset > 0 ? 60 : -60) }}
                  animate={{
                    x,
                    scale,
                    opacity,
                    zIndex: isActive ? 50 : 20 - Math.abs(offset),
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1], // Smooth luxury cubic-bezier easing
                  }}
                  style={{
                    position: "absolute",
                    width: `${cardBaseWidth}px`,
                    height: `${cardBaseHeight}px`,
                  }}
                  className={`shrink-0 overflow-hidden rounded-none cursor-pointer group border transition-shadow duration-500 ${
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

                  {/* ACTIVE CARD INFORMATION UI — Integrated directly ON TOP of active photograph */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-4 sm:p-5 text-white pointer-events-auto">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.08 }}
                        className="font-mono space-y-1"
                      >
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
    </section>
  );
}
