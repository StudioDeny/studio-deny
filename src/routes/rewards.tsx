import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ordersFor, type Order } from "@/lib/orders";
import { Trophy, Zap, Gift, Sparkles } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  component: Rewards,
  head: () => ({ meta: [{ title: "Rewards — STUDIO/DENY" }] }),
});

const TIERS = [
  { name: "ROOKIE", min: 0, color: "text-muted-foreground" },
  { name: "RUNNER", min: 1000, color: "text-secondary" },
  { name: "RIOT", min: 3000, color: "text-primary" },
  { name: "LEGEND", min: 8000, color: "text-primary text-glow-primary" },
];

function Rewards() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => { if (user) setOrders(ordersFor(user.email)); }, [user]);

  const points = Math.round(orders.reduce((s, o) => s + o.total / 10, 0));
  const tier = [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
  const next = TIERS.find((t) => t.min > points);
  const pct = next ? Math.min(100, Math.round((points / next.min) * 100)) : 100;

  return (
    <section className="px-4 md:px-8 max-w-6xl mx-auto pb-24">
      {/* Hero Typography Section */}
      <div className="text-center py-20 md:py-32 border-b border-[rgba(255,255,255,0.1)] mb-16">
        <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-6">◢ THE DENY SYNDICATE</div>
        <h1 className="text-display text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase max-w-4xl mx-auto mb-8">
          LOYALTY PAYS.
          <br />
          <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>
            EXCLUSIVITY REWARDS.
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto text-mono leading-relaxed mb-10 opacity-80">
          The Deny Syndicate is our private membership program. Earn points on every drop, unlock secret colorways, and get early access to limited collections before the world sees them.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {!user ? (
            <>
              <Link to="/login" className="px-8 py-4 bg-white text-black text-xs tracking-widest uppercase hover:bg-white/90 transition-colors font-bold text-mono">Join the Syndicate</Link>
              <Link to="/login" className="px-8 py-4 border border-[rgba(255,255,255,0.2)] text-xs tracking-widest uppercase hover:border-white transition-colors text-mono">Log In</Link>
            </>
          ) : (
            <Link to="/shop" className="px-10 py-4 bg-white text-black text-xs tracking-widest uppercase hover:bg-white/90 transition-colors font-bold text-mono">Shop to Earn Points</Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-8">
        <div className="lg:col-span-7">
          {!user ? (
            <div className="border border-dashed border-[rgba(255,255,255,0.2)] p-12 text-center h-full flex flex-col justify-center items-center">
              <Sparkles className="size-8 text-primary mb-4 opacity-50" />
              <h3 className="text-display text-3xl mb-2 uppercase">Unlock Your Status</h3>
              <p className="text-muted-foreground text-mono text-sm max-w-xs mb-6">Log in or create an account to start tracking your points and tier progression.</p>
              <Link to="/login" className="inline-block border border-primary text-primary px-8 py-3 text-mono text-xs tracking-widest uppercase hover:bg-primary/10 transition-colors">→ AUTHENTICATE</Link>
            </div>
          ) : (
            <div className="border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] p-8 md:p-12 h-full">
              <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
                <div>
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">CURRENT STATUS</div>
                  <div className={`text-display text-5xl md:text-7xl uppercase ${tier.color}`}>{tier.name}</div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">AVAILABLE POINTS</div>
                  <div className="text-display text-5xl md:text-7xl">{points}</div>
                </div>
              </div>

              {next && (
                <div className="mt-auto">
                  <div className="flex justify-between text-mono text-[11px] tracking-widest text-muted-foreground mb-3">
                    <span className="uppercase">{tier.name}</span>
                    <span className="uppercase">{next.name} · {next.min - points} pts to unlock</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(255,255,255,0.1)] overflow-hidden">
                    <div className="h-full bg-primary glow-primary transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          {[
            { icon: Zap, t: "EARN", d: "1 pt for every ₹10 spent. Stacks across the bag." },
            { icon: Gift, t: "REDEEM", d: "100 pts = ₹100 off. No expiry. No catch." },
            { icon: Sparkles, t: "PERKS", d: "Early drops, secret colorways, free shipping at RIOT+." },
          ].map((c) => (
            <div key={c.t} className="border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.01)] p-6 flex gap-6 items-center group hover:border-[rgba(255,255,255,0.3)] transition-colors">
              <div className="size-12 shrink-0 bg-[rgba(255,255,255,0.05)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <c.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-display text-2xl tracking-wider uppercase mb-1">{c.t}</div>
                <p className="text-xs text-muted-foreground text-mono leading-relaxed">{c.d}</p>
              </div>
            </div>
          ))}

          {user && (
            <div className="mt-4 border border-[rgba(255,255,255,0.1)] p-6 flex items-center gap-4 bg-primary/5">
              <Trophy className="size-6 text-primary shrink-0" />
              <p className="text-xs text-mono text-white/80 leading-relaxed">
                {orders.length} verified order{orders.length === 1 ? "" : "s"} found. Keep collecting heat to level up your tier.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
