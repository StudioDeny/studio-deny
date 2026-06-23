import { createFileRoute } from "@tanstack/react-router";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";

const sections = [
  {
    title: "SHIPPING",
    body: "Orders dispatch within 48 hours from our Mumbai studio. Free standard shipping on orders above ₹999. Express (2-day) available at checkout. International shipping to 30+ countries — duties calculated at checkout.",
  },
  {
    title: "RETURNS & EXCHANGES",
    body: "7-day no-questions return window from delivery. Items must be unworn, unwashed, with original tags. Sale items final. Initiate returns from your account → orders.",
  },
  {
    title: "PRIVACY",
    body: "We collect only what's needed to ship and serve you. We don't sell your data. Read full policy or write to privacy@studiodeny.com.",
  },
  {
    title: "TERMS",
    body: "By using this site you agree to our terms. Pricing, stock, and drops can change without notice. Limited runs — when it's gone, it's gone.",
  },
];

export const Route = createFileRoute("/policies")({
  component: Policies,
  head: () => ({
    meta: buildMeta({
      title: "Shipping, Returns & Privacy — STUDIO DENY",
      description: "Free shipping over ₹999. 7-day returns. International shipping to 30+ countries. Full Studio Deny policies.",
      url: `${SITE_URL}/policies`,
    }),
    links: buildLinks(`${SITE_URL}/policies`),
  }),
});

function Policies() {
  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-3xl mx-auto">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ THE FINE PRINT</div>
      <h1 className="text-display text-6xl md:text-8xl mb-12">POLICIES.</h1>
      <div className="space-y-10">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-display text-3xl tracking-wider text-primary">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed mt-3">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
