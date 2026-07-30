import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail, MessageCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSectionHeading } from "@/lib/sectionHeadings";

type ContactSupport = { enabled: boolean; email: string; whatsapp: string; hours: string };
const CONTACT_DEFAULTS: ContactSupport = {
  enabled: true,
  email: "support@studiodeny.in",
  whatsapp: "",
  hours: "Mon–Sat, 10am–7pm IST",
};

export function ContactSupportSection() {
  const [contact, setContact] = useState<ContactSupport>(CONTACT_DEFAULTS);
  const [visible, setVisible] = useState(true);
  const heading = useSectionHeading("contact_support", "CONTACT SUPPORT", { eyebrow: "WE'RE HERE" });

  useEffect(() => {
    supabase
      .from("website_sections")
      .select("is_visible")
      .eq("page_slug", "home")
      .eq("section_type", "contact_support")
      .single()
      .then(({ data }) => { if (data) setVisible((data as { is_visible: boolean }).is_visible); });
  }, []);

  useEffect(() => {
    supabase
      .from("brand_settings")
      .select("contact_email, social_whatsapp, support_hours, support_enabled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setContact({
          enabled: data.support_enabled ?? true,
          email: data.contact_email || CONTACT_DEFAULTS.email,
          whatsapp: data.social_whatsapp || CONTACT_DEFAULTS.whatsapp,
          hours: data.support_hours || CONTACT_DEFAULTS.hours,
        });
      });
  }, []);

  if (!visible || !contact.enabled) return null;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-16 border-t border-border bg-surface/20">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            {
              icon: Mail,
              label: "EMAIL US",
              value: contact.email,
              href: `mailto:${contact.email}`,
              desc: "For order issues, returns & general queries",
            },
            {
              icon: MessageCircle,
              label: "WHATSAPP",
              value: contact.whatsapp,
              href: contact.whatsapp || "https://wa.me/",
              desc: "Quick help via WhatsApp chat",
            },
            {
              icon: Clock,
              label: "HOURS",
              value: contact.hours,
              href: null,
              desc: "Response within 24 hours",
            },
          ].map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}
              className="border border-border bg-surface/30 p-6 sm:p-8 flex flex-col items-center text-center gap-4">
              <div className="size-12 border border-border flex items-center justify-center">
                <item.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">{item.label}</div>
                {item.href ? (
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
            VISIT SUPPORT PAGE <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
