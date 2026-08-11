import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";

type MiniProduct = { slug: string; name: string; price: number };

const FALLBACK_SLIDES: LookbookSlide[] = [
  {
    id: "fb-1",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 0,
    product_slug: "denim-jacket",
    caption: "RIPPED DENIM JACKET",
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
  {
    id: "fb-10",
    image_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 9,
    product_slug: "leather-bomber",
    caption: "STRUCTURED OUTERWEAR",
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
  
  // Multiply array for infinite continuous right-to-left scrolling loop
  const rawSlides = (() => {
    let list = [...baseSlides];
    while (list.length < 16) {
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

  // Seamless continuous auto-scroll from right to left
  useEffect(() => {
    if (isSectionHovered || isDragging || total === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 2800);
    return () => clearInterval(timer);
  }, [isSectionHovered, isDragging, total, handleNext]);

  // Mouse wheel listener
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

  // The STATIC SPOTLIGHT POSITION is fixed at index position 3 (the 4th card, immediate next-left to center)
  // Whichever card index currently occupies trackIndex is inside the STATIC SPOTLIGHT SLOT!
  const spotlightCardIndex = trackIndex % total;
  const spotlightSlide = rawSlides[spotlightCardIndex];
  const spotlightProduct = spotlightSlide?.product_slug ? mergedProducts[spotlightSlide.product_slug] : undefined;
  const spotlightNum = String((spotlightCardIndex % baseSlides.length) + 1).padStart(2, "0");

  const handleCardClick = (idx: number, slide: LookbookSlide) => {
    if (idx === spotlightCardIndex) {
      const slug = slide.product_slug ?? "denim-jacket";
      navigate({ to: "/product/$slug", params: { slug } });
    } else {
      setTrackIndex(idx);
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 bg-[#F6F5F2] text-neutral-900 select-none border-t border-border overflow-hidden"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-8 sm:pb-12 border-b border-black/10">
          <h2 className="font-sans text-5xl sm:text-7xl md:text-8xl font-black lowercase tracking-tighter text-black leading-none flex items-center">
            lookbook<span className="text-2xl sm:text-4xl font-mono align-super ml-1">©</span>
          </h2>
          <div className="flex items-center gap-6 sm:gap-10 font-mono text-xs sm:text-sm font-bold tracking-[0.25em] text-neutral-800 uppercase">
            <Link to="/lookbook" className="hover:text-black transition-colors">GALLERY</Link>
            <Link to="/shop" className="hover:text-black transition-colors">SHOP</Link>
            <Link to="/contact" className="hover:text-black transition-colors">CONTACT</Link>
          </div>
        </div>

        {/* Gallery Stage */}
        <div className="relative pt-8 sm:pt-12 w-full flex flex-col items-center">
          
          {/* STATIC METADATA BLOCK — Fixed directly above the Static Spotlight Slot */}
          <div className="w-full flex justify-center mb-4">
            <div className="w-full max-w-[220px] sm:max-w-[320px] text-center font-mono text-[10px] sm:text-[11px] leading-tight text-neutral-800 tracking-wider">
              <AnimatePresence mode="wait">
                <motion.div
                  key={spotlightCardIndex}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="font-bold text-black text-xs sm:text-sm mb-0.5">({spotlightNum})</p>
                  <p className="font-bold uppercase tracking-widest text-black truncate">
                    {spotlightProduct ? spotlightProduct.name : spotlightSlide?.caption || "BASIC OVERSIZED GRAPHIC TEE"}
                  </p>
                  <p className="text-neutral-500 uppercase text-[9px] sm:text-[10px] mt-0.5">
                    STUDIO DENY — DROP 014
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* CONTINUOUS SCROLLING TRACK: Cards move through the fixed static spotlight slot */}
          <div
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="w-full flex items-center justify-center gap-3 sm:gap-4 overflow-visible py-4 cursor-grab active:cursor-grabbing relative"
            style={{
              perspective: "1000px",
            }}
          >
            {/* Render cards array positioned relative to trackIndex */}
            {rawSlides.map((slide, idx) => {
              // Signed offset relative to current spotlight index
              let offset = (idx - spotlightCardIndex + total) % total;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;

              // Only render visible surrounding cards (-3 to +3 or -4 to +4)
              const maxVisibleOffset = isMobile ? 2 : isTablet ? 3 : 4;
              if (Math.abs(offset) > maxVisibleOffset) return null;

              // Is this card currently INSIDE the static spotlight slot?
              const isSpotlightSlot = offset === 0;

              // Horizontal translation X: Cards line up in a flat row relative to the spotlight slot at offset 0
              const itemWidth = isMobile ? 120 : 170;
              const gap = isMobile ? 12 : 16;
              const spotlightWidth = isMobile ? 210 : 310;

              let x = 0;
              if (offset > 0) {
                x = (spotlightWidth / 2) + (gap) + (itemWidth / 2) + (offset - 1) * (itemWidth + gap);
              } else if (offset < 0) {
                x = -((spotlightWidth / 2) + (gap) + (itemWidth / 2) + (Math.abs(offset) - 1) * (itemWidth + gap));
              }

              return (
                <motion.div
                  key={`${slide.id}-${idx}`}
                  onClick={() => handleCardClick(idx, slide)}
                  animate={{
                    x,
                    height: isSpotlightSlot ? (isMobile ? "300px" : "440px") : (isMobile ? "160px" : "240px"),
                    width: isSpotlightSlot ? (isMobile ? "210px" : "310px") : (isMobile ? "120px" : "170px"),
                    opacity: isSpotlightSlot ? 1 : 0.82,
                    zIndex: isSpotlightSlot ? 40 : 20 - Math.abs(offset),
                  }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: "absolute",
                  }}
                  className={`shrink-0 overflow-hidden border cursor-pointer rounded-none group transition-shadow duration-300 ${
                    isSpotlightSlot
                      ? "border-black shadow-2xl ring-2 ring-black/15"
                      : "border-black/10 bg-neutral-200"
                  }`}
                >
                  {slide.media_type === "video" ? (
                    <video src={slide.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                  )}

                  {/* Spotlight Tag inside the static slot */}
                  {isSpotlightSlot && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white font-mono text-[10px] sm:text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                        OPEN PRODUCT <span className="text-primary font-bold">→</span>
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Spacer to maintain vertical container height */}
            <div className="h-[320px] sm:h-[460px] w-full pointer-events-none" />
          </div>

          {/* Bottom (MORE) button */}
          <div className="mt-8 sm:mt-12 text-center">
            <Link
              to="/lookbook"
              className="font-mono text-xs sm:text-sm font-bold tracking-[0.25em] text-neutral-800 hover:text-black uppercase underline underline-offset-8 transition-colors"
            >
              (MORE)
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
