import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Plus, Minus, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { EditorialHeading } from "@/components/ui/EditorialHeading";

type FaqPreviewItem = { question: string; answer: string };
type FaqConfig = { view_all_label?: string };
const DEFAULTS: FaqConfig = { view_all_label: "VIEW ALL FAQS" };

const PREVIEW_LIMIT = 5;

export function FaqSection() {
  const [cfg, setCfg] = useState<FaqConfig>(DEFAULTS);
  const [visible, setVisible] = useState(true);
  const [items, setItems] = useState<FaqPreviewItem[]>([]);
  const [open, setOpen] = useState<number | null>(0);
  const heading = useSectionHeading("faq", "WE'VE GOT ANSWERS.", { eyebrow: "GOT QUESTIONS?" });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("config, is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "faq")
      .single()
      .then(({ data }) => {
        if (!data) return;
        const row = data as unknown as { is_visible: boolean; config: Partial<FaqConfig> };
        setVisible(row.is_visible);
        setCfg({
          view_all_label: row.config?.view_all_label || DEFAULTS.view_all_label,
        });
      });
  }, []);

  useEffect(() => {
    supabase
      .from("faq_items")
      .select("question, answer")
      .eq("is_active", true)
      .order("position")
      .limit(PREVIEW_LIMIT)
      .then(({ data }) => { if (data) setItems(data); });
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border bg-[#E2E2E4]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex flex-col">
          {heading.eyebrow && (
            <span className="text-mono text-primary mb-2 text-xs tracking-[0.35em]">◢ {heading.eyebrow}</span>
          )}
          <EditorialHeading className="text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-[-0.03em] uppercase text-display" style={heading.color ? { color: heading.color } : undefined}>
            {heading.text}
          </EditorialHeading>
        </div>

        <ul className="border-t border-border">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={i} className="border-b border-border">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left hover:text-primary transition-colors"
                >
                  <span className="font-semibold">{item.question}</span>
                  {isOpen ? <Minus className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
                </button>
                {isOpen && <p className="pb-5 text-muted-foreground leading-relaxed">{item.answer}</p>}
              </li>
            );
          })}
        </ul>

        <div className="mt-8 text-center">
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 text-mono text-xs tracking-[0.2em] uppercase border-b border-foreground/40 pb-1 hover:border-primary hover:text-primary transition-colors"
          >
            {cfg.view_all_label ?? "VIEW ALL FAQS"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
