import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";

type MiniProduct = { slug: string; name: string; price: number };

// How much each card shrinks the further it sits from the center card —
// 0 = all cards the same size, 1 = edge cards would collapse to nothing.
const SHRINK = 0.55;

export function LookbookCarousel() {
  const [slides, setSlides] = useState<LookbookSlide[]>([]);
  const [products, setProducts] = useState<Record<string, MiniProduct>>({});
  const heading = useSectionHeading("lookbook", "LOOKBOOK", { subtitle: "Curated fits — tap a card to shop it." });

  useEffect(() => {
    supabase
      .from("lookbook_slides")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(async ({ data }) => {
        if (!data) return;
        // Only cards that actually have a linked product are ready to show.
        const withProduct = data.filter((s) => s.product_slug);
        setSlides(withProduct);
        const slugs = withProduct.map((s) => s.product_slug).filter((s): s is string => !!s);
        if (slugs.length === 0) return;
        const { data: prods } = await supabase.from("products").select("slug,name,price").in("slug", slugs);
        if (prods) {
          const map: Record<string, MiniProduct> = {};
          (prods as MiniProduct[]).forEach((p) => { map[p.slug] = p; });
          setProducts(map);
        }
      });
  }, []);

  if (slides.length === 0) return null;

  const center = (slides.length - 1) / 2;
  const maxDist = Math.max(center, 1);

  return (
    <section className="py-16 sm:py-24 bg-[#E2E2E4] overflow-hidden border-t border-border">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-10 sm:mb-14 text-center">
        <h2
          className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.03em] uppercase text-display"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </h2>
        {heading.subtitle && (
          <p className="text-base sm:text-lg mt-3 opacity-70 max-w-xl mx-auto text-mono">{heading.subtitle}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center justify-center gap-3 sm:gap-5 px-4 sm:px-8 lg:px-16 py-8 w-fit mx-auto">
          {slides.map((slide, i) => {
            const factor = 1 - (Math.abs(i - center) / maxDist) * SHRINK;
            const product = slide.product_slug ? products[slide.product_slug] : undefined;
            return (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="group relative shrink-0 overflow-hidden rounded-[28px] bg-neutral-900 shadow-xl border border-black/5 transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl"
                style={{
                  width: `clamp(${Math.round(150 * factor)}px, ${(20 * factor).toFixed(1)}vw, ${Math.round(360 * factor)}px)`,
                  aspectRatio: "3 / 4",
                }}
              >
                {slide.media_type === "video" ? (
                  <video src={slide.image_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <img src={slide.image_url} alt={product?.name ?? ""} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                {product && (
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2"
                    style={{ padding: `${Math.max(10, 18 * factor)}px` }}
                  >
                    <p
                      className="text-white font-semibold leading-tight truncate uppercase tracking-wide"
                      style={{ fontSize: `${Math.max(10, 15 * factor)}px` }}
                    >
                      {product.name}
                    </p>
                    <Link
                      to="/product/$slug"
                      params={{ slug: product.slug }}
                      aria-label={`Shop ${product.name}`}
                      className="shrink-0 rounded-full bg-white text-black flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                      style={{ width: `${Math.max(26, 40 * factor)}px`, height: `${Math.max(26, 40 * factor)}px` }}
                    >
                      <ArrowUpRight style={{ width: `${Math.max(12, 18 * factor)}px`, height: `${Math.max(12, 18 * factor)}px` }} />
                    </Link>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
