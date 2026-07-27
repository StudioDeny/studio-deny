import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, X, Volume2, VolumeX, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { InfluencerPick } from "@/types/database";
import type { Product } from "@/lib/productsStore";

type PickWithTags = InfluencerPick & { products: Pick<Product, "slug" | "name" | "image">[] };

function GridTile({ pick, onOpen }: { pick: PickWithTags; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="shrink-0 w-[62vw] sm:w-[30vw] lg:w-[21vw] mr-4 text-left group/tile">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface border border-border">
        {pick.thumbnail_url && (
          <img
            src={pick.thumbnail_url}
            alt={pick.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.03]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/25" />

        {/* Play affordance — makes it unmistakable this is a video, not a photo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="size-12 sm:size-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover/tile:scale-110 group-hover/tile:bg-black/55 transition-all">
            <Play className="size-5 sm:size-6 text-white fill-white ml-0.5" />
          </span>
        </div>

        <div className="absolute top-3 left-3">
          <p className="text-white font-display text-sm uppercase drop-shadow">{pick.name}</p>
          {pick.handle && <p className="text-white/70 text-mono text-[10px] drop-shadow">{pick.handle}</p>}
        </div>
      </div>

      {pick.products.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <img src={pick.products[0].image} alt="" className="size-8 object-cover rounded-sm border border-border shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{pick.products[0].name}</p>
            {pick.products.length > 1 && <p className="text-[10px] text-muted-foreground">+{pick.products.length - 1} more</p>}
          </div>
        </div>
      )}
    </button>
  );
}

function Lightbox({
  picks,
  index,
  onClose,
  onNavigate,
}: {
  picks: PickWithTags[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const pick = picks[index];
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wheelLock = useRef(false);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowUp" && index > 0) onNavigate(index - 1);
      else if (e.key === "ArrowDown" && index < picks.length - 1) onNavigate(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, picks.length, onClose, onNavigate]);

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    if (e.deltaY > 30 && index < picks.length - 1) {
      wheelLock.current = true;
      onNavigate(index + 1);
      setTimeout(() => { wheelLock.current = false; }, 500);
    } else if (e.deltaY < -30 && index > 0) {
      wheelLock.current = true;
      onNavigate(index - 1);
      setTimeout(() => { wheelLock.current = false; }, 500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center" onWheel={onWheel}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 left-5 z-10 size-10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 transition-colors"
      >
        <X className="size-5" />
      </button>

      <div className="relative w-full max-w-[420px] h-[85vh] sm:h-[88vh] bg-black overflow-hidden">
        {pick.video_source === "upload" && pick.video_url ? (
          <video
            key={pick.id}
            ref={videoRef}
            muted={muted}
            loop
            playsInline
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={pick.video_url} type="video/mp4" />
          </video>
        ) : (
          // Link-source picks (Instagram/YouTube reels) can't be played inline without
          // that platform's embed SDK — stays consistent with the same modal "box"
          // instead of bouncing the user off-site, but opens the real post on demand.
          <>
            {pick.thumbnail_url && (
              <img src={pick.thumbnail_url} alt={pick.name} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            <a
              href={pick.link_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white group/watch"
            >
              <span className="size-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover/watch:scale-110 transition-transform">
                <Play className="size-7 fill-white ml-0.5" />
              </span>
              <span className="text-xs tracking-[0.15em] uppercase text-mono inline-flex items-center gap-1.5">
                Watch on Instagram <ExternalLink className="size-3" />
              </span>
            </a>
          </>
        )}

        {pick.video_source === "upload" && pick.video_url && (
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label="Toggle sound"
            className="absolute top-4 right-4 size-9 rounded-full bg-black/40 border border-white/30 flex items-center justify-center text-white"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        )}

        <div className="absolute top-4 left-16 right-16 text-white">
          <p className="font-display text-lg uppercase">{pick.name}</p>
          {pick.handle && <p className="text-white/60 text-mono text-xs">{pick.handle}</p>}
        </div>

        {pick.quote && (
          <div className="absolute inset-x-4 z-[1]" style={{ bottom: pick.products.length > 0 ? "35%" : "4rem" }}>
            <p className="text-white/85 text-sm italic leading-relaxed">"{pick.quote}"</p>
          </div>
        )}

        {pick.products.length > 0 && (
          <div className="absolute bottom-6 left-4 right-4 flex flex-col gap-2">
            {pick.products.map((p) => (
              <Link
                key={p.slug}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="flex items-center gap-3 bg-white/95 hover:bg-white pl-1.5 pr-4 py-1.5 rounded-full w-fit transition-colors"
              >
                <img src={p.image} alt="" className="size-8 rounded-full object-cover" />
                <span className="text-xs font-semibold text-black">{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {picks.length > 1 && (
        <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button
            onClick={() => index > 0 && onNavigate(index - 1)}
            disabled={index === 0}
            aria-label="Previous video"
            className="size-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronUp className="size-5" />
          </button>
          <button
            onClick={() => index < picks.length - 1 && onNavigate(index + 1)}
            disabled={index === picks.length - 1}
            aria-label="Next video"
            className="size-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronDown className="size-5" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

export function InfluencerPicksGrid() {
  const [picks, setPicks] = useState<PickWithTags[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const openLightboxFor = (pick: PickWithTags) => {
    const idx = picks.findIndex((p) => p.id === pick.id);
    if (idx >= 0) setLightboxIndex(idx);
  };

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
          {[...picks, ...picks].map((pick, idx) => (
            <GridTile key={`${pick.id}-${idx}`} pick={pick} onOpen={() => openLightboxFor(pick)} />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox picks={picks} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </section>
  );
}
