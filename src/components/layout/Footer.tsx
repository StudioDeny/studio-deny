import { Link } from "@tanstack/react-router";
import { Newsletter } from "./Newsletter";
import { Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const cols: { h: string; l: { label: string; to: string; search?: Record<string, string> }[] }[] = [
    { h: "SHOP", l: [
      { label: "New Drops", to: "/shop" },
      { label: "Tops", to: "/shop", search: { cat: "Tops" } },
      { label: "Bottoms", to: "/shop", search: { cat: "Bottoms" } },
      { label: "Outerwear", to: "/shop", search: { cat: "Outerwear" } },
      { label: "Accessories", to: "/shop", search: { cat: "Accessories" } },
      { label: "Sale", to: "/shop", search: { sale: "1" } },
    ]},
    { h: "BRAND", l: [
      { label: "About", to: "/about" },
      { label: "Lookbook", to: "/lookbook" },
      { label: "Contact", to: "/contact" },
      { label: "Policies", to: "/policies" },
    ]},
    { h: "HELP", l: [
      { label: "FAQ", to: "/faq" },
      { label: "Size Guide", to: "/size-guide" },
      { label: "Refer & Earn", to: "/refer" },
      { label: "Rewards", to: "/rewards" },
      { label: "My Orders", to: "/account" },
    ]},
  ];

  return (
    <footer className="border-t border-border mt-24" style={{ background: "var(--color-surface)" }}>
      {/* Upper section */}
      <div className="px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-12 md:gap-16 lg:gap-24 max-w-[1560px] mx-auto">
        {/* Brand column */}
        <div className="md:w-[280px] lg:w-[340px] shrink-0">
          <Link to="/" className="text-display tracking-wider inline-block" style={{ fontSize: "28px" }}>
            STUDIO<span className="text-primary text-glow-primary">/</span>DENY
          </Link>
          <p className="mt-4 text-muted-foreground leading-relaxed" style={{ fontSize: "13px", maxWidth: "240px" }}>
            Streetwear for the ones who refuse to blend in.
            Made in India. Worn worldwide.
          </p>

          {/* Newsletter */}
          <div className="mt-7">
            <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
              ◢ DROP ALERTS
            </div>
            <Newsletter />
          </div>

          {/* Socials */}
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              aria-label="Twitter / X"
            >
              <Twitter className="size-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              aria-label="YouTube"
            >
              <Youtube className="size-4" />
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12">
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-mono text-primary mb-5" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
                {c.h}
              </div>
              <ul className="space-y-3">
                {c.l.map((i) => (
                  <li key={i.label}>
                    <Link to={i.to} search={i.search as never} className="text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 inline-block" style={{ fontSize: "13px" }}>
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t border-border px-4 md:px-8 py-6 flex flex-col md:flex-row gap-4 items-center justify-between"
        style={{ background: "var(--color-muted)" }}
      >
        <div className="text-mono text-muted-foreground text-center md:text-left" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
          © {new Date().getFullYear()} STUDIO/DENY · ALL RIGHTS RESERVED
        </div>
        <div className="flex flex-wrap justify-center items-center gap-5 sm:gap-6 text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          <a href="/policies" className="hover:text-foreground transition-colors">PRIVACY</a>
          <a href="/policies" className="hover:text-foreground transition-colors">TERMS</a>
          <Link to="/admin" className="hover:text-primary transition-colors">BUILT IN THE DARK</Link>
        </div>
      </div>
    </footer>
  );
}
