import { createFileRoute } from "@tanstack/react-router";
import { Truck, Clock, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/couriers")({
  component: Couriers,
  head: () => ({ meta: [{ title: "Shipping & Couriers — STUDIO DENY" }] }),
});

function Couriers() {
  const partners = [
    { name: "Delhivery", coverage: "Pan India", speed: "3–5 business days", express: "1–2 days (metro)" },
    { name: "Blue Dart", coverage: "Metro & Tier-1 Cities", speed: "2–3 business days", express: "Next day available" },
    { name: "DTDC", coverage: "Pan India", speed: "3–6 business days", express: "N/A" },
    { name: "Shiprocket", coverage: "International", speed: "7–14 business days", express: "Express on select countries" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[900px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">DELIVERY</p>
        <h1 className="text-display text-[clamp(3rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase mb-4">SHIPPING &<br />COURIERS</h1>
        <p className="text-muted-foreground text-sm text-mono mb-12 max-w-xl">We ship pan India and to select international destinations through our trusted courier partners.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {[
            { icon: Truck, title: "FREE SHIPPING", desc: "On all orders above ₹2,499" },
            { icon: Clock, title: "PROCESSING TIME", desc: "Orders dispatched within 24–48 hours of placement" },
            { icon: MapPin, title: "PAN INDIA DELIVERY", desc: "We deliver to 19,000+ pin codes across India" },
            { icon: ShieldCheck, title: "INSURED SHIPMENTS", desc: "All orders are insured against damage and loss" },
          ].map((item, idx) => (
            <div key={idx} className="border border-border bg-surface/30 p-6 flex items-start gap-4">
              <div className="size-10 border border-border flex items-center justify-center shrink-0">
                <item.icon className="size-4 text-primary" />
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-[0.2em] mb-1">{item.title}</div>
                <p className="text-muted-foreground text-sm text-mono">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-mono text-[11px] tracking-[0.25em] text-primary mb-5">COURIER PARTNERS</h2>
        <div className="border border-border divide-y divide-border">
          <div className="grid grid-cols-4 gap-4 p-4 text-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            <div>COURIER</div><div>COVERAGE</div><div>STANDARD</div><div>EXPRESS</div>
          </div>
          {partners.map((p) => (
            <div key={p.name} className="grid grid-cols-4 gap-4 p-4 text-sm">
              <div className="font-semibold">{p.name}</div>
              <div className="text-muted-foreground text-xs text-mono">{p.coverage}</div>
              <div className="text-muted-foreground text-xs text-mono">{p.speed}</div>
              <div className="text-muted-foreground text-xs text-mono">{p.express}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-muted-foreground text-xs text-mono">
          Delivery times are estimates and may vary during peak periods or due to unforeseen circumstances. For specific tracking, use the order confirmation email sent after dispatch.
        </p>
      </div>
    </div>
  );
}
