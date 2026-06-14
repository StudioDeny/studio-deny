import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type NewsletterConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
};

const DEFAULTS: NewsletterConfig = {
  eyebrow: "DROP ALERTS",
  title: "READY FOR THE NEXT DROP?",
  subtitle: "Be first in line when new pieces launch. No spam, just early access.",
  cta_label: "GET EARLY ACCESS",
};

function Form({ ctaLabel }: { ctaLabel: string }) {
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
          ✓ YOU'RE ON THE LIST
        </div>
        <p className="text-muted-foreground text-mono" style={{ fontSize: "12px" }}>
          We'll hit you first when the next drop goes live.
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
    <section id="cta-end" className="py-20 sm:py-28 border-t border-border/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="max-w-[760px] mx-auto px-4 sm:px-8 text-center"
      >
        <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>
          ◢ {cfg.eyebrow}
        </div>
        <h2 className="text-display leading-[0.88]" style={{ fontSize: "clamp(2.3rem,9vw,6rem)" }}>
          {cfg.title}
        </h2>
        <p className="mt-4 opacity-80 max-w-md mx-auto text-mono" style={{ fontSize: "14px" }}>
          {cfg.subtitle}
        </p>
        <Form ctaLabel={cfg.cta_label} />
      </motion.div>
    </section>
  );
}
