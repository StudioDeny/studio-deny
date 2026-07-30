import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, X, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ExternalLink, Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { InfluencerPick } from "@/types/database";
import type { Product } from "@/lib/productsStore";
import { useSectionHeading } from "@/lib/sectionHeadings";

type PickWithTags = InfluencerPick & { products: Pick<Product, "slug" | "name" | "image">[] };
type InfluencerPicksConfig = { explore_label?: string };

function GridTile({ pick, onOpen }: { pick: PickWithTags; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [taggedIdx, setTaggedIdx] = useState(0);
  const isUpload = pick.video_source === "upload" && !!pick.video_url;
  const isLink = pick.video_source === "link";

  // While hovering an uploaded-video tile with more than one tagged product,
  // auto-advance which tagged product the overlay shows.
  useEffect(() => {
    if (!hovered || !isUpload || pick.products.length <= 1) return;
    const t = setInterval(() => setTaggedIdx((i) => (i + 1) % pick.products.length), 1800);
    return () => clearInterval(t);
  }, [hovered, isUpload, pick.products.length]);

  useEffect(() => { if (!hovered) setTaggedIdx(0); }, [hovered]);

  const handleClick = () => {
    if (isLink && pick.link_url) {
      window.open(pick.link_url, "_blank", "noopener,noreferrer");
    } else {
      onOpen();
    }
  };

  const taggedProduct = pick.products[taggedIdx];

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="shrink-0 w-[62vw] sm:w-[30vw] lg:w-[21vw] text-left group/tile"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface border border-border">
        {isUpload && hovered ? (
          <video
            src={pick.video_url!}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          pick.thumbnail_url && (
            pick.thumbnail_type === "video" ? (
              <video
                src={pick.thumbnail_url}
                autoPlay muted loop playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.03]"
              />
            ) : (
              <img
                src={pick.thumbnail_url}
                alt={pick.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.03]"
              />
            )
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/25" />

        {/* Default state (not hovering): always a video/play icon, for every
            tile regardless of source. On hover, uploaded videos autoplay
            inline (no icon needed); reel links swap to an Instagram
            affordance instead, since that's an external link, not a hosted
            file we can play inline. */}
        {!hovered ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="size-12 sm:size-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/40 flex items-center justify-center">
              <Play className="size-5 sm:size-6 text-white fill-white ml-0.5" />
            </span>
          </div>
        ) : isLink ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="size-12 sm:size-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/40 flex items-center justify-center scale-110 bg-black/55">
              <Instagram className="size-5 sm:size-6 text-white" />
            </span>
          </div>
        ) : null}

        <div className="absolute top-3 left-3">
          <p className="text-white font-display text-sm uppercase drop-shadow">{pick.name}</p>
          {pick.handle && <p className="text-white/70 text-mono text-[10px] drop-shadow">{pick.handle}</p>}
        </div>

        {/* Tagged product(s) overlay — only while hovering/playing */}
        {hovered && taggedProduct && (
          <Link
            to="/product/$slug"
            params={{ slug: taggedProduct.slug }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-white/95 hover:bg-white pl-1.5 pr-3 py-1.5 w-fit max-w-full transition-colors"
          >
            <img src={taggedProduct.image} alt="" className="size-7 object-cover shrink-0" />
            <span className="text-xs font-semibold text-black truncate">{taggedProduct.name}</span>
          </Link>
        )}
      </div>
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
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wheelLock = useRef(false);

  // Always try to actually play something first — a pasted link is sometimes a
  // direct video file, sometimes a webpage URL that can't play inline. Only
  // fall back to "view the original post" if the browser reports it can't load.
  const playbackSrc = pick.video_url ?? pick.link_url ?? undefined;

  useEffect(() => {
    setVideoFailed(false);
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
        {playbackSrc && !videoFailed ? (
          <video
            key={`${pick.id}-${playbackSrc}`}
            ref={videoRef}
            muted={muted}
            loop
            playsInline
            autoPlay
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={playbackSrc} type="video/mp4" />
          </video>
        ) : (
          // Only reached if there's truly nothing to play, or the browser
          // couldn't load it (e.g. a pasted link that isn't a direct video file).
          <>
            {pick.thumbnail_url && (
              <img src={pick.thumbnail_url} alt={pick.name} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            {pick.link_url && (
              <a
                href={pick.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white group/watch"
              >
                <span className="size-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover/watch:scale-110 transition-transform">
                  <Play className="size-7 fill-white ml-0.5" />
                </span>
                <span className="text-xs tracking-[0.15em] uppercase text-mono inline-flex items-center gap-1.5">
                  View original post <ExternalLink className="size-3" />
                </span>
              </a>
            )}
          </>
        )}

        {playbackSrc && !videoFailed && (
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
  const [visible, setVisible] = useState(true);
  const [cfg, setCfg] = useState<InfluencerPicksConfig>({ explore_label: "EXPLORE OUR COLLECTION" });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "influencer_picks")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: Partial<InfluencerPicksConfig> };
        setVisible(row.is_visible);
        if (row.config?.explore_label) setCfg({ explore_label: row.config.explore_label });
      });
  }, []);

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

  const heading = useSectionHeading("influencer_picks", "INFLUENCER PICKS", { eyebrow: "AS SEEN ON" });

  if (!visible || picks.length === 0) return null;

  const openLightboxFor = (pick: PickWithTags) => {
    const idx = picks.findIndex((p) => p.id === pick.id);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <section className="py-14 sm:py-20 overflow-hidden border-t border-border">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-16 mb-8 sm:mb-10 flex items-end justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{heading.eyebrow}</span>
          <h2
            className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </h2>
        </motion.div>
        <Link to="/shop" className="hidden sm:inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-mono hover:text-primary transition-colors">
          {cfg.explore_label ?? "EXPLORE OUR COLLECTION"} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollerRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
          className="hidden sm:flex absolute z-[2] left-2 lg:left-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
          className="hidden sm:flex absolute z-[2] right-2 lg:right-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center bg-background/90 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <ChevronRightIcon className="size-5" />
        </button>
        <div ref={scrollerRef} className="flex items-stretch gap-4 overflow-x-auto scroll-smooth no-scrollbar px-4 sm:px-8 lg:px-16 py-2">
          {picks.map((pick) => (
            <GridTile key={pick.id} pick={pick} onOpen={() => openLightboxFor(pick)} />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox picks={picks} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </section>
  );
}
