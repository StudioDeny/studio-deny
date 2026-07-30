import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto, BentoSize } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";

// Masonry (CSS columns) rather than CSS Grid row/col spans — spans need enough
// small tiles around them to avoid gaps, which broke down with only a few
// admin-curated photos. Columns auto-flow into whichever column is shortest,
// so it never leaves a gap no matter how many photos or which sizes are picked.
// Size variety comes from aspect ratio (height) instead of column span (width).
const ASPECT_CLASS: Record<BentoSize, string> = {
  sm: "aspect-[4/5]",
  md: "aspect-[5/6]",
  wide: "aspect-[16/11]",
  tall: "aspect-[3/5]",
  lg: "aspect-[3/4]",
};

export function CommunityBento() {
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const heading = useSectionHeading("worn_by_community", "WORN BY OUR COMMUNITY", { eyebrow: "THE STREETS SPEAK", subtitle: "Real people, real fits. Tag us @studiodeny" });

  useEffect(() => {
    supabase
      .from("community_photos")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => { if (data) setPhotos(data); });
  }, []);

  if (photos.length === 0) return null;

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 border-t border-border max-w-[1560px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-10">
        <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{heading.eyebrow}</span>
        <h2
          className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base text-mono">{heading.subtitle}</p>
      </motion.div>

      {/* Admin-curated, no click-through by design — purely visual/social-proof. */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 sm:gap-3">
        {photos.map((photo, idx) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            viewport={{ once: true }}
            className={`relative overflow-hidden border border-border group mb-2 sm:mb-3 break-inside-avoid ${ASPECT_CLASS[photo.bento_size]}`}
          >
            {photo.media_type === "video" ? (
              <video src={photo.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" autoPlay loop muted playsInline />
            ) : (
              <img src={photo.image_url} alt={photo.handle ?? "community"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" loading="lazy" />
            )}
            {photo.handle && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-2.5 left-3 sm:bottom-3">
                  <p className="text-[11px] sm:text-xs tracking-[0.15em] text-white text-mono drop-shadow">{photo.handle}</p>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
