import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/products";
import { productsInCategory } from "@/lib/catalog";
import { listProducts } from "@/lib/productsStore";
import { buildMeta, buildLinks, SITE_URL, orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Star, Layers, Scissors, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: buildMeta({
      title: "STUDIO/DENY — Streetwear For The Restless",
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

function Index() {
  const [scrollY, setScrollY] = useState(0);
  const heroParallax = Math.min(scrollY * 0.4, 120);



  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [activeShowcase, setActiveShowcase] = useState("NEW DROP");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('ALL');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  useEffect(() => {
    listProducts().then((all) => {
      setBestSellers(all.filter((p: any) => p.badge === 'SALE' || p.compare_at));
    });
  }, []);

  useEffect(() => {
    setShowAllProducts(false);
    if (selectedCategory === 'ALL') {
      listProducts().then(setCategoryProducts);
    } else if (selectedCategory === 'NEW COLLECTION') {
      listProducts().then((all) => setCategoryProducts(all.filter((p) => p.badge === 'NEW DROP')));
    } else if (selectedCategory) {
      productsInCategory(selectedCategory).then(setCategoryProducts);
    } else {
      setCategoryProducts([]);
    }
  }, [selectedCategory]);

  const showcaseContent: Record<string, { image: string; eyebrow: string; caption: string }> = {
    "NEW DROP": {
      image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1400&q=80",
      eyebrow: "Latest Arrival",
      caption: "Fresh silhouettes, clean tailoring, and statement layers for this season.",
    },
    "BEST SELLING": {
      image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1400&q=80",
      eyebrow: "Most Wanted",
      caption: "The pieces our community wears on repeat across every city.",
    },
    CATEGORIES: {
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1400&q=80",
      eyebrow: "Browse By Mood",
      caption: "Explore by fit and identity with a minimalist, editorial navigation flow.",
    },
  };

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen font-body">
      {/* Hero Section */}
      <section className="relative min-h-[82vh] sm:min-h-[86vh] w-full flex items-center justify-center overflow-hidden px-4 sm:px-8 lg:px-16 pt-28 sm:pt-32 pb-16">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "brightness(0.35)",
            transform: `translateY(${heroParallax}px)`,
          }}
        >
          <source src="https://studio-deny-demo.vercel.app/assets/hero-video.mp4" type="video/mp4" />
        </video>

        <div
          className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 max-w-[1320px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="space-y-6 sm:space-y-8"
          >
            <h1 className="text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display">
              IN THE CUT
              <br />
              NOT IN THE CROWD
            </h1>
            <p className="text-base sm:text-lg leading-relaxed max-w-xl opacity-90 text-mono">
              Elevated streetwear engineered for creators. Limited drops, premium cuts, and a fit made to stand apart.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                to="/shop"
                className="group relative overflow-hidden px-8 py-3 min-h-11 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors duration-300 inline-flex items-center justify-center gap-2 text-mono text-sm tracking-[0.14em]"
              >
                SHOP THE DROP
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop"
                className="px-8 py-3 min-h-11 border border-gray-700 text-sm tracking-[0.14em] hover:border-white transition-colors duration-300 inline-flex items-center justify-center text-mono"
              >
                VIEW LOOKBOOK
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-center"
        >
          <div className="flex flex-col items-center gap-2 opacity-70">
            <span className="text-[11px] tracking-[0.2em] text-mono">SCROLL</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* Marquee */}
      <section className="relative border-y border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
        <div className="flex">
          {[0, 1].map((dup) => (
            <div
              key={dup}
              aria-hidden={dup === 1}
              className="flex shrink-0 items-center ticker-scroll"
            >
              {[
                { dot: "#ffffff", label: "NEW DROP", text: "SS26 Studio Bomber & Cargo Set — Available Now" },
                { dot: "#888888", label: "RESTOCK", text: "Essential Hoodie in Black & Slate — Limited Units" },
                { dot: "#ffffff", label: "ALERT", text: "Members get 48-hr early access to next drop" },
              ].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-3 px-8 py-3 whitespace-nowrap text-[11px] sm:text-xs tracking-[0.18em] uppercase text-mono">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.dot, boxShadow: `0 0 6px ${item.dot}` }}
                  />
                  <span className="opacity-40">{item.label}</span>
                  <span className="opacity-80">{item.text}</span>
                  <span className="opacity-20 mx-2">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>


      {/* Shop by Category */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 text-center max-w-[1560px] mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-[3.5rem] leading-none font-display uppercase mb-6 md:mb-10">
          Shop by Category
        </h2>
        
        {/* Custom Mobile Dropdown */}
        <div className="relative sm:hidden w-full max-w-xs mx-auto z-20">
          <button
            type="button"
            onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
            className="w-full flex items-center justify-between bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] text-white py-3 px-5 text-sm uppercase tracking-wider outline-none transition-colors"
          >
            <span>{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {mobileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] shadow-2xl flex flex-col text-left overflow-hidden"
              >
                {['ALL','NEW COLLECTION','TOPS','BOTTOMS','OUTERWEAR','ACCESSORIES'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setMobileDropdownOpen(false);
                    }}
                    className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors hover:bg-white/5 ${
                      selectedCategory === cat ? "text-primary bg-primary/5" : "text-white/70"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden sm:flex flex-wrap justify-center gap-4">
          {['ALL','NEW COLLECTION','TOPS','BOTTOMS','OUTERWEAR','ACCESSORIES'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 border text-sm uppercase transition-colors ${
                selectedCategory === cat
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-gray-700 hover:border-primary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Category Products Grid */}
      {categoryProducts.length > 0 && (
        <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-display uppercase mb-8 md:mb-12 text-center">
            {selectedCategory === 'ALL' ? 'All Products' : selectedCategory}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {(showAllProducts ? categoryProducts : categoryProducts.slice(0, 4)).map((product, idx) => (
              <ProductCard key={product.slug} product={product} index={idx} />
            ))}
          </div>
          {categoryProducts.length > 4 && !showAllProducts && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setShowAllProducts(true)}
                className="inline-flex items-center gap-2 px-8 py-3 border border-gray-700 text-sm tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors text-mono"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}

      <div className="w-full h-px bg-[rgba(255,255,255,0.1)]" />
      {/* Best Sellers */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-[3.5rem] leading-none font-display uppercase">
            Best Sellers
          </h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {bestSellers.slice(0, 4).map((product, idx) => (
            <ProductCard key={product.slug} product={product} index={idx} />
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3 border border-gray-700 text-sm tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors text-mono"
          >
            Shop All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Cinematic Video Section 1 */}
      <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center my-16 border-y border-[rgba(255,255,255,0.1)]">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105"
        >
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/80" />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[clamp(4rem,12vw,10rem)] leading-[0.8] font-display uppercase tracking-[-0.04em] text-white">
              MOTION
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.5)" }}>
                PICTURE
              </span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/80 text-mono tracking-[0.2em] max-w-2xl mx-auto leading-relaxed">
              CAPTURING THE ESSENCE OF THE STREETS. RAW, UNFILTERED, AND IN CONSTANT MOTION.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="w-full h-px bg-[rgba(255,255,255,0.1)]" />
      {/* Visual Collections Grid */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 max-w-[1560px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-[3.5rem] leading-none font-display uppercase">
            EXPLORE COLLECTIONS
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { title: "MEN", link: "/collections/men", img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG" },
            { title: "WOMEN", link: "/collections/women", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200" },
            { title: "ACCESSORIES", link: "/collections/accessories", img: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=1200" },
          ].map((col) => (
            <Link
              key={col.title}
              to={col.link}
              className="group relative h-[50vh] sm:h-[60vh] overflow-hidden border border-[rgba(255,255,255,0.1)] block"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${col.img}')` }}
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-500 group-hover:-translate-y-2">
                <h2 className="text-5xl sm:text-6xl lg:text-7xl text-display uppercase tracking-wider text-white mb-4">
                  {col.title}
                </h2>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-sm tracking-[0.2em] text-mono uppercase text-white border-b border-white pb-1">
                  Shop Collection <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>









      <div className="w-full h-px bg-[rgba(255,255,255,0.1)]" />
      {/* Lookbook Section */}
      <section className="py-14 sm:py-20 bg-[rgba(255,255,255,0.01)] overflow-hidden">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.03em] uppercase text-display">
              LOOKBOOK
            </h2>
            <p className="text-base sm:text-lg mt-3 opacity-80 max-w-xl text-mono">
              Swipe through curated fits built for daily movement.
            </p>
          </motion.div>
        </div>

        <div className="flex overflow-hidden group py-4">
          <div
            className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused]"
            style={{ animationDuration: '40s' }}
          >
            {[
              { img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG", title: "SS26\nCOLLECTION" },
              { img: "https://studio-deny-demo.vercel.app/assets/001_13.JPG", title: "URBAN\nESSENTIALS" },
              { img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG", title: "SS26\nCOLLECTION" },
              { img: "https://studio-deny-demo.vercel.app/assets/001_13.JPG", title: "URBAN\nESSENTIALS" },
              { img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG", title: "SS26\nCOLLECTION" },
              { img: "https://studio-deny-demo.vercel.app/assets/001_13.JPG", title: "URBAN\nESSENTIALS" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group/item relative shrink-0 w-[85vw] sm:w-[60vw] lg:w-[45vw] h-[60vh] sm:h-[75vh] mr-5 overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/item:scale-105"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-10 z-10">
                  <p className="text-[clamp(2.5rem,8vw,5.5rem)] leading-none tracking-[-0.04em] uppercase text-display whitespace-pre-line">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fabric Section */}
      {(() => {
        const fabricCategories = [
          {
            id: "tshirts",
            name: "T-SHIRTS",
            title: "300+ GSM HEAVYWEIGHT COTTON",
            desc: "Substantial, heavyweight fabric that drapes perfectly and doesn't cling. Pre-shrunk for a consistent fit from day one. Engineered pattern making for the perfect relaxed silhouette with dropped shoulders.",
            img: "https://studio-deny-demo.vercel.app/assets/001_18.JPG",
          },
          {
            id: "shirts",
            name: "SHIRTS",
            title: "PREMIUM OXFORD & FLANNEL",
            desc: "Double-needle stitching on all stress points. Our shirts are constructed with high-density weaves for durability while maintaining breathability. Built to soften and get better with every wash.",
            img: "https://studio-deny-demo.vercel.app/assets/001_13.JPG",
          },
          {
            id: "jeans",
            name: "JEANS",
            title: "14OZ JAPANESE SELVEDGE",
            desc: "Raw, unwashed denim that molds to your body over time. Custom branded hardware, reinforced belt loops, and hidden rivets. A modern straight-leg cut that stacks perfectly over sneakers.",
            img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1200",
          }
        ];
        const [activeFabric, setActiveFabric] = useState(fabricCategories[0]);

        return (
          <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-y border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
            <div className="max-w-[1560px] mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="mb-12 sm:mb-16"
              >
                <span className="inline-flex items-center px-3 py-1 border border-[rgba(255,255,255,0.2)] text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-4">
                  THE DETAILS
                </span>
                <h2 className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-4">
                  PREMIUM FABRIC.
                  <br />
                  <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.35)" }}>
                    UNCOMPROMISED QUALITY.
                  </span>
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
                {/* Image Side */}
                <div className="order-1 relative h-[45vh] sm:h-[60vh] lg:h-[80vh] overflow-hidden border border-[rgba(255,255,255,0.1)]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFabric.id}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${activeFabric.img}')` }}
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60" />
                </div>

                {/* List Side */}
                <div className="order-2 flex flex-col justify-center space-y-6 sm:space-y-8">
                  {fabricCategories.map((fabric) => (
                    <div
                      key={fabric.id}
                      onMouseEnter={() => setActiveFabric(fabric)}
                      onClick={() => setActiveFabric(fabric)}
                      className="group cursor-pointer border-b border-[rgba(255,255,255,0.1)] pb-6 sm:pb-8 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-4 transition-colors duration-300">
                        <h3 className={`text-4xl sm:text-5xl lg:text-6xl text-display uppercase tracking-wider transition-colors duration-300 ${activeFabric.id === fabric.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                          {fabric.name}
                        </h3>
                        <ArrowRight className={`w-6 h-6 transition-all duration-300 ${activeFabric.id === fabric.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} />
                      </div>
                      
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeFabric.id === fabric.id ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pt-2">
                          <h4 className="text-sm tracking-[0.15em] uppercase text-mono mb-3 opacity-90 text-white">
                            {fabric.title}
                          </h4>
                          <p className="text-base opacity-70 text-mono leading-relaxed max-w-lg">
                            {fabric.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Testimonials */}
      <section className="py-16 sm:py-24 overflow-hidden">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-10 sm:mb-14 text-center"
          >
            <h2 className="text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display">
              WORN IN
              <br />
              EVERY CITY
            </h2>
          </motion.div>
        </div>
        <div className="flex overflow-hidden group py-4">
          <div
            className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused]"
            style={{ animationDuration: '60s' }}
          >
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
              { quote: "I get compliments every single time I wear Studio Deny.", name: "Vikram T.", city: "Hyderabad" },
              { quote: "Studio Deny is the only brand I trust for streetwear.", name: "Kiran R.", city: "Chennai" },
            ].map((t, idx) => (
              <div
                key={idx}
                className="shrink-0 w-[320px] sm:w-[380px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-6 sm:p-8 flex flex-col justify-between mr-5"
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <Star key={n} className="w-3.5 h-3.5 fill-white text-white opacity-80" />
                    ))}
                  </div>
                  <p className="text-base sm:text-lg leading-relaxed opacity-90 text-display">
                    "{t.quote}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                  <p className="text-sm tracking-[0.1em] uppercase text-mono opacity-80">
                    {t.name}
                  </p>
                  <p className="text-xs tracking-[0.15em] uppercase opacity-50 mt-1 text-mono">
                    {t.city} · VERIFIED BUYER
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic Video Section 2: Split Screen */}
      <section className="grid grid-cols-1 lg:grid-cols-2 border-y border-[rgba(255,255,255,0.1)]">
        <div className="order-2 lg:order-1 flex flex-col justify-center p-12 md:p-24 bg-[rgba(255,255,255,0.02)] border-r border-[rgba(255,255,255,0.1)]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center px-4 py-1.5 border border-white/20 text-white text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-8 bg-white/5">
              BEHIND THE SEAMS
            </span>
            <h2 className="text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-8">
              CRAFTED FOR
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>
                THE STREETS
              </span>
            </h2>
            <p className="text-base sm:text-lg opacity-80 text-mono max-w-lg leading-relaxed">
              Every stitch, every cut, every fabric choice is deliberate. We design for movement, durability, and a silhouette that refuses to be ignored.
            </p>
          </motion.div>
        </div>
        <div className="order-1 lg:order-2 relative h-[50vh] lg:h-auto min-h-[500px] overflow-hidden">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 scale-105"
          >
            <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
          </video>
        </div>
      </section>


      {/* Community Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.04),transparent_60%)]" />
        <div className="max-w-[1560px] mx-auto relative z-10">
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-row-dense auto-rows-[minmax(140px,auto)] md:auto-rows-[240px] gap-3 sm:gap-6">
            
            {/* Block 1: Intro & CTA (Spans 2 cols, 2 rows) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="col-span-2 md:col-span-2 md:row-span-2 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-6 sm:p-12 flex flex-col justify-center"
            >
              <span className="inline-flex self-start items-center px-3 py-1 border border-[rgba(255,255,255,0.2)] text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-6">
                JOIN THE MOVEMENT
              </span>
              <h2 className="text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-6">
                OUR COMMUNITY
              </h2>
              <p className="text-base sm:text-lg opacity-75 max-w-xl text-mono mb-10">
                A global tribe of creators, artists, and streetwear obsessives who wear Studio Deny daily. Build with us.
              </p>
              <Link
                to="/signup"
                className="inline-flex self-start items-center gap-2 px-8 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors duration-300 text-sm tracking-[0.14em] uppercase text-mono"
              >
                Join the Community
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Block 2: Tall Image (Spans 1 col, 2 rows) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="col-span-1 row-span-2 md:col-span-1 md:row-span-2 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=800"
                alt="Community member"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@streetking</p>
              </div>
            </motion.div>

            {/* Block 3: Stat 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6 flex flex-col justify-center items-center text-center"
            >
              <p className="text-5xl sm:text-6xl lg:text-7xl font-display tracking-[-0.02em] mb-2 text-primary">50K+</p>
              <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase opacity-60 text-mono">Members</p>
            </motion.div>

            {/* Block 4: Stat 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6 flex flex-col justify-center items-center text-center"
            >
              <p className="text-5xl sm:text-6xl lg:text-7xl font-display tracking-[-0.02em] mb-2 text-primary">120+</p>
              <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase opacity-60 text-mono">Cities</p>
            </motion.div>

            {/* Block 5: Wide Image (Spans 2 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="col-span-2 md:col-span-2 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200"
                alt="Community vibe"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@urbandrift</p>
              </div>
            </motion.div>

            {/* Block 6: Square Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600"
                alt="Community member"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@fitcheck.daily</p>
              </div>
            </motion.div>

            {/* Block 7: Stat 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6 flex flex-col justify-center items-center text-center"
            >
              <p className="text-5xl sm:text-6xl lg:text-7xl font-display tracking-[-0.02em] mb-2 text-primary">25K+</p>
              <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase opacity-60 text-mono">Pieces Sold</p>
            </motion.div>

            {/* Additional Images Added */}
            {/* Block 8: Square Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=600"
                alt="Community member"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@denyculture</p>
              </div>
            </motion.div>

            {/* Block 9: Tall Image (Spans 1 col, 2 rows) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
              className="col-span-1 row-span-2 md:col-span-1 md:row-span-2 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=800"
                alt="Community member"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@hypebeast.x</p>
              </div>
            </motion.div>

            {/* Block 10: Wide Image (Spans 2 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              viewport={{ once: true }}
              className="col-span-2 md:col-span-2 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1543322748-33df6d3db806?auto=format&fit=crop&q=80&w=1200"
                alt="Community vibe"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@street.archive</p>
              </div>
            </motion.div>

            {/* Block 11: Square Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              viewport={{ once: true }}
              className="col-span-1 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&q=80&w=600"
                alt="Community member"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@neo.tokyo</p>
              </div>
            </motion.div>

            {/* Block 12: Wide Image (Spans 2 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              viewport={{ once: true }}
              className="col-span-2 md:col-span-2 min-h-[140px] md:min-h-0 relative group overflow-hidden border border-[rgba(255,255,255,0.1)]"
            >
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200"
                alt="Community vibe"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs tracking-[0.15em] text-mono">@runway.street</p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>


      {/* Loyalty Program Section */}
      <section className="py-32 sm:py-48 px-4 sm:px-8 lg:px-16 border-y border-[rgba(255,255,255,0.1)] bg-[#050505] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        
        <div className="max-w-[1200px] mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center px-4 py-1.5 border border-white/20 text-white text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-10 bg-white/5">
              THE DENY SYNDICATE
            </span>
            <h2 className="text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-10">
              LOYALTY HAS ITS
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>
                REWARDS
              </span>
            </h2>
            <p className="text-base sm:text-lg opacity-75 max-w-2xl mx-auto text-mono mb-16 leading-relaxed">
              Join our exclusive loyalty program. Earn points on every purchase, unlock early access to drops, and get access to members-only products.
            </p>
            
            <Link
              to="/rewards"
              className="inline-flex items-center gap-2 px-10 py-4 border border-white text-white hover:bg-white hover:text-black transition-colors duration-300 text-sm sm:text-base tracking-[0.14em] uppercase text-mono"
            >
              Read More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <NewsletterSection />
    </div>
  );
}
