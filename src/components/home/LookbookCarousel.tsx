import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
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
    caption: "PROFESSIONAL PORTRAIT",
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
    caption: "STUDIO EDITORIAL FIT",
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
    caption: "TACTICAL SILHOUETTE",
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
    caption: "HEAVYWEIGHT GRAPHIC",
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
  const [activeIndex, setActiveIndex] = useState(2);
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

  const rawSlides = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const mergedProducts = { ...FALLBACK_PRODUCTS, ...products };
  const total = rawSlides.length;

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Autoplay
  useEffect(() => {
    if (isSectionHovered || isDragging || total === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [isSectionHovered, isDragging, total, handleNext]);

  // Wheel scroll
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

  const activeSlide = rawSlides[activeIndex % total];
  const activeProduct = activeSlide?.product_slug ? mergedProducts[activeSlide.product_slug] : undefined;
  const activeNum = String((activeIndex % total) + 1).padStart(2, "0");

  const isMobile = windowWidth < 768;

  return (
    <section
      ref={containerRef}
      className="relative w-full py-12 sm:py-24 overflow-hidden bg-neutral-950 text-neutral-900 select-none"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      {/* Editorial Suit Background Photo (matching aspect© reference image) */}
      <img
        src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1800&auto=format&fit=crop"
        alt="Aspect Editorial Background"
        className="absolute inset-0 w-full h-full object-cover opacity-50 filter grayscale contrast-125"
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Main Container */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8 flex flex-col items-center">
        
        {/* Floating White Editorial Card Overlay */}
        <div className="w-full bg-[#F6F5F2] text-neutral-900 shadow-2xl p-6 sm:p-12 md:p-16 rounded-none border border-black/10">
          
          {/* Header Row: aspect© logo on left + GALERY ABOUT CONTACT on right */}
          <div className="flex items-center justify-between pb-6 sm:pb-10 border-b border-black/10">
            <h2 className="font-sans text-4xl sm:text-6xl md:text-7xl font-black lowercase tracking-tighter text-black leading-none flex items-center">
              aspect<span className="text-2xl sm:text-4xl font-mono align-super ml-0.5">©</span>
            </h2>
            <div className="flex items-center gap-4 sm:gap-8 font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] text-neutral-800 uppercase">
              <Link to="/lookbook" className="hover:text-black transition-colors">GALERY</Link>
              <Link to="/about" className="hover:text-black transition-colors">ABOUT</Link>
              <Link to="/contact" className="hover:text-black transition-colors">CONTACT</Link>
            </div>
          </div>

          {/* Gallery Stage */}
          <div className="relative my-6 sm:my-10 w-full flex flex-col items-center">
            
            {/* Micro-Metadata block positioned directly above the featured active card */}
            <div className="w-full max-w-[180px] sm:max-w-[240px] mb-3 text-left font-mono text-[9px] sm:text-[10px] leading-tight text-neutral-700 tracking-wider">
              <p className="font-bold text-black mb-0.5">({activeNum})</p>
              <p className="font-bold text-black uppercase truncate">{activeProduct ? activeProduct.name : activeSlide.caption || "PROFESSIONAL PORTRAIT"}</p>
              <p className="text-neutral-500 uppercase text-[8px] sm:text-[9px]">FOR JASMINE KELLER</p>
              <p className="text-neutral-500 uppercase text-[8px] sm:text-[9px]">FROM NORTH & SAGE</p>
            </div>

            {/* Flat 7-Card Horizontal Row (matching aspect© exact card layout) */}
            <div
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="w-full flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 cursor-grab active:cursor-grabbing"
            >
              {rawSlides.map((slide, idx) => {
                const isCenter = idx === activeIndex;
                const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;

                return (
                  <motion.div
                    key={`${slide.id}-${idx}`}
                    onClick={() => setActiveIndex(idx)}
                    animate={{
                      height: isCenter ? (isMobile ? "240px" : "340px") : (isMobile ? "140px" : "200px"),
                      width: isCenter ? (isMobile ? "170px" : "240px") : (isMobile ? "95px" : "140px"),
                      opacity: isCenter ? 1 : 0.82,
                    }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="shrink-0 relative overflow-hidden bg-neutral-200 border border-black/10 cursor-pointer rounded-none group"
                  >
                    {slide.media_type === "video" ? (
                      <video src={slide.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                    {isCenter && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <Link
                          to="/product/$slug"
                          params={{ slug: product?.slug ?? "denim-jacket" }}
                          className="text-white font-mono text-[9px] sm:text-[10px] font-bold tracking-widest uppercase hover:text-primary transition-colors"
                        >
                          SHOP LOOK →
                        </Link>
                      </div>
                    )}
                  </motion.div>
                );
              })}
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

        {/* Outer Bottom Footer Text */}
        <div className="mt-8 text-center font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] text-white/90 uppercase space-y-1">
          <p>@ASPECTSTUDIO</p>
          <p className="text-white/60">BUSINESS PHOTOGRAPHY</p>
        </div>

      </div>
    </section>
  );
}
