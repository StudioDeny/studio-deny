import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Zap, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Feature = { label: string; desc: string };
type WhyUsConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: Feature[];
};

const ICONS = [Package, Zap, Shield, CheckCircle];

const DEFAULTS: WhyUsConfig = {
  eyebrow: "WHY STUDIO DENY",
  title: "BUILT DIFFERENT.",
  subtitle: "STAYS DIFFERENT.",
  features: [
    { label: "PREMIUM GSM FABRIC", desc: "300+ GSM heavyweight cotton. Structured, substantial, and built to outlast trends by decades." },
    { label: "LIMITED DROPS ONLY", desc: "Every piece ships in limited quantities. Own something not everyone has — because that's the point." },
    { label: "BUILT TO LAST", desc: "Reinforced stitching, pre-shrunk cotton, stress-tested hardware. Wear it hard for years." },
    { label: "RESPONSIBLE CRAFT", desc: "Ethically produced in small-batch facilities. Quality you can feel and a process you can stand behind." },
  ],
};

export function WhyUsSection() {
  const [cfg, setCfg] = useState<WhyUsConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "why_us")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        if (row.config && typeof row.config === "object") {
          setCfg({ ...DEFAULTS, ...(row.config as Partial<WhyUsConfig>) });
        }
      });
  }, []);

  if (!visible) return null;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border/30">
      <div className="max-w-[1320px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>
            ◢ {cfg.eyebrow}
          </div>
          <h2 className="text-display leading-none" style={{ fontSize: "clamp(36px, 7vw, 80px)" }}>
            {cfg.title}
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.35)" }}>
              {cfg.subtitle}
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cfg.features.slice(0, 4).map((feature, idx) => {
            const Icon = ICONS[idx] ?? Package;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="border border-border/50 bg-surface/20 p-6 group hover:border-primary/40 hover:bg-surface/40 transition-all duration-300"
              >
                <Icon className="size-5 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                <div className="text-mono font-bold mb-2" style={{ fontSize: "11px", letterSpacing: "0.2em" }}>
                  {feature.label}
                </div>
                <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "13px" }}>
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
