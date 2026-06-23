import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  component: FAQ,
  head: () => ({
    meta: buildMeta({
      title: "FAQ — STUDIO DENY",
      description: "Shipping timelines, returns, sizing, customs duties — every question about Studio Deny, answered.",
      url: `${SITE_URL}/faq`,
    }),
    links: buildLinks(`${SITE_URL}/faq`),
  }),
});

const QA = [
  { q: "How long does shipping take?", a: "Metro cities: 2–4 days. Rest of India: 4–7 days. International: 7–14 days." },
  { q: "What's your return policy?", a: "Unworn pieces with tags can be returned within 7 days. Sale items are final sale." },
  { q: "Do you ship internationally?", a: "Yes — to 30+ countries. Customs and duties are paid by the buyer at delivery." },
  { q: "How do I find my size?", a: "Each PDP has a SIZE GUIDE link with measurements in cm. When in doubt, size up — our cuts run boxy." },
  { q: "Are drops restocked?", a: "Rarely. We make small runs on purpose. Once it's gone, it's gone." },
  { q: "How do I track my order?", a: "You'll get a tracking link by email + WhatsApp the moment it ships." },
  { q: "Can I cancel my order?", a: "Yes — within 12 hours of placing it. After that, it's already moving." },
  { q: "Do you do collabs?", a: "We're always open. Hit /contact with your portfolio + idea." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-3xl mx-auto">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ ANSWERS</div>
      <h1 className="text-display text-5xl md:text-7xl mb-8">FAQ.</h1>

      <ul className="border-t border-border">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={i} className="border-b border-border">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left hover:text-primary transition-colors"
              >
                <span className="font-semibold">{item.q}</span>
                {isOpen ? <Minus className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
              </button>
              {isOpen && <p className="pb-5 text-muted-foreground leading-relaxed">{item.a}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
