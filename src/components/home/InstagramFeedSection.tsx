import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";

type InstagramConfig = {
  eyebrow: string;
  title: string;
  handle: string;
  image_urls: string[];
};

const DEFAULTS: InstagramConfig = {
  eyebrow: "THE COMMUNITY",
  title: "@STUDIODENY",
  handle: "studiodeny",
  image_urls: [
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&q=80",
    "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&q=80",
  ],
};

export function InstagramFeedSection() {
  const [cfg, setCfg] = useState<InstagramConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "instagram_feed")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        if (row.config && typeof row.config === "object") {
          setCfg({ ...DEFAULTS, ...(row.config as Partial<InstagramConfig>) });
        }
      });
  }, []);

  if (!visible) return null;

  const profileUrl = `https://instagram.com/${cfg.handle}`;

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 border-t border-border/30">
      <div className="max-w-[1320px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <div className="text-mono text-primary mb-2" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>
              ◢ {cfg.eyebrow}
            </div>
            <h2 className="text-display leading-none" style={{ fontSize: "clamp(32px, 6vw, 64px)" }}>
              {cfg.title}
            </h2>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-mono"
            style={{ fontSize: "11px", letterSpacing: "0.2em" }}
          >
            FOLLOW <Instagram className="size-3.5" />
          </a>
        </motion.div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-2">
          {cfg.image_urls.slice(0, 6).map((src, idx) => (
            <motion.a
              key={idx}
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.07 }}
              viewport={{ once: true }}
              className="relative overflow-hidden group block"
              style={{ aspectRatio: "1/1" }}
            >
              <img
                src={src}
                alt={`${cfg.title} post ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                <Instagram className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-5 text-center sm:hidden">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-mono"
            style={{ fontSize: "11px", letterSpacing: "0.2em" }}
          >
            FOLLOW ON INSTAGRAM <Instagram className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
