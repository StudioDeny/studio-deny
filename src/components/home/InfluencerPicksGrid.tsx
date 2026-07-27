import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { InfluencerPick } from "@/types/database";
import type { Product } from "@/lib/productsStore";

type PickWithTags = InfluencerPick & { products: Pick<Product, "slug" | "name" | "image">[] };

function Tile({ pick }: { pick: PickWithTags }) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnter = () => {
    setHovering(true);
    if (pick.video_source === "upload") videoRef.current?.play().catch(() => {});
  };
  const handleLeave = () => {
    setHovering(false);
    if (pick.video_source === "upload" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const content = (
    <div
      className={`relative shrink-0 w-[70vw] sm:w-[38vw] lg:w-[26vw] aspect-[4/5] mr-4 overflow-hidden bg-surface border border-border group/tile ${pick.video_source === "link" ? "cursor-pointer" : ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {pick.video_source === "upload" && pick.video_url ? (
        <>
          {pick.thumbnail_url && (
            <img
              src={pick.thumbnail_url}
              alt={pick.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovering ? "opacity-0" : "opacity-100"}`}
            />
          )}
          <video ref={videoRef} muted loop playsInline preload="metadata"
            className="absolute inset-0 w-full h-full object-cover">
            <source src={pick.video_url} type="video/mp4" />
          </video>
        </>
      ) : (
        pick.thumbnail_url && <img src={pick.thumbnail_url} alt={pick.name} className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      <div className="absolute top-3 left-3 z-[1]">
        <p className="text-white font-display text-base uppercase">{pick.name}</p>
        {pick.handle && <p className="text-white/60 text-mono text-[11px]">{pick.handle}</p>}
      </div>

      {pick.products.length > 0 && (
        <div className={`absolute bottom-3 left-3 right-3 z-[1] flex flex-col gap-1.5 transition-opacity duration-300 ${hovering ? "opacity-100" : "opacity-0 sm:opacity-0"}`}>
          {pick.products.slice(0, 3).map((p) => (
            <Link
              key={p.slug}
              to="/product/$slug"
              params={{ slug: p.slug }}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-white/95 hover:bg-white pl-1 pr-3 py-1 rounded-full transition-colors w-fit"
            >
              <img src={p.image} alt="" className="size-6 rounded-full object-cover" />
              <span className="text-[11px] font-semibold text-black truncate max-w-[140px]">{p.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // Link-source picks open the reel on click — but the tagged-product links
  // above must stay real <a> tags for accessibility, and HTML forbids an <a>
  // nested inside another <a>. So the outer "open the reel" affordance is a
  // clickable div, not an anchor, with stopPropagation on the inner tag links.
  if (pick.video_source === "link" && pick.link_url) {
    const openReel = () => window.open(pick.link_url!, "_blank", "noopener,noreferrer");
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={openReel}
        onKeyDown={(e) => { if (e.key === "Enter") openReel(); }}
        className="contents"
      >
        {content}
      </div>
    );
  }
  return content;
}

export function InfluencerPicksGrid() {
  const [picks, setPicks] = useState<PickWithTags[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("influencer_picks").select("*").eq("is_active", true).order("position");
      if (!rows || rows.length === 0) return;

      const { data: tags } = await supabase.from("influencer_pick_products").select("influencer_pick_id, product_slug, position").order("position");
      const slugsNeeded = Array.from(new Set((tags ?? []).map((t) => t.product_slug)));
      let productMap: Record<string, Pick<Product, "slug" | "name" | "image">> = {};
      if (slugsNeeded.length > 0) {
        const { data: products } = await supabase.from("products").select("slug,name,image").in("slug", slugsNeeded);
        productMap = Object.fromEntries((products ?? []).map((p) => [p.slug, p]));
      }

      const withTags: PickWithTags[] = rows.map((pick) => ({
        ...pick,
        products: (tags ?? [])
          .filter((t) => t.influencer_pick_id === pick.id)
          .map((t) => productMap[t.product_slug])
          .filter(Boolean),
      }));
      setPicks(withTags);
    })();
  }, []);

  if (picks.length === 0) return null;

  return (
    <section className="py-14 sm:py-20 overflow-hidden border-t border-border">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-8 sm:mb-10 flex items-end justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">AS SEEN ON</span>
          <h2 className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display">INFLUENCER PICKS</h2>
        </motion.div>
        <Link to="/shop" className="hidden sm:inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-mono hover:text-primary transition-colors">
          EXPLORE OUR COLLECTION <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex overflow-hidden group py-2">
        <div className="flex shrink-0 items-stretch ticker-scroll group-hover:[animation-play-state:paused] pl-4 sm:pl-8 lg:pl-16" style={{ animationDuration: "45s" }}>
          {[...picks, ...picks].map((pick, idx) => <Tile key={`${pick.id}-${idx}`} pick={pick} />)}
        </div>
      </div>
    </section>
  );
}
