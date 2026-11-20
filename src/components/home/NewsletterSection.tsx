import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading, EditorialSubheading } from "@/components/ui/EditorialHeading";

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
        className="h-12 px-6 bg-primary text-primary-foreground font-bold text-mono hover:glow-primary btn-shimmer disabled:opacity-50 whitespace-nowrap"
        style={{ fontSize: "11px", letterSpacing: "0.2em" }}
      >
        {status === "submitting" ? "…" : ctaLabel}
      </button>
    </form>
  );
}

import { useWebsiteSectionConfig } from "@/lib/websiteSections";

export function NewsletterSection() {
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<NewsletterConfig>("newsletter", DEFAULTS);
  const heading = useSectionHeading("newsletter", "READY FOR THE NEXT DROP?");

  if (!visible) return null;

  return (
    <section id="cta-end" className="py-16 sm:py-24 border-t border-border/30 bg-[#E2E2E4]">
      <div className="max-w-[760px] mx-auto px-4 sm:px-8 text-center flex flex-col items-center">
        <EditorialHeading className="type-h2" style={heading.color ? { color: heading.color } : undefined}>
          {heading.text}
        </EditorialHeading>
        <Form ctaLabel={cfg.cta_label} successHeading={cfg.success_heading} successBody={cfg.success_body} />
      </div>
    </section>
  );
}
