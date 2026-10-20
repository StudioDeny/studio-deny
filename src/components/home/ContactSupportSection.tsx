import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail, Clock } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useSectionHeading } from "@/lib/sectionHeadings";
import { getBrandSettings, whatsappHref } from "@/lib/brand";

// Admin → Settings (contact email, WhatsApp, support hours).
type ContactSupport = { enabled: boolean; email: string; whatsapp: string | null; hours: string };

type ContactCard = { label: string; desc: string };
const DEFAULT_CARDS: ContactCard[] = [
  { label: "EMAIL US", desc: "For order issues, returns & general queries" },
  { label: "WHATSAPP", desc: "Quick help via WhatsApp chat" },
  { label: "HOURS", desc: "Response within 24 hours" },
];
type ContactSupportCfg = { cards: ContactCard[]; cta_label: string };

import { useWebsiteSectionConfig } from "@/lib/websiteSections";

export function ContactSupportSection() {
  const [contact, setContact] = useState<ContactSupport | null>(null);
  const { config: cfg, isVisible: visible } = useWebsiteSectionConfig<ContactSupportCfg>("contact_support", { cards: DEFAULT_CARDS, cta_label: "VISIT SUPPORT PAGE" });
  const heading = useSectionHeading("contact_support", "CONTACT SUPPORT", { eyebrow: "WE'RE HERE" });

  useEffect(() => {
    getBrandSettings().then((b) => {
      setContact({
        enabled: b.support_enabled ?? true,
        email: b.contact_email?.trim() ?? "",
        whatsapp: whatsappHref(b.social_whatsapp),
        hours: b.support_hours?.trim() ?? "",
      });
    });
  }, []);

  if (!visible || !contact?.enabled) return null;

  const cards = [
    { icon: Mail, value: contact.email, href: contact.email ? `mailto:${contact.email}` : null, button: null },
    { icon: WhatsAppIcon, value: "", href: contact.whatsapp, button: "CHAT ON WHATSAPP" },
    { icon: Clock, value: contact.hours, href: null, button: null },
  ]
    .map((item, idx) => ({ ...item, label: cfg.cards[idx]?.label ?? DEFAULT_CARDS[idx].label, desc: cfg.cards[idx]?.desc ?? DEFAULT_CARDS[idx].desc }))
    .filter((item) => item.value || item.href);

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border bg-[#E2E2E4]">
      <div className="max-w-[1280px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12 text-center">
          <span className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2 block">{heading.eyebrow}</span>
          <h2
            className="text-[clamp(2.5rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase text-display"
            style={heading.color ? { color: heading.color } : undefined}
          >
            {heading.text}
          </h2>
        </motion.div>
        <div className={`grid grid-cols-1 ${cards.length === 3 ? "sm:grid-cols-3" : cards.length === 2 ? "sm:grid-cols-2" : ""} gap-5 mb-10`}>
          {cards.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}
              className="border border-border bg-surface/30 p-6 sm:p-8 flex flex-col items-center text-center gap-4">
              <div className="size-12 border border-border flex items-center justify-center">
                <item.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">{item.label}</div>
                {item.button && item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-2.5 mb-2 text-mono text-[11px] font-bold tracking-[0.2em] hover:opacity-85 transition-opacity">
                    <WhatsAppIcon className="size-4" /> {item.button}
                  </a>
                ) : item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="text-sm sm:text-base font-semibold hover:text-primary transition-colors block mb-1">{item.value}</a>
                ) : (
                  <p className="text-sm sm:text-base font-semibold mb-1">{item.value}</p>
                )}
                <p className="text-muted-foreground text-xs text-mono">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <Link to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm tracking-[0.14em] uppercase text-mono hover:opacity-80 transition-opacity">
            {cfg.cta_label} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
