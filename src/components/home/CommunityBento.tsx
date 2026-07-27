import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto, BentoSize } from "@/types/database";

const SIZE_CLASS: Record<BentoSize, string> = {
  sm: "col-span-1 row-span-1",
  md: "col-span-1 row-span-1",
  lg: "col-span-2 row-span-2",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
};

export function CommunityBento() {
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);

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
        <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">THE STREETS SPEAK</span>
        <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">WORN BY OUR COMMUNITY</h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base text-mono">Real people, real fits. Tag us @studiodeny</p>
      </motion.div>

      {/* Admin-curated, no click-through by design — purely visual/social-proof. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[140px] sm:auto-rows-[180px] gap-3">
        {photos.map((photo, idx) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            viewport={{ once: true }}
            className={`relative overflow-hidden border border-border group ${SIZE_CLASS[photo.bento_size]}`}
          >
            <img src={photo.image_url} alt={photo.handle ?? "community"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            {photo.handle && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs tracking-[0.15em] text-white text-mono">{photo.handle}</p>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
