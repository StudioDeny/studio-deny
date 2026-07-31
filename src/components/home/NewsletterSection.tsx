import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";

type NewsletterConfig = {
  cta_label: string;
  success_heading: string;
  success_body: string;
};

const DEFAULTS: NewsletterConfig = {
  cta_label: "GET EARLY ACCESS",
  success_heading: "✓ YOU'RE ON THE LIST",
  success_body: "We'll hit you first when the next drop goes live.",
};

function Form({ ctaLabel, successHeading, successBody }: { ctaLabel: string; successHeading: string; successBody: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("submitting");
    setTimeout(() => setStatus("done"), 700);
  };

  if (status === "done") {
    return (
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="text-secondary font-bold text-mono" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>
          {successHeading}
        </div>
        <p className="text-muted-foreground text-mono" style={{ fontSize: "12px" }}>
          {successBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 bg-surface border border-border px-4 h-12 text-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
        style={{ fontSize: "13px" }}
        required
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 px-6 bg-primary text-primary-foreground font-bold text-mono hover:glow-primary transition-all disabled:opacity-50 whitespace-nowrap"
        style={{ fontSize: "11px", letterSpacing: "0.2em" }}
      >
        {status === "submitting" ? "…" : ctaLabel}
      </button>
    </form>
  );
}

export function NewsletterSection() {
  const [cfg, setCfg] = useState<NewsletterConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const heading = useSectionHeading("newsletter", "READY FOR THE NEXT DROP?", { eyebrow: "DROP ALERTS", subtitle: "Be first in line when new pieces launch. No spam, just early access." });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "newsletter")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: unknown };
        setVisible(row.is_visible);
        if (row.config && typeof row.config === "object") {
          setCfg({ ...DEFAULTS, ...(row.config as Partial<NewsletterConfig>) });
        }
      });
  }, []);

  if (!visible) return null;

  return (
    <section id="cta-end" className="py-20 sm:py-28 border-t border-border/30 bg-[#E2E2E4]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="max-w-[760px] mx-auto px-4 sm:px-8 text-center"
      >
        <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>
          ◢ {heading.eyebrow}
        </div>
        <h2 className="text-display leading-[0.88]" style={heading.color ? { fontSize: "clamp(2.3rem,9vw,6rem)", color: heading.color } : { fontSize: "clamp(2.3rem,9vw,6rem)" }}>
          {heading.text}
        </h2>
        <p className="mt-4 opacity-80 max-w-md mx-auto text-mono" style={{ fontSize: "14px" }}>
          {heading.subtitle}
        </p>
        <Form ctaLabel={cfg.cta_label} successHeading={cfg.success_heading} successBody={cfg.success_body} />
      </motion.div>
    </section>
  );
}
