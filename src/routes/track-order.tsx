import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/track-order")({
  component: TrackOrder,
  head: () => ({ meta: [{ title: "Track Your Order — STUDIO DENY" }] }),
});

function TrackOrder() {
  const [orderId, setOrderId] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[640px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">ORDER STATUS</p>
        <h1 className="text-display text-[clamp(3rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase mb-4">TRACK YOUR<br />ORDER</h1>
        <p className="text-muted-foreground text-sm text-mono mb-10">Enter your order ID or the email used at checkout to see your order status and tracking details.</p>

        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">ORDER ID</div>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="SD-2025-XXXXXX"
              className="w-full bg-background border border-border h-12 px-4 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </label>
          <button type="submit"
            className="w-full bg-foreground text-background h-12 text-mono text-xs tracking-widest inline-flex items-center justify-center gap-2 hover:opacity-80 transition-opacity">
            <Search className="size-4" /> TRACK ORDER
          </button>
        </form>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-muted-foreground text-sm text-mono mb-4">Or check your order history in your account.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/account"
              className="inline-flex items-center gap-2 text-mono text-xs tracking-widest border border-border px-5 h-10 hover:border-primary hover:text-primary transition-colors">
              MY ACCOUNT <ArrowRight className="size-3" />
            </Link>
            <Link to="/contact"
              className="inline-flex items-center gap-2 text-mono text-xs tracking-widest border border-border px-5 h-10 hover:border-primary hover:text-primary transition-colors">
              CONTACT SUPPORT <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
