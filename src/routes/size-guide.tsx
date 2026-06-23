import { createFileRoute } from "@tanstack/react-router";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/size-guide")({
  component: SizeGuide,
  head: () => ({
    meta: buildMeta({
      title: "Size Guide — STUDIO DENY",
      description: "Exact measurements in cm for every Studio Deny piece. Our cuts run oversized — find your perfect fit before you drop.",
      url: `${SITE_URL}/size-guide`,
    }),
    links: buildLinks(`${SITE_URL}/size-guide`),
  }),
});

const TOPS = [
  { size: "S", chest: 108, length: 70, shoulder: 52 },
  { size: "M", chest: 114, length: 72, shoulder: 55 },
  { size: "L", chest: 120, length: 74, shoulder: 58 },
  { size: "XL", chest: 126, length: 76, shoulder: 61 },
  { size: "XXL", chest: 132, length: 78, shoulder: 64 },
];
const BOTTOMS = [
  { size: "28", waist: 71, hip: 96, inseam: 76 },
  { size: "30", waist: 76, hip: 101, inseam: 77 },
  { size: "32", waist: 81, hip: 106, inseam: 78 },
  { size: "34", waist: 86, hip: 111, inseam: 79 },
  { size: "36", waist: 91, hip: 116, inseam: 80 },
];

function Table({ title, rows, cols }: { title: string; rows: Record<string, string | number>[]; cols: string[] }) {
  return (
    <div>
      <h2 className="text-display text-3xl tracking-wider mb-3">{title}</h2>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-mono text-xs">
          <thead className="bg-surface text-muted-foreground tracking-widest">
            <tr>{cols.map((c) => <th key={c} className="text-left p-3 uppercase">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted">
                {cols.map((c) => <td key={c} className="p-3">{r[c]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SizeGuide() {
  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-4xl mx-auto space-y-10">
      <div>
        <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ FIT GUIDE</div>
        <h1 className="text-display text-5xl md:text-7xl">SIZE GUIDE.</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">
          All measurements in centimeters. Our cuts run oversized — when in doubt, take your usual size for a relaxed fit, or size down for a true-to-body cut.
        </p>
      </div>
      <Table title="TOPS" rows={TOPS} cols={["size", "chest", "length", "shoulder"]} />
      <Table title="BOTTOMS" rows={BOTTOMS} cols={["size", "waist", "hip", "inseam"]} />
      <div className="border border-border p-5 text-sm text-muted-foreground">
        <span className="text-foreground font-semibold">Still unsure?</span> DM us on Instagram @studiodeny or hit the WhatsApp button — we'll size you in under a minute.
      </div>
    </section>
  );
}
