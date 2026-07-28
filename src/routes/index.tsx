import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { buildMeta, buildLinks, SITE_URL, orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, Mail, MessageCircle, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { LoyaltyModal } from "@/components/home/LoyaltyModal";
import { getHomeSections, type HomeSections } from "@/lib/homeSections";
import { HeroSlider, type HeroSlide } from "@/components/home/HeroSlider";
import { GenderSplit } from "@/components/home/GenderSplit";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { DenySpace } from "@/components/home/DenySpace";
import { LookbookCarousel } from "@/components/home/LookbookCarousel";
import { CommunityBento } from "@/components/home/CommunityBento";
import { InfluencerPicksGrid } from "@/components/home/InfluencerPicksGrid";
import { PopularNowGrid } from "@/components/home/PopularNowGrid";
import { InstagramIconLink } from "@/components/home/InstagramIconLink";
import { useSectionHeading } from "@/lib/sectionHeadings";

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
  const [hs, setHs] = useState<HomeSections | null>(null);
  const [activeFabric, setActiveFabric] = useState(FABRIC_TABS[0]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[] | undefined>(undefined);
  const productSpecsHeading = useSectionHeading("product_specifications", "PREMIUM FABRIC.");
  const motionPictureHeading = useSectionHeading("motion_picture", "MOTION\nPICTURE");
  const testimonialsHeading = useSectionHeading("testimonials", "WORN IN\nEVERY CITY");

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config")
      .eq("page_slug", "home")
      .eq("section_type", "hero")
      .single()
      .then(({ data }) => {
        const cfg = data?.config as { slides?: HeroSlide[] } | undefined;
        if (cfg?.slides && cfg.slides.length > 0) setHeroSlides(cfg.slides);
      });
  }, []);

  useEffect(() => {
    setHs(getHomeSections());
  }, []);

  if (!hs) return null;

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen font-body">
      <LoyaltyModal />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <HeroSlider slides={heroSlides} />

      {/* ── 2. MEN / WOMEN SPLIT ────────────────────────────────────────── */}
      <GenderSplit />

      {/* ── 3. FULL-SCREEN CATEGORY CAROUSEL ───────────────────────────── */}
      <CategoryCarousel />

      {/* ── 4. POPULAR NOW — uneven/mixed-size product grid ─────────────── */}
      <PopularNowGrid />

      {/* ── 5. INSTAGRAM ICON ───────────────────────────────────────────── */}
      <InstagramIconLink />

      {/* ── PRODUCT SPECIFICATIONS ──────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-y border-border bg-surface/30">
        <div className="max-w-[1560px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12 sm:mb-16">
            <span className="inline-flex items-center px-3 py-1 border border-border text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-4">THE DETAILS</span>
            <h2
              className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-4"
              style={productSpecsHeading.color ? { color: productSpecsHeading.color } : undefined}
            >
              {productSpecsHeading.text}
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

      {/* ── 5. MOTION PICTURE ───────────────────────────────────────────── */}
      <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center border-y border-border bg-[#0A0A0A]">
        <video autoPlay loop muted playsInline preload="none"
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105">
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/70" />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} viewport={{ once: true }}>
            <h2
              className="text-[clamp(4rem,12vw,10rem)] leading-[0.8] font-display uppercase tracking-[-0.04em] text-white whitespace-pre-line"
              style={motionPictureHeading.color ? { color: motionPictureHeading.color } : undefined}
            >
              {motionPictureHeading.text}
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/80 text-mono tracking-[0.2em] max-w-2xl mx-auto leading-relaxed">
              CAPTURING THE ESSENCE OF THE STREETS. RAW, UNFILTERED, AND IN CONSTANT MOTION.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 6. INFLUENCER PICKS ─────────────────────────────────────────── */}
      <InfluencerPicksGrid />

      {/* ── 7. LOOK BOOK ────────────────────────────────────────────────── */}
      <LookbookCarousel />

      {/* ── 8. WORN BY OUR COMMUNITY ────────────────────────────────────── */}
      <CommunityBento />

      {/* ── 9. DENYSPACE ─────────────────────────────────────────────────── */}
      <DenySpace />

      {/* ── 10. TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 overflow-hidden">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10 sm:mb-14 text-center">
            <h2
              className="text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display whitespace-pre-line"
              style={testimonialsHeading.color ? { color: testimonialsHeading.color } : undefined}
            >
              {testimonialsHeading.text}
            </h2>
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
