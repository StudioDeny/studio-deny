import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";

type MiniProduct = { slug: string; name: string; price: number };

// Fallback slides in case database has fewer items, ensuring full interactive gallery
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
    caption: "RAW SILHOUETTE FIT",
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
    caption: "STREETWEAR EDITORIAL",
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isInView, setIsInView] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStartX = useRef<number | null>(null);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => { setIsInView(entry.isIntersecting); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rawSlides = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const mergedProducts = { ...FALLBACK_PRODUCTS, ...products };

  const ring = (() => {
    if (rawSlides.length === 0) return [];
    let list = [...rawSlides];
    while (list.length < 12) {
      list = [...list, ...rawSlides];
    }
    return list;
  })();

  const total = ring.length;

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    if (!isInView || isSectionHovered || isDragging || total === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [isInView, isSectionHovered, isDragging, total, handleNext]);

  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 220) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta > 15) {
      handleNext();
      lastWheelTime.current = now;
    } else if (delta < -15) {
      handlePrev();
      lastWheelTime.current = now;
    }
  };

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

  const activeSlide = ring[activeIndex % total];
  const activeProduct = activeSlide?.product_slug ? mergedProducts[activeSlide.product_slug] : undefined;
  const activeNum = String((activeIndex % rawSlides.length) + 1).padStart(2, "0");

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const maxOffset = isMobile ? 2 : isTablet ? 3 : 4;

  return (
    <section
      ref={containerRef}
      onWheel={handleWheel}
      className="py-12 sm:py-20 bg-[#ECEAE5] border-t border-border select-none relative overflow-hidden"
      onMouseEnter={() => setIsSectionHovered(true)}
      onMouseLeave={() => setIsSectionHovered(false)}
    >
      {/* Editorial Outer Wrapper Card (matching reference background frame) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="bg-[#F5F4F0] text-neutral-900 shadow-2xl p-6 sm:p-12 md:p-16 relative overflow-hidden">
          
          {/* Header Row: Large aspect© / lookbook© Branding + Nav Links */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 sm:pb-12 border-b border-black/10">
            <h2 className="text-display text-5xl sm:text-7xl md:text-8xl tracking-tighter lowercase font-black text-black leading-none">
              lookbook<span className="text-3xl sm:text-5xl font-mono align-super inline-block ml-1">©</span>
            </h2>
            <div className="flex items-center gap-6 sm:gap-10 text-mono text-xs sm:text-sm font-bold tracking-[0.25em] text-neutral-700 uppercase">
              <Link to="/lookbook" className="hover:text-black transition-colors">GALLERY</Link>
              <Link to="/shop" className="hover:text-black transition-colors">SHOP</Link>
              <Link to="/contact" className="hover:text-black transition-colors">CONTACT</Link>
            </div>
          </div>

          {/* Center Stage & Cards Carousel */}
          <div
            className="relative my-8 sm:my-14 w-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {/* Metadata overlay directly above the featured active card */}
            <div className="w-full max-w-[320px] sm:max-w-[380px] mb-4 text-left font-mono text-[10px] sm:text-[11px] leading-tight text-neutral-800 tracking-wider">
              <p className="font-bold text-black text-xs sm:text-sm mb-1">({activeNum})</p>
              <p className="font-bold uppercase tracking-widest text-black">{activeProduct ? activeProduct.name : activeSlide.caption || "EDITORIAL FIT PORTRAIT"}</p>
              <p className="text-neutral-500 uppercase tracking-widest text-[9px] sm:text-[10px] mt-0.5">STUDIO DENY — DROP 014</p>
            </div>

            {/* Flat Horizontal Cards Container */}
            <div className="relative w-full h-[360px] sm:h-[440px] md:h-[480px] flex items-center justify-center overflow-visible">
              {ring.map((slide, i) => {
                let offset = (i - (activeIndex % total) + total) % total;
                if (offset > total / 2) offset -= total;
                if (offset < -total / 2) offset += total;

                const absOffset = Math.abs(offset);
                const isVisible = absOffset <= maxOffset;

                if (!isVisible) return null;

                const isCenter = offset === 0;
                const sign = Math.sign(offset);

                // Exact layout geometry matching reference:
                // Active Card: Large, taller (~320x420 on desktop)
                // Side Cards: Smaller (~180x250 on desktop)
                const cardWidth = isCenter
                  ? (isMobile ? 240 : isTablet ? 290 : 340)
                  : (isMobile ? 120 : isTablet ? 150 : 180);

                const cardHeight = isCenter
                  ? (isMobile ? 320 : isTablet ? 380 : 440)
                  : (isMobile ? 180 : isTablet ? 220 : 250);

                const getX = () => {
                  if (absOffset === 0) return 0;
                  const centerHalf = (isMobile ? 240 : isTablet ? 290 : 340) / 2;
                  const sideWidth = isMobile ? 120 : isTablet ? 150 : 180;
                  const gap = isMobile ? 12 : 20;

                  let distance = centerHalf + gap + sideWidth / 2;
                  if (absOffset > 1) {
                    distance += (absOffset - 1) * (sideWidth + gap);
                  }
                  return sign * distance;
                };

                const x = getX() + dragX;
                const zIndex = 50 - absOffset;
                const opacity = isCenter ? 1.0 : Math.max(0.75, 1 - absOffset * 0.1);

                const product = slide.product_slug ? mergedProducts[slide.product_slug] : undefined;

                return (
                  <motion.div
                    key={`${slide.id}-${i}`}
                    onClick={() => {
                      if (!isCenter) setActiveIndex(i);
                    }}
                    animate={{
                      x,
                      width: `${cardWidth}px`,
                      height: `${cardHeight}px`,
                      opacity,
                    }}
                    transition={{
                      duration: isDragging ? 0.05 : 0.45,
                      ease: isDragging ? "linear" : [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      position: "absolute",
                      zIndex,
                    }}
                    className="group relative cursor-pointer shrink-0"
                  >
                    {/* Card Body - Sharp Edges matching reference */}
                    <div className="w-full h-full overflow-hidden bg-neutral-900 rounded-none shadow-md border border-black/10 relative">
                      {slide.media_type === "video" ? (
                        <video
                          src={slide.image_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={slide.image_url}
                          alt={product?.name ?? ""}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Gentle hover overlay with Shop Look link on active card */}
                      {isCenter && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <Link
                            to="/product/$slug"
                            params={{ slug: product?.slug ?? "denim-jacket" }}
                            className="text-mono text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-primary transition-colors"
                          >
                            SHOP THIS LOOK →
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom (MORE) Link matching reference image */}
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

        {/* Footer Annotations under card container (matching reference bottom text) */}
        <div className="flex items-center justify-between mt-6 text-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
          <span>@STUDIODENY</span>
          <span>STREETWEAR PHOTOGRAPHY</span>
        </div>
      </div>
    </section>
  );
}
