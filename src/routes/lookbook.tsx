import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listProducts, type Product } from "@/lib/productsStore";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/lookbook")({
  component: Lookbook,
  head: () => ({
    meta: buildMeta({
      title: "Lookbook — STUDIO/DENY",
      description: "Curated fits and editorial photography from Studio Deny. See how the pieces move, layer, and live.",
      url: `${SITE_URL}/lookbook`,
    }),
    links: buildLinks(`${SITE_URL}/lookbook`),
  }),
});

function Lookbook() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => { listProducts().then(setProducts); }, []);
  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ DROP 014</div>
      <h1 className="text-display text-6xl md:text-9xl mb-10 leading-[0.85]">SHADOW<br />REALM.</h1>

      <div className="grid md:grid-cols-12 gap-3 md:gap-5">
        {products.map((p, i) => {
          const spans = [
            "md:col-span-7 md:row-span-2 aspect-[4/5]",
            "md:col-span-5 aspect-square",
            "md:col-span-5 aspect-[4/3]",
            "md:col-span-4 aspect-[4/5]",
            "md:col-span-4 aspect-[4/5]",
            "md:col-span-4 aspect-[4/5]",
            "md:col-span-6 aspect-[3/2]",
            "md:col-span-6 aspect-[3/2]",
          ];
          return (
            <div key={p.slug} className={`relative overflow-hidden bg-surface group ${spans[i % spans.length]}`}>
              <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-3 left-3 text-display text-2xl text-background bg-foreground px-2 leading-tight">{p.name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
