import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";

type FabricTab = { id: string; name: string; title: string; desc: string; img: string; img_type?: "image" | "video"; href?: string };
type FabricTabsConfig = { tabs: FabricTab[] };

const DEFAULT_FABRIC_TABS: FabricTab[] = [
  {
    id: "tshirts",
    name: "T-SHIRTS",
    title: "300+ GSM HEAVYWEIGHT COTTON",
    desc: "Substantial, heavyweight fabric that drapes perfectly and doesn't cling. Pre-shrunk for a consistent fit. Engineered pattern making for the perfect relaxed silhouette with dropped shoulders.",
    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200",
    href: "/collections/tops",
  },
  {
    id: "shirts",
    name: "SHIRTS",
    title: "PREMIUM OXFORD & FLANNEL",
    desc: "Double-needle stitching on all stress points. High-density weaves for durability while maintaining breathability. Built to soften and get better with every wash.",
    img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1200",
    href: "/shop?q=shirts",
  },
  {
    id: "jeans",
    name: "JEANS",
    title: "14OZ JAPANESE SELVEDGE",
    desc: "Raw, unwashed denim that molds to your body over time. Custom branded hardware, reinforced belt loops, and hidden rivets. A modern straight-leg cut that stacks perfectly over sneakers.",
    img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1200",
    href: "/collections/bottoms",
  },
];

import { useWebsiteSectionConfig } from "@/lib/websiteSections";

export function FabricTabsSection() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<FabricTabsConfig>("fabric_tabs", { tabs: DEFAULT_FABRIC_TABS });
  const fabricTabs = cfg.tabs && cfg.tabs.length > 0 ? cfg.tabs : DEFAULT_FABRIC_TABS;
  const [activeFabricId, setActiveFabricId] = useState<string>(fabricTabs[0]?.id || DEFAULT_FABRIC_TABS[0].id);
  const activeFabric = fabricTabs.find((t) => t.id === activeFabricId) || fabricTabs[0] || DEFAULT_FABRIC_TABS[0];
  const productSpecsHeading = useSectionHeading("product_specifications", "PREMIUM FABRIC.", { eyebrow: "THE DETAILS", subtitle: "UNCOMPROMISED QUALITY." });

  if (!visible) return null;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-y border-border bg-[#E2E2E4]">
      <div className="max-w-[1560px] mx-auto">
        <div className="mb-12 sm:mb-16 flex flex-col">
          {productSpecsHeading.eyebrow && (
            <span className="inline-flex items-center px-3 py-1 border border-border text-[10px] sm:text-xs tracking-[0.22em] text-mono mb-4 w-fit">{productSpecsHeading.eyebrow}</span>
          )}
          <EditorialHeading
            className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display mb-2"
            style={productSpecsHeading.color ? { color: productSpecsHeading.color } : undefined}
          >
            {productSpecsHeading.text}
          </EditorialHeading>
          {productSpecsHeading.subtitle && (
            <EditorialSubheading className="text-xl sm:text-2xl font-mono text-foreground/70 uppercase tracking-wide" delay={0.2}>
              {productSpecsHeading.subtitle}
            </EditorialSubheading>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* ════════ SILKY LUXURY IMAGE CROSSFADE STAGE (NO BLANK FLASHING) ════════ */}
          <div className="order-1 lg:col-span-6 w-full relative h-[48vh] sm:h-[62vh] lg:h-[75vh] overflow-hidden border border-border bg-[#0D0D0D] shadow-2xl group">
            {fabricTabs.map((fabric, idx) => {
              const isActive = fabric.id === activeFabric.id;
              return (
                <motion.div
                  key={fabric.id}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 1.06,
                  }}
                  transition={{
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`absolute inset-0 w-full h-full ${
                    isActive ? "z-10 pointer-events-auto" : "z-0 pointer-events-none"
                  }`}
                >
                  {fabric.img_type === "video" ? (
                    <video
                      src={fabric.img}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={fabric.img}
                      alt={fabric.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  )}
                </motion.div>
              );
            })}

            {/* Subtle luxury gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none z-20" />

            {/* Top-left Index Badge */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-white/90 uppercase font-semibold">
                SPECS [ 0{fabricTabs.findIndex((t) => t.id === activeFabric.id) + 1} / 0{fabricTabs.length} ]
              </span>
            </div>

            {/* Bottom Floating Title Overlay */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30 pointer-events-none">
              <motion.div
                key={activeFabric.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-end justify-between gap-4"
              >
                <div>
                  <div className="text-mono text-[10px] sm:text-[11px] tracking-[0.3em] text-primary uppercase font-bold mb-1">
                    {activeFabric.name}
                  </div>
                  <div className="text-display text-xl sm:text-2xl text-white uppercase tracking-wider font-bold drop-shadow-md">
                    {activeFabric.title}
                  </div>
                </div>
                {activeFabric.href && (
                  <Link
                    to={activeFabric.href}
                    className="pointer-events-auto shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-primary hover:text-white transition-colors text-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-bold"
                  >
                    EXPLORE <ArrowRight className="size-3" />
                  </Link>
                )}
              </motion.div>
            </div>
          </div>

          {/* ════════ ACCORDION TABS CONTROLS ════════ */}
          <div className="order-2 lg:col-span-6 w-full flex flex-col justify-center space-y-4 sm:space-y-6">
            {fabricTabs.map((fabric, idx) => {
              const isSelected = activeFabric.id === fabric.id;
              return (
                <div
                  key={fabric.id}
                  onMouseEnter={() => setActiveFabricId(fabric.id)}
                  onClick={() => setActiveFabricId(fabric.id)}
                  className={`group cursor-pointer border-b border-border pb-5 sm:pb-7 transition-all duration-300 last:border-0 ${
                    isSelected ? "opacity-100" : "opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-baseline gap-4 sm:gap-6">
                      <span className="text-mono text-xs sm:text-sm tracking-widest text-muted-foreground font-semibold">
                        0{idx + 1}
                      </span>
                      <h3
                        className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-display uppercase tracking-wider transition-all duration-300 ${
                          isSelected
                            ? "text-foreground font-black translate-x-1"
                            : "text-foreground/50 group-hover:text-foreground/80"
                        }`}
                      >
                        {fabric.name}
                      </h3>
                    </div>

                    {fabric.href ? (
                      <Link
                        to={fabric.href}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Shop ${fabric.name}`}
                        className={`transition-all duration-300 p-2 text-foreground hover:text-primary ${
                          isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                        }`}
                      >
                        <ArrowRight className="size-6 sm:size-8" />
                      </Link>
                    ) : (
                      <ArrowRight
                        className={`size-6 sm:size-8 transition-all duration-300 ${
                          isSelected ? "opacity-100 translate-x-0 text-primary" : "opacity-0 -translate-x-3 text-muted-foreground"
                        }`}
                      />
                    )}
                  </div>

                  {/* Smooth Accordion Body */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isSelected ? "auto" : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pl-8 sm:pl-12">
                      <h4 className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-mono text-primary mb-2">
                        {fabric.title}
                      </h4>
                      <p className="text-sm sm:text-base text-muted-foreground font-mono leading-relaxed max-w-xl">
                        {fabric.desc}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
