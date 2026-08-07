import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";

type TestimonialItem = { name: string; city: string; quote: string; rating: number };

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  { quote: "Fit is unreal. It feels premium without trying too hard.", name: "Arjun K.", city: "Mumbai", rating: 5 },
  { quote: "Finally a brand that understands cut, fabric, and movement.", name: "Priya S.", city: "Delhi", rating: 5 },
  { quote: "Every drop sells out for a reason. Quality is consistent.", name: "Rahul M.", city: "Bangalore", rating: 5 },
  { quote: "The heavyweight cotton is unmatched. Nothing else comes close.", name: "Sneha D.", city: "Pune", rating: 5 },
  { quote: "I get compliments every single time I wear Studio Deny.", name: "Vikram T.", city: "Hyderabad", rating: 5 },
  { quote: "Studio Deny is the only brand I trust for streetwear.", name: "Kiran R.", city: "Chennai", rating: 5 },
];

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(DEFAULT_TESTIMONIALS);
  const [visible, setVisible] = useState(true);
  const heading = useSectionHeading("testimonials", "WORN IN\nEVERY CITY");

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "testimonials")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: { fallback_quotes?: { quote: string; name: string; city: string }[] } };
        setVisible(row.is_visible);
        if (row.config?.fallback_quotes && row.config.fallback_quotes.length > 0) {
          setTestimonials(row.config.fallback_quotes.map((q) => ({ ...q, rating: 5 })));
        }
      });
  }, []);

  useEffect(() => {
    supabase
      .from("testimonials")
      .select("name, role, body, rating")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTestimonials(data.map((t) => ({ name: t.name, city: t.role ?? "", quote: t.body, rating: t.rating })));
        }
      });
  }, []);

  if (!visible) return null;

  return (
    <section className="py-16 sm:py-24 overflow-hidden bg-[#E2E2E4]">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10 sm:mb-14 text-center">
          <h2
            className="text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase text-display whitespace-pre-line"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </h2>
        </motion.div>
      </div>
      <div className="flex overflow-hidden group py-4">
        <div className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused]" style={{ animationDuration: "60s" }}>
          {(() => {
            const MIN_PER_HALF = 6;
            const repeat = Math.max(1, Math.ceil(MIN_PER_HALF / testimonials.length));
            const half = Array.from({ length: repeat }, () => testimonials).flat();
            return [...half, ...half].map((t, idx) => (
              <div key={idx} className="shrink-0 w-[320px] sm:w-[380px] border border-border bg-surface/30 p-6 sm:p-8 flex flex-col justify-between mr-5">
                <div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }, (_, n) => (
                      <Star
                        key={n}
                        className={`w-3.5 h-3.5 ${
                          n < t.rating
                            ? "fill-black text-black"
                            : "fill-transparent text-black/40 stroke-[1.5]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-base sm:text-lg leading-relaxed opacity-90 text-display">"{t.quote}"</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm tracking-[0.1em] uppercase text-mono opacity-80">{t.name}</p>
                  {t.city && <p className="text-xs tracking-[0.15em] uppercase opacity-50 mt-1 text-mono">{t.city} · VERIFIED BUYER</p>}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </section>
  );
}
