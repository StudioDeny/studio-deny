import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";

type MotionPictureConfig = { video_url: string; media_type?: "image" | "video"; subtext: string };

export function MotionPictureSection() {
  const [visible, setVisible] = useState(true);
  const [cfg, setCfg] = useState<MotionPictureConfig>({
    video_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    media_type: "video",
    subtext: "CAPTURING THE ESSENCE OF THE STREETS. RAW, UNFILTERED, AND IN CONSTANT MOTION.",
  });
  const heading = useSectionHeading("motion_picture", "MOTION\nPICTURE");

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "motion_picture")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: Partial<MotionPictureConfig> };
        setVisible(row.is_visible);
        if (row.config?.video_url) setCfg((mp) => ({
          video_url: row.config.video_url!,
          media_type: row.config.media_type ?? "video",
          subtext: row.config.subtext ?? mp.subtext,
        }));
      });
  }, []);

  if (!visible) return null;

  return (
    <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center border-y border-border bg-[#0A0A0A]">
      {cfg.media_type === "image" ? (
        <img
          key={cfg.video_url}
          src={cfg.video_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
        />
      ) : (
        <video key={cfg.video_url} autoPlay loop muted playsInline preload="none"
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105">
          <source src={cfg.video_url} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/70" />
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} viewport={{ once: true }}>
          <h2
            className="text-[clamp(4rem,12vw,10rem)] leading-[0.8] font-display uppercase tracking-[-0.04em] text-white whitespace-pre-line"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </h2>
          <p className="mt-8 text-lg md:text-xl text-white/80 text-mono tracking-[0.2em] max-w-2xl mx-auto leading-relaxed">
            {cfg.subtext}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
