import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto } from "@/types/database";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";
import { BENTO_SLOTS, BENTO_SLOT_COUNT } from "@/lib/communityBento";

const SUPPLEMENTARY_PHOTOS: CommunityPhoto[] = [
  {
    id: "supp-1",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
    handle: "@deny.fits",
    bento_size: "sm",
    media_type: "image",
    is_active: true,
    position: 10,
    created_at: "",
  },
  {
    id: "supp-2",
    image_url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800",
    handle: "@tokyo.deny",
    bento_size: "sm",
    media_type: "image",
    is_active: true,
    position: 11,
    created_at: "",
  },
];

export function CommunityBento() {
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [visible, setVisible] = useState(true);
  const heading = useSectionHeading("worn_by_community", "WORN BY OUR COMMUNITY", { eyebrow: "THE STREETS SPEAK", subtitle: "Real people, real fits. Tag us @studiodeny" });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "community")
      .single()
      .then(({ data }) => { if (data) setVisible((data as { is_visible: boolean }).is_visible); });
  }, []);

  useEffect(() => {
    supabase
      .from("community_photos")
      .select("*")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => { if (data) setPhotos(data); });
  }, []);

  if (!visible) return null;

  // Target exactly BENTO_SLOT_COUNT items to fill the 4x3 Bento rectangle perfectly (12 slots = 3 full rows)
  let displayPhotos: CommunityPhoto[] = [];
  if (photos.length >= BENTO_SLOT_COUNT) {
    displayPhotos = photos.slice(0, BENTO_SLOT_COUNT);
  } else if (photos.length > 0) {
    displayPhotos = [...photos, ...SUPPLEMENTARY_PHOTOS.slice(0, BENTO_SLOT_COUNT - photos.length)];
  } else {
    displayPhotos = SUPPLEMENTARY_PHOTOS;
  }

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 border-t border-border max-w-[1560px] mx-auto bg-[#E2E2E4]">
      <div className="mb-10 flex flex-col">
        {heading.eyebrow && (
          <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{heading.eyebrow}</span>
        )}
        <EditorialHeading
          className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </EditorialHeading>
        {heading.subtitle && (
          <EditorialSubheading className="mt-3 text-muted-foreground text-sm sm:text-base text-mono" delay={0.2}>
            {heading.subtitle}
          </EditorialSubheading>
        )}
      </div>

      {/* 100% Flush 4x3 Sharp-Edge Bento Box Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[180px] sm:auto-rows-[210px] lg:auto-rows-[230px] gap-3 sm:gap-4 grid-flow-dense">
        {displayPhotos.map((photo, idx) => {
          const spanClass = BENTO_SLOTS[idx % BENTO_SLOTS.length].className;
          const isHero = idx === 0;

          return (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.04 }}
              viewport={{ once: true }}
              className={`relative overflow-hidden rounded-none border border-border group ${spanClass}`}
            >
              {photo.media_type === "video" ? (
                <video src={photo.image_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={photo.image_url} alt={photo.handle ?? "community"} className="w-full h-full object-cover" loading="lazy" />
              )}

              {/* Hero Bento Badge */}
              {isHero && (
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-none border border-white/20 bg-black/60 backdrop-blur-md text-[9px] text-mono tracking-[0.2em] font-bold text-white uppercase">
                  <span className="w-1.5 h-1.5 rounded-none bg-primary animate-pulse" />
                  FEATURED FIT
                </div>
              )}

              {/* Gradient Dark Overlay & Handle Tag */}
              {photo.handle && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="absolute bottom-3 left-3.5 sm:bottom-4 sm:left-4 pointer-events-none z-10 flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-none bg-black/60 backdrop-blur-md border border-white/15">
                      <p className="text-[11px] sm:text-xs tracking-[0.15em] text-white text-mono font-medium drop-shadow">{photo.handle}</p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
