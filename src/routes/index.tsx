import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/product/ProductCard";
import { listProducts, type Product } from "@/lib/productsStore";
import { buildMeta, buildLinks, SITE_URL, orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Star, Mail, MessageCircle, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { LoyaltyModal } from "@/components/home/LoyaltyModal";
import { StarDoodle, FlameDoodle, DripDoodle, TagDoodle } from "@/components/home/LoyaltyDoodles";
import { getSettings } from "@/lib/settings";
import { getHomeSections, type HomeSections } from "@/lib/homeSections";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: buildMeta({
      title: "STUDIO DENY — Streetwear For The Restless",
      description: "Studio Deny — heavyweight streetwear, raw graphics, made in India. Limited drops. Hoodies, tees, cargos, outerwear.",
      url: SITE_URL,
    }),
    links: buildLinks(SITE_URL),
    scripts: [
      { type: "application/ld+json", children: orgJsonLd() },
      { type: "application/ld+json", children: websiteJsonLd() },
    ],
  }),
});

const FIT_TILES = [
  {
    slug: "slim-fit",
    label: "SLIM FIT",
    desc: "Tailored through the body, narrower through the leg.",
    img: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80&w=800",
  },
  {
    slug: "regular-fit",
    label: "REGULAR FIT",
    desc: "A timeless straight cut, versatile and clean.",
    img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800",
  },
  {
    slug: "relaxed-fit",
    label: "RELAXED FIT",
    desc: "Easy through the body with a comfortable, casual feel.",
    img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
  },
  {
    slug: "oversized",
    label: "OVERSIZED",
    desc: "Dropped shoulders, extra room, street-ready silhouette.",
    img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=800",
  },
];

const FABRIC_TABS = [
  {
    id: "tshirts",
    name: "T-SHIRTS",
    title: "300+ GSM HEAVYWEIGHT COTTON",
    desc: "Substantial, heavyweight fabric that drapes perfectly and doesn't cling. Pre-shrunk for a consistent fit. Engineered pattern making for the perfect relaxed silhouette with dropped shoulders.",
    img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG",
  },
  {
    id: "shirts",
    name: "SHIRTS",
    title: "PREMIUM OXFORD & FLANNEL",
    desc: "Double-needle stitching on all stress points. High-density weaves for durability while maintaining breathability. Built to soften and get better with every wash.",
    img: "https://studio-deny-demo.vercel.app/assets/001_13.JPG",
  },
  {
    id: "jeans",
    name: "JEANS",
    title: "14OZ JAPANESE SELVEDGE",
    desc: "Raw, unwashed denim that molds to your body over time. Custom branded hardware, reinforced belt loops, and hidden rivets. A modern straight-leg cut that stacks perfectly over sneakers.",
    img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1200",
  },
];

function Index() {
  const [scrollY, setScrollY] = useState(0);
  const heroParallax = Math.min(scrollY * 0.4, 120);

  const [hs, setHs] = useState<HomeSections | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [bestSellersProducts, setBestSellersProducts] = useState<Product[]>([]);
  const [activeFabric, setActiveFabric] = useState(FABRIC_TABS[0]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const ls = getSettings();
  type HeroConfig = { media_type?: "video" | "image"; bg_image?: string; bg_video?: string };
  const [heroConfig, setHeroConfig] = useState<HeroConfig | null>(null);
  const [heroMouseOffset, setHeroMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config")
      .eq("page_slug", "home")
      .eq("section_type", "hero")
      .single()
      .then(({ data }) => { if (data?.config) setHeroConfig(data.config as HeroConfig); });
  }, []);

  useEffect(() => {
    const sections = getHomeSections();
    setHs(sections);
    listProducts().then((all) => {
      setAllProducts(all);
      if (sections.bestSellers.productSlugs.length > 0) {
        const slugSet = new Set(sections.bestSellers.productSlugs);
        const ordered = sections.bestSellers.productSlugs
          .map((s) => all.find((p) => p.slug === s))
          .filter(Boolean) as Product[];
        setBestSellersProducts(ordered);
      } else {
        // fallback: show all products if no curation
        setBestSellersProducts(all.slice(0, 8));
      }
    });
  }, []);

  const scrollCarousel = (dir: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  if (!hs) return null;

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen font-body">
      <LoyaltyModal />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[82vh] sm:min-h-[86vh] w-full flex items-center justify-center overflow-hidden px-4 sm:px-8 lg:px-16 pt-28 sm:pt-32 pb-16"
        onMouseMove={(e) => {
          if (heroConfig?.media_type !== "image") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 18;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
          setHeroMouseOffset({ x, y });
        }}
        onMouseLeave={() => setHeroMouseOffset({ x: 0, y: 0 })}
      >
        {heroConfig?.media_type === "image" && heroConfig.bg_image ? (
          <img
            src={heroConfig.bg_image}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: "brightness(0.55)",
              transform: `translateY(${heroParallax}px) translate(${heroMouseOffset.x}px, ${heroMouseOffset.y}px) scale(1.08)`,
              transition: "transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
          />
        ) : (
          <video autoPlay loop muted playsInline preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.55)", transform: `translateY(${heroParallax}px)` }}>
            <source src={heroConfig?.bg_video || "https://studio-deny-demo.vercel.app/assets/hero-video.mp4"} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute inset-0 z-[1] bg-[#F2F2F0]/40 pointer-events-none" />

        <div className="relative z-10 max-w-[1320px] mx-auto w-full text-foreground">
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className="space-y-6 sm:space-y-8">
            <h1 className="text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display text-foreground">
              IN THE CUT<br />NOT IN THE CROWD
            </h1>
            <p className="text-base sm:text-lg leading-relaxed max-w-xl text-mono text-foreground/75">
              Elevated streetwear engineered for creators. Limited drops, premium cuts, and a fit made to stand apart.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/shop"
                className="group relative overflow-hidden px-8 py-3 min-h-11 border transition-colors duration-300 inline-flex items-center justify-center gap-2 text-mono text-sm tracking-[0.14em] border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground">
                SHOP THE DROP <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/lookbook"
                className="px-8 py-3 min-h-11 border text-sm tracking-[0.14em] transition-colors duration-300 inline-flex items-center justify-center text-mono border-foreground/40 text-foreground hover:border-foreground hover:bg-foreground/10">
                VIEW LOOKBOOK
              </Link>
            </div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-center text-foreground">
          <div className="flex flex-col items-center gap-2 opacity-70">
            <span className="text-[11px] tracking-[0.2em] text-mono">SCROLL</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* Marquee */}
      <section className="relative border-y border-border bg-[#0A0A0A] overflow-hidden">
        <div className="flex">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center ticker-scroll">
              {[
                { label: "NEW DROP", text: "SS26 Studio Bomber & Cargo Set — Available Now", labelCls: "text-lime-300 border-lime-400/60 bg-lime-400/15" },
                { label: "RESTOCK", text: "Essential Hoodie in Black & Slate — Limited Units", labelCls: "text-cyan-300 border-cyan-400/60 bg-cyan-400/15" },
                { label: "ALERT", text: "Members get 48-hr early access to next drop", labelCls: "text-fuchsia-300 border-fuchsia-400/60 bg-fuchsia-400/15" },
              ].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-4 px-8 py-3.5 whitespace-nowrap text-[11px] sm:text-xs tracking-[0.18em] uppercase text-mono">
                  <span className={`inline-flex items-center px-2.5 py-0.5 border text-[9px] tracking-[0.2em] font-bold ${item.labelCls}`}>{item.label}</span>
                  <span className="text-white/85">{item.text}</span>
                  <span className="text-white/30 mx-1">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. BEST SELLERS CAROUSEL ─────────────────────────────────────── */}
      {hs.bestSellers.enabled && bestSellersProducts.length > 0 && (
        <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="flex items-end justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{hs.bestSellers.eyebrow}</span>
              <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">{hs.bestSellers.title}</h2>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button type="button" onClick={() => scrollCarousel("left")}
                className="size-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => scrollCarousel("right")}
                className="size-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </motion.div>

          <div className="relative">
            <div ref={carouselRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {bestSellersProducts.map((product, idx) => (
                <div key={product.slug} className="shrink-0 snap-start" style={{ width: "clamp(220px, 30vw, 320px)" }}>
                  <ProductCard product={product} index={idx} />
                </div>
              ))}
            </div>
            {/* Mobile arrows */}
            <div className="flex sm:hidden items-center justify-center gap-3 mt-4">
              <button type="button" onClick={() => scrollCarousel("left")}
                className="size-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => scrollCarousel("right")}
                className="size-10 border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 border border-border text-sm tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors text-mono">
              SHOP ALL <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. PRODUCT SPECIFICATIONS ──────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-y border-border bg-surface/30">
        <div className="max-w-[1560px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12 sm:mb-16">
            <span className="inline-flex items-center px-3 py-1 border border-border text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-4">THE DETAILS</span>
            <h2 className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-4">
              PREMIUM FABRIC.
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)" }}>
                UNCOMPROMISED QUALITY.
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="order-1 relative h-[45vh] sm:h-[60vh] lg:h-[80vh] overflow-hidden border border-border">
              <AnimatePresence mode="wait">
                <motion.div key={activeFabric.id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${activeFabric.img}')` }} />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60" />
            </div>
            <div className="order-2 flex flex-col justify-center space-y-6 sm:space-y-8">
              {FABRIC_TABS.map((fabric) => (
                <div key={fabric.id} onMouseEnter={() => setActiveFabric(fabric)} onClick={() => setActiveFabric(fabric)}
                  className="group cursor-pointer border-b border-border pb-6 sm:pb-8 last:border-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-4xl sm:text-5xl lg:text-6xl text-display uppercase tracking-wider transition-colors duration-300 ${activeFabric.id === fabric.id ? "text-foreground" : "text-foreground/50 group-hover:text-foreground/80"}`}>
                      {fabric.name}
                    </h3>
                    <ArrowRight className={`w-6 h-6 transition-all duration-300 ${activeFabric.id === fabric.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ${activeFabric.id === fabric.id ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="pt-2">
                      <h4 className="text-sm tracking-[0.15em] uppercase text-mono mb-3 opacity-90">{fabric.title}</h4>
                      <p className="text-base opacity-70 text-mono leading-relaxed max-w-lg">{fabric.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SHOP BY FIT ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10">
          <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">FIND YOUR FIT</span>
          <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">SHOP BY FIT</h2>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {FIT_TILES.map((fit, idx) => (
            <motion.div key={fit.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}>
              <Link to="/shop" search={{ fit: fit.slug } as never}
                className="group relative block overflow-hidden border border-border aspect-[3/4]">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url('${fit.img}')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white text-lg sm:text-2xl font-display uppercase tracking-wider mb-1">{fit.label}</h3>
                  <p className="text-white/70 text-xs sm:text-sm text-mono leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-300">{fit.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-white/80 text-xs tracking-[0.15em] text-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    SHOP NOW <ArrowRight className="size-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 5. MOTION PICTURE ───────────────────────────────────────────── */}
      <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center border-y border-border bg-[#0A0A0A]">
        <video autoPlay loop muted playsInline preload="none"
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105">
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/70" />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} viewport={{ once: true }}>
            <h2 className="text-[clamp(4rem,12vw,10rem)] leading-[0.8] font-display uppercase tracking-[-0.04em] text-white">
              MOTION<br />
              <span className="text-transparent" style={{ WebkitTextStroke: "2px rgba(255,255,255,0.65)" }}>PICTURE</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/80 text-mono tracking-[0.2em] max-w-2xl mx-auto leading-relaxed">
              CAPTURING THE ESSENCE OF THE STREETS. RAW, UNFILTERED, AND IN CONSTANT MOTION.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 6. INFLUENCER PICKS ─────────────────────────────────────────── */}
      {hs.influencerPicks.enabled && (() => {
        const PLACEHOLDER_INFLUENCERS = [
          { id: "p1", name: "RAHUL SHARMA", handle: "@rahulstyle", image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=800", productSlug: "", quote: "Studio Deny hits different. The heavyweight feel is unlike anything else." },
          { id: "p2", name: "ARYAN KAPOOR", handle: "@aryanwears", image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80&w=800", productSlug: "", quote: "Every piece I've copped from them gets more compliments than anything else in my rotation." },
          { id: "p3", name: "ZARA KHAN", handle: "@zarainkicks", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800", productSlug: "", quote: "The fit, the fabric, the drop energy — Studio Deny always delivers." },
        ];
        const items = hs.influencerPicks.items.length > 0 ? hs.influencerPicks.items : PLACEHOLDER_INFLUENCERS;
        return (
          <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10">
              <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{hs.influencerPicks.eyebrow}</span>
              <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">{hs.influencerPicks.title}</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}
                  className="border border-border bg-surface/30 overflow-hidden group">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <span className="text-muted-foreground text-mono text-xs">NO PHOTO</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-display text-lg uppercase">{item.name}</p>
                      <p className="text-white/60 text-mono text-xs">{item.handle}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    {item.quote && <p className="text-sm opacity-75 italic mb-4 leading-relaxed">"{item.quote}"</p>}
                    {item.productSlug && (
                      <Link to="/product/$slug" params={{ slug: item.productSlug }}
                        className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-mono hover:text-primary transition-colors">
                        SHOP THIS LOOK <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ── 7. LOOK BOOK ────────────────────────────────────────────────── */}
      {hs.lookBook.enabled && hs.lookBook.items.length > 0 && (
        <section className="py-14 sm:py-20 bg-surface/10 overflow-hidden border-t border-border">
          <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-8 sm:mb-10">
              <h2 className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.03em] uppercase text-display">LOOKBOOK</h2>
              <p className="text-base sm:text-lg mt-3 opacity-80 max-w-xl text-mono">Swipe through curated fits built for daily movement.</p>
            </motion.div>
          </div>
          <div className="flex overflow-hidden group py-4">
            <div className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused]" style={{ animationDuration: "40s" }}>
              {[...hs.lookBook.items, ...hs.lookBook.items].map((item, idx) => (
                <div key={idx} className="group/item relative shrink-0 w-[85vw] sm:w-[60vw] lg:w-[45vw] h-[60vh] sm:h-[75vh] mr-5 overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/item:scale-[1.03]"
                    style={{ backgroundImage: `url('${item.image}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-10 z-10">
                    <p className="text-[clamp(2.5rem,8vw,5.5rem)] leading-none tracking-[-0.04em] uppercase text-display whitespace-pre-line text-white">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. WORN BY OUR COMMUNITY ────────────────────────────────────── */}
      {hs.community.enabled && (
        <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 border-t border-border max-w-[1560px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10">
            <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">THE STREETS SPEAK</span>
            <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">{hs.community.title}</h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base text-mono">{hs.community.subtitle}</p>
          </motion.div>
          {hs.community.items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {hs.community.items.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: idx * 0.05 }} viewport={{ once: true }}
                  className="relative aspect-square overflow-hidden border border-border group">
                  <img src={item.image} alt={item.handle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-xs tracking-[0.15em] text-white text-mono">{item.handle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Placeholder grid until admin adds community photos
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1543322748-33df6d3db806?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=600",
              ].map((img, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: idx * 0.04 }} viewport={{ once: true }}
                  className="relative aspect-square overflow-hidden border border-border group">
                  <img src={img} alt="community" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 9. LOYALTY PROGRAM ──────────────────────────────────────────── */}
      {(() => {
        return (
          <section className="py-20 sm:py-28 px-4 sm:px-8 lg:px-16 border-y border-border bg-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
            <div className="max-w-[1280px] mx-auto relative z-10">

              {/* Logo stamp — full-width header */}
              <motion.div initial={{ opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }} className="flex justify-center pb-14 sm:pb-18 mb-14 sm:mb-18 border-b border-white/10">
                <img
                  src="https://res.cloudinary.com/dsqeawg67/image/upload/v1783356678/WhatsApp_Image_2026-07-03_at_15.50.55-removebg-preview_i8wcnb.png"
                  alt="Deny Space"
                  className="w-full max-w-[220px] sm:max-w-[320px] lg:max-w-[400px] h-auto invert"
                />
              </motion.div>

              {/* Content grid */}
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <h2 className="text-[clamp(3rem,7vw,6rem)] leading-[0.88] tracking-[-0.03em] uppercase text-display mb-8 text-white">
                    LOYALTY<br />HAS ITS<br />
                    <span className="text-transparent" style={{ WebkitTextStroke: "2px rgba(255,255,255,0.6)" }}>REWARDS.</span>
                  </h2>
                  <p className="text-white/60 text-sm sm:text-base text-mono leading-relaxed mb-10 max-w-md">
                    One qualifying drop unlocks you into our private pool. After that, every rupee you spend earns points — and every point is real money off your next order.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/rewards" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black text-xs tracking-[0.14em] uppercase text-mono font-bold hover:bg-white/90 transition-colors">
                      JOIN DENY SPACE <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white text-xs tracking-[0.14em] uppercase text-mono hover:border-white/60 transition-colors">
                      SHOP TO QUALIFY
                    </Link>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.15 }} viewport={{ once: true }} className="space-y-4 relative">
                  {[
                    { step: "01", label: "QUALIFY", desc: `Place a single order of ₹${ls.entryThreshold.toLocaleString()} or more. One order, one shot.` },
                    { step: "02", label: "EARN POINTS", desc: `After qualifying, earn 1 point for every ₹${ls.rupeesPerEarnedPoint} you spend.` },
                    { step: "03", label: "REDEEM", desc: `Each point = ₹${ls.rupeesPerPoint} off at checkout. No expiry. No minimum.` },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-5 border border-white/30 bg-white/[0.05] p-5 hover:border-white/50 transition-colors group">
                      <div className="text-display text-[2.5rem] leading-none text-white/50 group-hover:text-white/80 transition-colors shrink-0 w-12">{item.step}</div>
                      <div>
                        <div className="text-mono text-[10px] tracking-[0.2em] text-primary mb-1">{item.label}</div>
                        <p className="text-white/60 text-sm text-mono leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-1.5 pt-2">
                    {[
                      { name: "ROOKIE", pts: "0 pts", style: "border-white/30 bg-white/[0.07]" },
                      { name: "RUNNER", pts: "1,000 pts", style: "border-blue-400/70 bg-blue-500/15" },
                      { name: "RIOT", pts: "3,000 pts", style: "border-primary/70 bg-primary/15" },
                      { name: "LEGEND", pts: "8,000 pts", style: "border-primary/90 bg-primary/20" },
                    ].map((t) => (
                      <div key={t.name} className={`border ${t.style} p-3 text-center`}>
                        <div className="text-mono text-[9px] tracking-widest text-white/90 mb-1">{t.name}</div>
                        <div className="text-mono text-[8px] text-white/75">{t.pts}</div>
                      </div>
                    ))}
                  </div>
                  <StarDoodle className="hidden lg:block absolute -right-6 -top-2 w-16 text-white opacity-70 pointer-events-none" />
                  <FlameDoodle className="hidden lg:block absolute right-40 -bottom-8 w-12 text-white opacity-60 pointer-events-none" />
                  <DripDoodle className="hidden lg:block absolute right-2 -bottom-6 w-9 text-white opacity-50 pointer-events-none" />
                  <TagDoodle className="hidden lg:block absolute right-24 -bottom-8 w-14 text-white opacity-40 pointer-events-none" />
                </motion.div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── 10. TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 overflow-hidden">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10 sm:mb-14 text-center">
            <h2 className="text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display">WORN IN<br />EVERY CITY</h2>
          </motion.div>
        </div>
        <div className="flex overflow-hidden group py-4">
          <div className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused]" style={{ animationDuration: "60s" }}>
            {[
              { quote: "Fit is unreal. It feels premium without trying too hard.", name: "Arjun K.", city: "Mumbai" },
              { quote: "Finally a brand that understands cut, fabric, and movement.", name: "Priya S.", city: "Delhi" },
              { quote: "Every drop sells out for a reason. Quality is consistent.", name: "Rahul M.", city: "Bangalore" },
              { quote: "The heavyweight cotton is unmatched. Nothing else comes close.", name: "Sneha D.", city: "Pune" },
              { quote: "I get compliments every single time I wear Studio Deny.", name: "Vikram T.", city: "Hyderabad" },
              { quote: "Studio Deny is the only brand I trust for streetwear.", name: "Kiran R.", city: "Chennai" },
              { quote: "Fit is unreal. It feels premium without trying too hard.", name: "Arjun K.", city: "Mumbai" },
              { quote: "Finally a brand that understands cut, fabric, and movement.", name: "Priya S.", city: "Delhi" },
              { quote: "Every drop sells out for a reason. Quality is consistent.", name: "Rahul M.", city: "Bangalore" },
              { quote: "The heavyweight cotton is unmatched. Nothing else comes close.", name: "Sneha D.", city: "Pune" },
            ].map((t, idx) => (
              <div key={idx} className="shrink-0 w-[320px] sm:w-[380px] border border-border bg-surface/30 p-6 sm:p-8 flex flex-col justify-between mr-5">
                <div>
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((n) => <Star key={n} className="w-3.5 h-3.5 fill-foreground text-foreground opacity-80" />)}
                  </div>
                  <p className="text-base sm:text-lg leading-relaxed opacity-90 text-display">"{t.quote}"</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm tracking-[0.1em] uppercase text-mono opacity-80">{t.name}</p>
                  <p className="text-xs tracking-[0.15em] uppercase opacity-50 mt-1 text-mono">{t.city} · VERIFIED BUYER</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. CONTACT SUPPORT ─────────────────────────────────────────── */}
      {hs.contactSupport.enabled && (
        <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border bg-surface/20">
          <div className="max-w-[1280px] mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12 text-center">
              <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">WE'RE HERE</span>
              <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">CONTACT SUPPORT</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
              {[
                {
                  icon: Mail,
                  label: "EMAIL US",
                  value: hs.contactSupport.email,
                  href: `mailto:${hs.contactSupport.email}`,
                  desc: "For order issues, returns & general queries",
                },
                {
                  icon: MessageCircle,
                  label: "WHATSAPP",
                  value: hs.contactSupport.whatsapp,
                  href: `https://wa.me/${hs.contactSupport.whatsapp.replace(/\D/g, "")}`,
                  desc: "Quick help via WhatsApp chat",
                },
                {
                  icon: Clock,
                  label: "HOURS",
                  value: hs.contactSupport.hours,
                  href: null,
                  desc: "Response within 24 hours",
                },
              ].map((item, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}
                  className="border border-border bg-surface/30 p-6 sm:p-8 flex flex-col items-center text-center gap-4">
                  <div className="size-12 border border-border flex items-center justify-center">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">{item.label}</div>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer"
                        className="text-sm sm:text-base font-semibold hover:text-primary transition-colors block mb-1">{item.value}</a>
                    ) : (
                      <p className="text-sm sm:text-base font-semibold mb-1">{item.value}</p>
                    )}
                    <p className="text-muted-foreground text-xs text-mono">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <Link to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm tracking-[0.14em] uppercase text-mono hover:opacity-80 transition-opacity">
                VISIT SUPPORT PAGE <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
