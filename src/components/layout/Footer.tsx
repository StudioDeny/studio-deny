import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Newsletter } from "./Newsletter";
import { Instagram, Youtube, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { NavMenuItem, BrandSettings } from "@/types/database";

type FooterColumn = { h: string; l: NavMenuItem[] };

const DEFAULT_COLS: FooterColumn[] = [
  {
    h: "BRAND",
    l: [
      { label: "Shop", href: "/shop" },
      { label: "Best Sellers", href: "/shop" },
      { label: "About", href: "/about" },
      { label: "Lookbook", href: "/lookbook" },
      { label: "Couriers", href: "/couriers" },
      { label: "Contact", href: "/contact" },
      { label: "Rewards", href: "/rewards" },
    ],
  },
  {
    h: "SUPPORT",
    l: [
      { label: "FAQs", href: "/faq" },
      { label: "Returns & Exchange", href: "/returns" },
      { label: "T&C's", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Track Your Order", href: "/track-order" },
    ],
  },
  {
    h: "COLLABORATORS",
    l: [
      { label: "Art", href: "/collaborators/art" },
      { label: "Dance", href: "/collaborators/dance" },
      { label: "Models", href: "/collaborators/models" },
      { label: "Influencers", href: "/collaborators/influencers" },
    ],
  },
];

const DEFAULT_TAGLINE = "Streetwear for the ones who refuse to blend in.\nMade in India. Worn worldwide.";

export function Footer() {
  const [cols, setCols] = useState<FooterColumn[]>(DEFAULT_COLS);
  const [brand, setBrand] = useState<Partial<BrandSettings>>({});

  useEffect(() => {
    supabase
      .from("navigation_menus")
      .select("items")
      .eq("location", "footer")
      .single()
      .then(({ data }) => {
        const items = (data?.items as NavMenuItem[] | undefined) ?? [];
        if (items.length === 0) return; // keep defaults until an admin actually curates this
        const grouped = new Map<string, NavMenuItem[]>();
        for (const item of items) {
          const key = item.group?.trim() || "MORE";
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(item);
        }
        setCols(Array.from(grouped.entries()).map(([h, l]) => ({ h, l })));
      });

    supabase
      .from("brand_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setBrand(data); });
  }, []);

  const tagline = brand.tagline?.trim() || DEFAULT_TAGLINE;

  return (
    <footer className="border-t border-border mt-24" style={{ background: "var(--color-surface)" }}>
      <div className="px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-12 md:gap-16 lg:gap-24 max-w-[1560px] mx-auto">
        {/* Brand column */}
        <div className="md:w-[280px] lg:w-[340px] shrink-0">
          <Link to="/" className="text-display tracking-wider inline-block" style={{ fontSize: "28px" }}>
            STUDIO DENY
          </Link>
          <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-line" style={{ fontSize: "13px", maxWidth: "240px" }}>
            {tagline}
          </p>

          <div className="mt-7">
            <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>◢ DROP ALERTS</div>
            <Newsletter />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <a href={brand.social_instagram || "https://instagram.com"} target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="Instagram">
              <Instagram className="size-4" />
            </a>
            <a href={brand.social_youtube || "https://youtube.com"} target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="YouTube">
              <Youtube className="size-4" />
            </a>
            <a href={brand.social_whatsapp || "https://wa.me/"} target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="WhatsApp">
              <MessageCircle className="size-4" />
            </a>
          </div>
        </div>

        {/* Link columns — admin-managed via /admin/navigation (footer tab), grouped by
            each item's "group" field. Adding a new group there creates a whole new column. */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12">
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-mono text-primary mb-5" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>{c.h}</div>
              <ul className="space-y-3">
                {c.l.map((i) => (
                  <li key={`${i.label}-${i.href}`}>
                    <Link
                      to={i.href}
                      className="text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 inline-block"
                      style={{ fontSize: "13px" }}
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-4 md:px-8 py-6 flex flex-col md:flex-row flex-wrap gap-3 md:gap-x-6 items-center justify-center md:justify-between" style={{ background: "var(--color-muted)" }}>
        <div className="w-full md:w-auto min-w-0 text-mono text-muted-foreground text-center md:text-left break-words" style={{ fontSize: "10px", letterSpacing: "0.18em" }}>
          DEVELOPED & MAINTAINED BY{" "}
          <a
            href="https://www.artechstudio.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
          >
            ARTECHSTUDIO
          </a>
        </div>
        <div className="w-full md:w-auto min-w-0 text-mono text-muted-foreground text-center break-words" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          © {new Date().getFullYear()} STUDIO DENY · ALL RIGHTS RESERVED
        </div>
        <div className="w-full md:w-auto flex flex-wrap justify-center items-center gap-5 sm:gap-6 text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          <Link to="/privacy" className="hover:text-foreground transition-colors">PRIVACY</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">TERMS</Link>
        </div>
      </div>
    </footer>
  );
}
