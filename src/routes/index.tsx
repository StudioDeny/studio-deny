import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ChevronDown, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { InstagramFeedSection } from "@/components/home/InstagramFeedSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [scrollY, setScrollY] = useState(0);
  const heroParallax = Math.min(scrollY * 0.4, 120);

  const lookbookRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: lookbookProgress } = useScroll({
    target: lookbookRef,
    offset: ["start end", "end start"],
  });
  const lookbookParallaxA = useSpring(useTransform(lookbookProgress, [0, 1], [-30, 90]), {
    stiffness: 100, damping: 26,
  });
  const lookbookParallaxB = useSpring(useTransform(lookbookProgress, [0, 1], [-20, 72]), {
    stiffness: 100, damping: 26,
  });
  const lookbookTextA = useSpring(useTransform(lookbookProgress, [0, 1], [-40, 28]), {
    stiffness: 120, damping: 30,
  });
  const lookbookTextB = useSpring(useTransform(lookbookProgress, [0, 1], [40, -24]), {
    stiffness: 120, damping: 30,
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [activeShowcase, setActiveShowcase] = useState("NEW DROP");
  const [categoriesOpen, setCategoriesOpen] = useState(false);

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
            <h1 className="text-[clamp(2.4rem,13vw,8.5rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-4xl text-display">
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

      {/* New Arrivals (admin-editable) */}
      <NewArrivalsSection />

      {/* Showcase / Collection Sections */}
      <section className="relative py-16 sm:py-24 max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 lg:gap-14 items-end">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative min-h-[62vh] sm:min-h-[78vh] overflow-hidden"
          >
            {Object.entries(showcaseContent).map(([key, content]) => (
              <motion.img
                key={key}
                src={content.image}
                alt={`${key} preview`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={false}
                animate={{
                  opacity: activeShowcase === key ? 1 : 0,
                  scale: activeShowcase === key ? 1 : 1.04,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] via-transparent to-[rgba(0,0,0,0.2)]" />
            <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-8">
              <p className="text-xs sm:text-sm tracking-[0.22em] uppercase opacity-85 mb-3 text-mono">
                {showcaseContent[activeShowcase].eyebrow}
              </p>
              <h2 className="text-[clamp(2.5rem,10vw,7.6rem)] leading-[0.86] tracking-[-0.045em] uppercase drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-display">
                {activeShowcase}
              </h2>
            </div>
          </motion.div>

          <div className="space-y-8 sm:space-y-10">
            <p className="text-xs tracking-[0.2em] uppercase opacity-70 text-mono">
              Discover the collection through curated pathways.
            </p>
            {["NEW DROP", "BEST SELLING", "CATEGORIES"].map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                viewport={{ once: true }}
                className="border-b border-[rgba(255,255,255,0.22)] pb-3"
              >
                {item === "CATEGORIES" ? (
                  <button
                    type="button"
                    onMouseEnter={() => setActiveShowcase(item)}
                    onClick={() => {
                      setActiveShowcase(item);
                      setCategoriesOpen(!categoriesOpen);
                    }}
                    className="w-full text-left flex items-end justify-between group min-h-11"
                  >
                    <h3 className={`text-[clamp(1.7rem,5.5vw,3.6rem)] leading-[0.95] tracking-[-0.02em] uppercase transition-opacity duration-300 text-display ${activeShowcase === item ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                      {item}
                    </h3>
                    <span className={`text-xs tracking-[0.2em] uppercase transition-opacity duration-300 text-mono ${activeShowcase === item ? "opacity-80" : "opacity-40"}`}>
                      {categoriesOpen ? "CLOSE" : "EXPLORE"}
                    </span>
                  </button>
                ) : (
                  <Link
                    to="/shop"
                    onMouseEnter={() => setActiveShowcase(item)}
                    className="w-full text-left flex items-end justify-between group min-h-11 cursor-pointer"
                  >
                    <h3 className={`text-[clamp(1.7rem,5.5vw,3.6rem)] leading-[0.95] tracking-[-0.02em] uppercase transition-opacity duration-300 text-display ${activeShowcase === item ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                      {item}
                    </h3>
                    <span className="text-xs tracking-[0.2em] uppercase opacity-40 group-hover:opacity-70 text-mono transition-opacity">
                      VIEW
                    </span>
                  </Link>
                )}
                {item === "CATEGORIES" && (
                  <motion.div
                    initial={false}
                    animate={{
                      height: categoriesOpen ? "auto" : 0,
                      opacity: categoriesOpen ? 1 : 0,
                      marginTop: categoriesOpen ? 16 : 0,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-x-5 gap-y-3 pb-1">
                      {["MEN", "WOMEN", "KIDS", "STREET", "JEANS", "SHIRTS"].map((cat) => (
                        <Link
                          key={cat}
                          to="/shop"
                          search={{ cat }}
                          onMouseEnter={() => setActiveShowcase("CATEGORIES")}
                          className="text-xs sm:text-sm tracking-[0.18em] uppercase opacity-70 hover:opacity-100 transition-opacity text-mono"
                        >
                          {cat}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
            <p className="text-sm opacity-75 max-w-md leading-relaxed text-mono">
              {showcaseContent[activeShowcase].caption}
            </p>
          </div>
        </div>
      </section>

      {/* Typography Statement Section */}
      <section className="relative py-24 sm:py-36 px-4 sm:px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at center, black 40%, transparent 85%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 0.32, scale: 1 }}
          transition={{ duration: 1.1 }}
          viewport={{ once: true }}
          className="absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl bg-[rgba(255,255,255,0.08)]"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 0.24, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.15 }}
          viewport={{ once: true }}
          className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full blur-3xl bg-[rgba(255,255,255,0.06)]"
        />
        <div className="absolute inset-0 pointer-events-none">
          {[
            { text: "UTILITY FIT", pos: "top-[20%] left-[8%]" },
            { text: "HEAVY GSM", pos: "top-[32%] right-[10%]" },
            { text: "LIMITED DROP", pos: "bottom-[28%] left-[12%]" },
            { text: "CITY UNIFORM", pos: "bottom-[20%] right-[12%]" },
          ].map((tag, idx) => (
            <motion.span
              key={tag.text}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 0.34, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 * idx }}
              viewport={{ once: true }}
              className={`absolute ${tag.pos} hidden md:block text-xs tracking-[0.24em] text-mono`}
            >
              {tag.text}
            </motion.span>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
          className="max-w-[1320px] mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-4 sm:mb-6"
          >
            <span
              className="inline-flex items-center px-3 py-1 border border-[rgba(255,255,255,0.28)] text-[10px] sm:text-xs tracking-[0.22em] text-mono"
            >
              STUDIO DENY DNA
            </span>
          </motion.div>
          <h2
            className="text-[clamp(2.8rem,16vw,11rem)] leading-[0.82] tracking-[-0.05em] uppercase text-display"
          >
            STREET
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: "2px #FFFFFF" }}>
              IS
            </span>
            <br />
            IDENTITY
          </h2>
        </motion.div>
      </section>

      {/* Mid Page CTA */}
      <section className="py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <p className="text-xs tracking-[0.18em] uppercase opacity-65 mb-2 text-mono">
              Private Access
            </p>
            <h3 className="text-[clamp(2rem,7vw,5rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display">
              MEMBERS
              <br />
              GET FIRST LOOK
            </h3>
            <p className="text-base mt-3 opacity-80 max-w-md text-mono">
              Drop alerts and early windows for limited releases.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-sm tracking-[0.18em] uppercase opacity-85 hover:opacity-100 transition-opacity min-h-11 text-mono"
          >
            Join Waitlist <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Lookbook Section */}
      <section id="lookbook" ref={lookbookRef} className="py-14 sm:py-20 bg-[rgba(255,255,255,0.01)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-[clamp(2rem,8vw,4.5rem)] leading-none tracking-[-0.03em] uppercase text-display">
              LOOKBOOK
            </h2>
            <p className="text-base sm:text-lg mt-3 opacity-80 max-w-xl text-mono">
              Swipe through curated fits built for daily movement.
            </p>
          </motion.div>
        </div>

        <div className="space-y-10 sm:space-y-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative h-[72vh] sm:h-[86vh] overflow-hidden"
          >
            <motion.div
              className="absolute inset-x-0 -inset-y-14 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://studio-deny-demo.vercel.app/assets/001_18.JPG')`,
                y: lookbookParallaxA,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
            <motion.div className="absolute bottom-8 left-4 sm:bottom-14 sm:left-8 lg:left-16 z-10" style={{ x: lookbookTextA }}>
              <motion.p
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-[clamp(2.2rem,9vw,8rem)] leading-none tracking-[-0.04em] uppercase text-display"
              >
                SS26
                <br />
                COLLECTION
              </motion.p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative h-[72vh] sm:h-[86vh] overflow-hidden"
          >
            <motion.div
              className="absolute inset-x-0 -inset-y-14 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://studio-deny-demo.vercel.app/assets/001_13.JPG')`,
                y: lookbookParallaxB,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-transparent" />
            <motion.div className="absolute top-8 right-4 sm:top-14 sm:right-8 lg:right-16 z-10 text-right" style={{ x: lookbookTextB }}>
              <motion.p
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-[clamp(2.2rem,9vw,8rem)] leading-none tracking-[-0.04em] uppercase text-display"
              >
                URBAN
                <br />
                ESSENTIALS
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-[clamp(2.1rem,8vw,5.2rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display">
              WORN IN
              <br />
              EVERY CITY
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
            {[
              "“Fit is unreal. It feels premium without trying too hard.”",
              "“Finally a brand that understands cut, fabric, and movement.”",
              "“Every drop sells out for a reason. Quality is consistent.”",
            ].map((quote, idx) => (
              <motion.div
                key={quote}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <Star key={n} className="w-3.5 h-3.5 fill-white text-white opacity-90" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl leading-relaxed opacity-90 text-display">
                  {quote}
                </p>
                <p className="text-xs tracking-[0.15em] opacity-60 mt-4 text-mono">
                  VERIFIED BUYER
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WhyUsSection />

      {/* Brand Story Section */}
      <section id="about" className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 border-y border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.01)]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-[1320px] mx-auto"
        >
          <h2
            className="text-[clamp(2rem,8vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-6 uppercase text-display"
          >
            WE DON'T FOLLOW TRENDS.
          </h2>
          <p
            className="text-base sm:text-lg leading-relaxed tracking-wide max-w-2xl font-light opacity-85 text-mono"
          >
            Studio Deny represents creators and rule-breakers. We build pieces that fit real movement, hold up daily,
            and speak before you do.
          </p>
        </motion.div>
      </section>

      <InstagramFeedSection />

      <NewsletterSection />
    </div>
  );
}
