import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getBrandSettings, whatsappHref } from "@/lib/brand";
import type { BrandSettings } from "@/types/database";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: buildMeta({
      title: "Contact Us — STUDIO DENY",
      description: "Get in touch with Studio Deny. For orders, collabs, wholesale, and press — we reply within 24 hours.",
      url: `${SITE_URL}/contact`,
    }),
    links: buildLinks(`${SITE_URL}/contact`),
  }),
});

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
});
type V = z.infer<typeof schema>;

function Contact() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) });
  // Contact details from Admin → Settings.
  const [brand, setBrand] = useState<Partial<BrandSettings> | null>(null);
  useEffect(() => { getBrandSettings().then(setBrand); }, []);
  const email = brand?.contact_email?.trim();
  const phone = brand?.contact_phone?.trim();
  const whatsapp = whatsappHref(brand?.social_whatsapp);
  const address = brand?.address?.trim();

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-5xl mx-auto">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ TALK TO US</div>
      <h1 className="text-display text-6xl md:text-8xl">CONTACT.</h1>

      <div className="grid md:grid-cols-2 gap-12 mt-12">
        <div className="space-y-6">
          {email && (
            <div className="flex gap-3">
              <Mail className="size-5 text-primary mt-1" />
              <div className="min-w-0">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground">EMAIL</div>
                <a href={`mailto:${email}`} className="hover:text-primary break-words">{email}</a>
              </div>
            </div>
          )}
          {phone && (
            <div className="flex gap-3">
              <Phone className="size-5 text-primary mt-1" />
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground">PHONE</div>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-primary">{phone}</a>
              </div>
            </div>
          )}
          {whatsapp && (
            <div className="flex gap-3">
              <MessageCircle className="size-5 text-primary mt-1" />
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">WHATSAPP</div>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 text-mono text-[11px] font-bold tracking-[0.2em] hover:opacity-85 transition-opacity">
                  <MessageCircle className="size-4" /> CHAT ON WHATSAPP
                </a>
              </div>
            </div>
          )}
          {address && (
            <div className="flex gap-3">
              <MapPin className="size-5 text-primary mt-1" />
              <div className="min-w-0">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground">STUDIO</div>
                <div className="whitespace-pre-line break-words">{address}</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit((d) => { console.log(d); toast.success("Message sent"); setSent(true); reset(); })} className="space-y-4">
          <div>
            <label className="text-mono text-[10px] tracking-widest text-muted-foreground">NAME</label>
            <input {...register("name")} className="mt-1 w-full bg-surface border border-border h-11 px-3 focus:border-primary outline-none" />
            {errors.name && <p className="text-xs text-primary mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-mono text-[10px] tracking-widest text-muted-foreground">EMAIL</label>
            <input {...register("email")} type="email" className="mt-1 w-full bg-surface border border-border h-11 px-3 focus:border-primary outline-none" />
            {errors.email && <p className="text-xs text-primary mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-mono text-[10px] tracking-widest text-muted-foreground">MESSAGE</label>
            <textarea {...register("message")} rows={5} className="mt-1 w-full bg-surface border border-border p-3 focus:border-primary outline-none" />
            {errors.message && <p className="text-xs text-primary mt-1">{errors.message.message}</p>}
          </div>
          <button className="w-full bg-primary text-primary-foreground font-bold tracking-[0.2em] text-mono text-xs h-12 hover:glow-primary">SEND →</button>
          {sent && <p className="text-secondary text-mono text-[11px] tracking-widest">✓ MESSAGE SENT</p>}
        </form>
      </div>
    </section>
  );
}
