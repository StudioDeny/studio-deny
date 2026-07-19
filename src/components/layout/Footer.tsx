import { Link } from "@tanstack/react-router";
import { Newsletter } from "./Newsletter";
import { Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const cols = [
    {
      h: "BRAND",
      l: [
        { label: "Shop", to: "/shop" },
        { label: "Best Sellers", to: "/shop", search: { featured: "1" } },
        { label: "About", to: "/about" },
        { label: "Lookbook", to: "/lookbook" },
        { label: "Couriers", to: "/couriers" },
        { label: "Contact", to: "/contact" },
        { label: "Rewards", to: "/rewards" },
      ],
    },
    {
      h: "SUPPORT",
      l: [
        { label: "FAQs", to: "/faq" },
        { label: "Returns & Exchange", to: "/returns" },
        { label: "T&C's", to: "/terms" },
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Track Your Order", to: "/track-order" },
      ],
    },
    {
      h: "COLLABORATORS",
      l: [
        { label: "Art", to: "/collaborators/art" },
        { label: "Dance", to: "/collaborators/dance" },
        { label: "Models", to: "/collaborators/models" },
        { label: "Influencers", to: "/collaborators/influencers" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border mt-24" style={{ background: "var(--color-surface)" }}>
      <div className="px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-12 md:gap-16 lg:gap-24 max-w-[1560px] mx-auto">
        {/* Brand column */}
        <div className="md:w-[280px] lg:w-[340px] shrink-0">
          <Link to="/" className="text-display tracking-wider inline-block" style={{ fontSize: "28px" }}>
            STUDIO DENY
          </Link>
          <p className="mt-4 text-muted-foreground leading-relaxed" style={{ fontSize: "13px", maxWidth: "240px" }}>
            Streetwear for the ones who refuse to blend in.
            Made in India. Worn worldwide.
          </p>

          <div className="mt-7">
            <div className="text-mono text-primary mb-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>◢ DROP ALERTS</div>
            <Newsletter />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="Instagram">
              <Instagram className="size-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="Twitter / X">
              <Twitter className="size-4" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
              className="size-9 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label="YouTube">
              <Youtube className="size-4" />
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12">
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-mono text-primary mb-5" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>{c.h}</div>
              <ul className="space-y-3">
                {c.l.map((i) => (
                  <li key={i.label}>
                    <Link
                      to={i.to}
                      search={(i as { search?: Record<string, string> }).search as never}
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

      <div className="border-t border-border px-4 md:px-8 py-6 flex flex-col md:flex-row gap-3 items-center justify-between" style={{ background: "var(--color-muted)" }}>
        <div className="text-mono text-muted-foreground text-center md:text-left" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
          © {new Date().getFullYear()} STUDIO DENY · ALL RIGHTS RESERVED
        </div>
        <div className="text-mono text-muted-foreground text-center" style={{ fontSize: "10px", letterSpacing: "0.18em" }}>
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
        <div className="flex flex-wrap justify-center items-center gap-5 sm:gap-6 text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
          <Link to="/privacy" className="hover:text-foreground transition-colors">PRIVACY</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">TERMS</Link>
        </div>
      </div>
    </footer>
  );
}
