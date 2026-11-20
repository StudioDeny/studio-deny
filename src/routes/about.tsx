import { createFileRoute } from "@tanstack/react-router";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: buildMeta({
      title: "Our Story — STUDIO DENY",
      description: "Born in a Mumbai garage in 2022. Studio Deny is streetwear for the restless — heavyweight cuts, raw graphics, made in India.",
      url: `${SITE_URL}/about`,
    }),
    links: buildLinks(`${SITE_URL}/about`),
  }),
});

function About() {
  return (
    <section className="px-4 sm:px-8 lg:px-16 mt-8 md:mt-12 max-w-4xl mx-auto">
      <h1 className="type-h2">REFUSE TO<br />BLEND IN.</h1>

      <div className="mt-12 space-y-6 text-muted-foreground leading-relaxed text-lg">
        <p>Studio Deny was born in a Mumbai garage in 2022 — three friends, a screen-printing rig, and a refusal to wear what everyone else was wearing.</p>
        <p>Today we cut, sew, and ship heavyweight streetwear from a small studio in Bandra. Every piece is made in limited runs. When it's gone, it's gone.</p>
        <p className="text-foreground">No fast fashion. No filler drops. No apologies.</p>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-4">
        {[
          { n: "100+", l: "PIECES SHIPPED" },
          { n: "14", l: "DROPS RELEASED" },
          { n: "1", l: "STUDIO IN BANDRA" },
        ].map((s) => (
          <div key={s.l} className="border border-border p-6 bg-surface">
            <div className="text-display text-5xl text-primary">{s.n}</div>
            <div className="text-mono text-xs tracking-widest text-muted-foreground mt-2">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
