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

export function FabricTabsSection() {
  const [fabricTabs, setFabricTabs] = useState<FabricTab[]>(DEFAULT_FABRIC_TABS);
  const [activeFabric, setActiveFabric] = useState(DEFAULT_FABRIC_TABS[0]);
  const [visible, setVisible] = useState(true);
  const productSpecsHeading = useSectionHeading("product_specifications", "PREMIUM FABRIC.", { eyebrow: "THE DETAILS", subtitle: "UNCOMPROMISED QUALITY." });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "fabric_tabs")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: Partial<FabricTabsConfig> };
        setVisible(row.is_visible);
        if (row.config?.tabs && row.config.tabs.length > 0) {
          setFabricTabs(row.config.tabs);
          setActiveFabric(row.config.tabs[0]);
        }
      });
  }, []);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className="order-1 w-full relative h-[45vh] sm:h-[60vh] lg:h-[80vh] overflow-hidden border border-border bg-surface">
            <AnimatePresence mode="wait">
              {activeFabric.img_type === "video" ? (
                <motion.video
                  key={activeFabric.id}
                  initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={activeFabric.img} autoPlay loop muted playsInline
                />
              ) : (
                <motion.div key={activeFabric.id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${activeFabric.img}')` }} />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60" />
          </div>
          <div className="order-2 w-full flex flex-col justify-center space-y-6 sm:space-y-8">
            {fabricTabs.map((fabric) => (
              <div key={fabric.id} onMouseEnter={() => setActiveFabric(fabric)} onClick={() => setActiveFabric(fabric)}
                className="group cursor-pointer border-b border-border pb-6 sm:pb-8 last:border-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-display uppercase tracking-wider transition-colors duration-300 ${activeFabric.id === fabric.id ? "text-foreground font-black" : "text-foreground/40 group-hover:text-foreground/75"}`}>
                    {fabric.name}
                  </h3>
                  {fabric.href ? (
                    <Link
                      to={fabric.href}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Shop ${fabric.name}`}
                      className={`transition-all duration-300 hover:text-primary ${activeFabric.id === fabric.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                    >
                      <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10" />
                    </Link>
                  ) : (
                    <ArrowRight className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${activeFabric.id === fabric.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} />
                  )}
                </div>
                <div className={`overflow-hidden transition-all duration-500 ${activeFabric.id === fabric.id ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="pt-2">
                    <h4 className="text-base sm:text-lg font-bold tracking-[0.18em] uppercase text-mono mb-3 opacity-95">{fabric.title}</h4>
                    <p className="text-base sm:text-lg opacity-75 text-mono leading-relaxed max-w-xl">{fabric.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
