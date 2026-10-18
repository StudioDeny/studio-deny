import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialParagraph } from "@/components/ui/EditorialHeading";

// mobile_url: optional phone version; phones fall back to video_url.
type MotionPictureConfig = {
  video_url: string;
  media_type?: "image" | "video";
  mobile_url?: string;
  mobile_media_type?: "image" | "video";
  subtext: string;
};

import { useWebsiteSectionConfig } from "@/lib/websiteSections";
import { responsiveImage } from "@/lib/image";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULTS: MotionPictureConfig = { video_url: "", media_type: "video", subtext: "" };

export function MotionPictureSection() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<MotionPictureConfig>("motion_picture", DEFAULTS);
  const heading = useSectionHeading("motion_picture", "MOTION\nPICTURE");
  const isMobile = useIsMobile();
  const onPhone = isMobile && !!cfg.mobile_url;
  const src = onPhone ? cfg.mobile_url! : cfg.video_url;
  const mediaType = onPhone ? (cfg.mobile_media_type ?? "image") : cfg.media_type;

  if (!visible || !src) return null;

  return (
    <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center border-y border-border bg-[#0A0A0A]">
      {mediaType === "image" ? (
        <img
          key={src}
          {...responsiveImage(src, { maxWidth: 3200, sizes: "100vw" })}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <video key={src} autoPlay loop muted playsInline preload="none"
          className="absolute inset-0 w-full h-full object-cover">
          <source src={src} type="video/mp4" />
        </video>
      )}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        <EditorialHeading
          className="text-[clamp(4rem,12vw,10rem)] leading-none font-display uppercase tracking-[-0.04em] text-white whitespace-pre-line"
          style={heading.color ? { color: heading.color } : undefined}
        >
          {heading.text}
        </EditorialHeading>
        {cfg.subtext && (
          <EditorialParagraph className="mt-8 text-lg md:text-xl text-white/80 text-mono tracking-[0.2em] max-w-2xl mx-auto leading-relaxed" delay={0.25}>
            {cfg.subtext}
          </EditorialParagraph>
        )}
      </div>
    </section>
  );
}
