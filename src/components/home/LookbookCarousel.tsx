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
    caption: "HEAVYWEIGHT GRAPHIC TEE",
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
  {
    id: "fb-11",
    image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 10,
    product_slug: "denim-jacket",
    caption: "HIGH-STREET COAT FIT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-12",
    image_url: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 11,
    product_slug: "oversized-hoodie",
    caption: "TEXTURED KNITWEAR SHOT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-13",
    image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 12,
    product_slug: "cargo-pants",
    caption: "EDITORIAL STREET CUT",
    link_href: null,
    created_at: "",
  },
  {
    id: "fb-14",
    image_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1000&auto=format&fit=crop",
    media_type: "image",
    is_active: true,
    position: 13,
    product_slug: "graphic-tee",
    caption: "MINIMAL GRAPHIC SILHOUETTE",
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
  const [activeIndex, setActiveIndex] = useState(3);
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
  const rawSlides = (() => {
    let list = [...baseSlides];
    while (list.length < 14) {
      list = [...list, ...baseSlides];
    }
    return list;
  })();

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
      className="relative w-full py-16 sm:py-24 bg-[#F6F5F2] text-neutral-900 select-none border-t border-border"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      {/* Full-width Section Content */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8">
        
        {/* Header Row: lookbook© logo on left + GALLERY SHOP CONTACT on right */}
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
        <div className="relative pt-10 sm:pt-14 w-full flex flex-col items-center">
          
          {/* Micro-Metadata block positioned directly above the featured active card */}
          <div className="w-full max-w-[200px] sm:max-w-[260px] mb-4 text-center sm:text-left font-mono text-[10px] sm:text-[11px] leading-tight text-neutral-700 tracking-wider">
            <p className="font-bold text-black text-xs sm:text-sm mb-1">({activeNum})</p>
            <p className="font-bold text-black uppercase truncate">{activeProduct ? activeProduct.name : activeSlide.caption || "2 TONE EMBROIDERY CAP"}</p>
            <p className="text-neutral-500 uppercase text-[9px] sm:text-[10px] mt-0.5">STUDIO DENY — DROP 014</p>
          </div>

          {/* Flat Multi-Card Horizontal Row */}
          <div
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="w-full flex items-center justify-start sm:justify-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar py-4 cursor-grab active:cursor-grabbing"
          >
            {rawSlides.map((slide, idx) => {
              const isCenter = idx === activeIndex;
              const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;

              return (
                <motion.div
                  key={`${slide.id}-${idx}`}
                  onClick={() => setActiveIndex(idx)}
                  animate={{
                    height: isCenter ? (isMobile ? "280px" : "420px") : (isMobile ? "160px" : "240px"),
                    width: isCenter ? (isMobile ? "200px" : "300px") : (isMobile ? "110px" : "170px"),
                    opacity: isCenter ? 1 : 0.85,
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <Link
                        to="/product/$slug"
                        params={{ slug: product?.slug ?? "denim-jacket" }}
                        className="text-white font-mono text-[10px] sm:text-[11px] font-bold tracking-widest uppercase hover:text-primary transition-colors"
                      >
                        SHOP THIS LOOK →
                      </Link>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Bottom (MORE) button */}
          <div className="mt-10 sm:mt-14 text-center">
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
