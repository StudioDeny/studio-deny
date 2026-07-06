import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/collaborators/art")({
  component: CollabArt,
  head: () => ({ meta: [{ title: "Art Collaborators — STUDIO DENY" }] }),
});

function CollabArt() {
  return <CollabPage category="ART" desc="We partner with visual artists, illustrators, and graphic designers whose work intersects with street culture." />
}

export function CollabPage({ category, desc }: { category: string; desc: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[1200px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">COLLABORATORS</p>
        <h1 className="text-display text-[clamp(3rem,10vw,7rem)] leading-none tracking-[-0.03em] uppercase mb-6">{category}</h1>
        <p className="text-muted-foreground text-sm sm:text-base text-mono max-w-xl mb-16">{desc}</p>

        {/* Placeholder grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {["COMING SOON", "COMING SOON", "COMING SOON"].map((_, idx) => (
            <div key={idx} className="border border-dashed border-border aspect-[3/4] flex items-center justify-center">
              <span className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground">COMING SOON</span>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-sm text-mono mb-6">
          Interested in collaborating with Studio Deny?
        </p>
        <a href="mailto:collab@studiodeny.in"
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-mono text-xs tracking-widest hover:border-primary hover:text-primary transition-colors">
          GET IN TOUCH <ArrowRight className="size-3" />
        </a>
      </div>
    </div>
  );
}
