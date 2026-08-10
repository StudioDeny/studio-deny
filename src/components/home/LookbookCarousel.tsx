import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";

type MiniProduct = { slug: string; name: string; price: number };

// How much each card shrinks the further it sits from the center card —
// 0 = all cards the same size, 1 = edge cards would collapse to nothing.
const SHRINK = 0.45;

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
        setSlides(data);
        const slugs = data.map((s) => s.product_slug).filter((s): s is string => !!s);
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
    <section className="py-14 sm:py-20 bg-[#E2E2E4] overflow-hidden border-t border-border">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-8 sm:mb-12">
        <div className="flex flex-col">
          <EditorialHeading
            className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.03em] uppercase text-display"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </EditorialHeading>
          {heading.subtitle && (
            <EditorialSubheading className="text-base sm:text-lg mt-1.5 opacity-80 max-w-xl text-mono" delay={0.2}>
              {heading.subtitle}
            </EditorialSubheading>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-8 lg:px-16 py-6 w-fit mx-auto">
          {slides.map((slide, i) => {
            const factor = 1 - (Math.abs(i - center) / maxDist) * SHRINK;
            const product = slide.product_slug ? products[slide.product_slug] : undefined;
            return (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="relative shrink-0 overflow-hidden rounded-2xl bg-surface"
                style={{
                  width: `clamp(${Math.round(100 * factor)}px, ${(12 * factor).toFixed(1)}vw, ${Math.round(220 * factor)}px)`,
                  aspectRatio: "3 / 4",
                }}
              >
                {slide.media_type === "video" ? (
                  <video src={slide.image_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img src={slide.image_url} alt={product?.name ?? ""} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {product && (
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 flex items-end justify-between gap-2">
                    <p className="text-white text-[11px] sm:text-sm font-semibold leading-tight truncate">{product.name}</p>
                    <Link
                      to="/product/$slug"
                      params={{ slug: product.slug }}
                      aria-label={`Shop ${product.name}`}
                      className="shrink-0 size-7 sm:size-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ArrowUpRight className="size-3.5 sm:size-4" />
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
