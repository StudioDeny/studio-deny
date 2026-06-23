import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ordersFor, type Order } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import {
  isLoyaltyMember,
  pointsFromOrders,
  qualifyingOrderValue,
  tierFor,
  TIERS,
} from "@/lib/loyalty";
import { Trophy, Zap, Gift, Sparkles, Lock, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  component: Rewards,
  head: () => ({ meta: [{ title: "Rewards — STUDIO/DENY" }] }),
});

const TIER_COLORS: Record<string, string> = {
  ROOKIE: "text-muted-foreground",
  RUNNER: "text-blue-400",
  RIOT: "text-primary",
  LEGEND: "text-primary text-glow-primary",
};

function Rewards() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [orders, setOrders] = useState<Order[]>([]);
  const settings = getSettings();

  useEffect(() => {
    if (user) setOrders(ordersFor(user.email));
  }, [user]);

  const { entryThreshold, rupeesPerEarnedPoint, rupeesPerPoint } = settings;
  const member = isLoyaltyMember(orders, entryThreshold);
  const points = pointsFromOrders(orders, rupeesPerEarnedPoint, entryThreshold);
  const redeemValue = points * rupeesPerPoint;
  const tier = tierFor(points);
  const next = [...TIERS].find((t) => t.min > points);
  const pct = next ? Math.min(100, Math.round((points / next.min) * 100)) : 100;

  const bestOrder = qualifyingOrderValue(orders);
  const entryPct = Math.min(100, Math.round((bestOrder / entryThreshold) * 100));

  return (
    <section className="px-4 md:px-8 max-w-6xl mx-auto pb-24">
      {/* Hero */}
      <div className="text-center py-20 md:py-32 border-b border-border mb-16">
        <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-6">◢ THE DENY SYNDICATE</div>
        <h1 className="text-display text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.03em] uppercase max-w-4xl mx-auto mb-8">
          LOYALTY PAYS.
          <br />
          <span className="text-transparent" style={{ WebkitTextStroke: isLight ? "2px rgba(0,0,0,0.55)" : "1px rgba(255,255,255,0.4)" }}>
            EXCLUSIVITY REWARDS.
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto text-mono leading-relaxed mb-10 opacity-80">
          The Deny Syndicate is our private membership program. One qualifying drop unlocks you.
          Earn points on every order after that, and climb the ranks.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {!user ? (
            <>
              <Link to="/login" className="px-8 py-4 bg-foreground text-background text-xs tracking-widest uppercase hover:opacity-80 transition-opacity font-bold text-mono">Join the Syndicate</Link>
              <Link to="/login" className="px-8 py-4 border border-border text-xs tracking-widest uppercase hover:border-foreground transition-colors text-mono">Log In</Link>
            </>
          ) : (
            <Link to="/shop" className="px-10 py-4 bg-foreground text-background text-xs tracking-widest uppercase hover:opacity-80 transition-opacity font-bold text-mono">
              {member ? "Shop to Earn Points" : `Spend ₹${entryThreshold.toLocaleString()} to Unlock`}
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Left: status card */}
        <div className="lg:col-span-7">
          {!user ? (
            <div className="border border-dashed border-border p-12 text-center h-full flex flex-col justify-center items-center">
              <Sparkles className="size-8 text-primary mb-4 opacity-50" />
              <h3 className="text-display text-3xl mb-2 uppercase">Unlock Your Status</h3>
              <p className="text-muted-foreground text-mono text-sm max-w-xs mb-6">
                Log in or create an account to start tracking your points and tier.
              </p>
              <Link to="/login" className="inline-block border border-primary text-primary px-8 py-3 text-mono text-xs tracking-widest uppercase hover:bg-primary/10 transition-colors">→ AUTHENTICATE</Link>
            </div>
          ) : !member ? (
            /* Not yet qualified */
            <div className="border border-border bg-surface/30 p-8 md:p-12 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <Lock className="size-5 text-muted-foreground shrink-0" />
                <div className="text-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase">Not Yet Qualified</div>
              </div>

              <h2 className="text-display text-4xl md:text-5xl uppercase mb-4">
                UNLOCK THE SYNDICATE
              </h2>
              <p className="text-muted-foreground text-mono text-sm leading-relaxed mb-8">
                Place a single order of{" "}
                <span className="text-foreground font-semibold">₹{entryThreshold.toLocaleString()}</span>{" "}
                or more to enter the loyalty pool. Your orders don't stack toward this — it must
                be one single purchase.
              </p>

              {/* Progress toward entry */}
              {bestOrder > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between text-mono text-[11px] tracking-widest text-muted-foreground mb-3">
                    <span>HIGHEST SINGLE ORDER</span>
                    <span>₹{bestOrder.toLocaleString()} / ₹{entryThreshold.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-border overflow-hidden">
                    <div
                      className="h-full bg-muted-foreground transition-all duration-1000 ease-out"
                      style={{ width: `${entryPct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-mono text-[10px] text-muted-foreground">
                    ₹{(entryThreshold - bestOrder).toLocaleString()} away from qualifying
                  </div>
                </div>
              )}

              <div className="mt-auto">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-xs tracking-widest uppercase hover:opacity-80 transition-opacity font-bold text-mono"
                >
                  Shop Now → Qualify
                </Link>
              </div>
            </div>
          ) : (
            /* Qualified member */
            <div className="border border-border bg-surface/30 p-8 md:p-12 h-full">
              <div className="flex items-center gap-3 mb-8">
                <CheckCircle className="size-5 text-emerald-500 shrink-0" />
                <div className="text-mono text-[11px] tracking-[0.25em] text-emerald-600 dark:text-emerald-400 uppercase">Active Member</div>
              </div>

              <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
                <div>
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">CURRENT TIER</div>
                  <div className={`text-display text-5xl md:text-7xl uppercase ${TIER_COLORS[tier.name] ?? ""}`}>
                    {tier.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">POINTS BALANCE</div>
                  <div className="text-display text-5xl md:text-6xl">{points.toLocaleString()}</div>
                  <div className="text-mono text-[11px] text-muted-foreground mt-1">
                    = ₹{redeemValue.toLocaleString()} redeemable
                  </div>
                </div>
              </div>

              {next ? (
                <div>
                  <div className="flex justify-between text-mono text-[11px] tracking-widest text-muted-foreground mb-3">
                    <span className="uppercase">{tier.name}</span>
                    <span className="uppercase">{next.name} · {(next.min - points).toLocaleString()} pts to unlock</span>
                  </div>
                  <div className="h-1.5 bg-border overflow-hidden">
                    <div className="h-full bg-primary glow-primary transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <div className="text-mono text-[11px] tracking-widest text-primary">◆ MAX TIER REACHED</div>
              )}
            </div>
          )}
        </div>

        {/* Right: how it works */}
        <div className="lg:col-span-5 space-y-4">
          {[
            {
              icon: Lock,
              t: "QUALIFY",
              d: `Place a single order of ₹${entryThreshold.toLocaleString()} or more to unlock the loyalty pool. One order, one shot.`,
            },
            {
              icon: Zap,
              t: "EARN",
              d: `Once qualified, earn 1 point for every ₹${rupeesPerEarnedPoint} spent on any order.`,
            },
            {
              icon: Gift,
              t: "REDEEM",
              d: `Each point = ₹${rupeesPerPoint}. Redeem at checkout — no expiry, no catches.`,
            },
            {
              icon: Sparkles,
              t: "PERKS",
              d: "Early drops, secret colorways, free shipping at RIOT+. The higher you climb, the better it gets.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="border border-border bg-surface/10 p-6 flex gap-6 items-center group hover:border-foreground/40 hover:bg-surface/30 transition-colors"
            >
              <div className="size-12 shrink-0 bg-surface/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <c.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-display text-2xl tracking-wider uppercase mb-1">{c.t}</div>
                <p className="text-xs text-muted-foreground text-mono leading-relaxed">{c.d}</p>
              </div>
            </div>
          ))}

          {/* Tier breakdown */}
          <div className="border border-border p-6 space-y-3 bg-surface/20">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-3">TIER BREAKDOWN</div>
            {[...TIERS].map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <span className={`text-mono text-xs tracking-widest ${TIER_COLORS[t.name] ?? ""} ${user && member && tier.name === t.name ? "font-bold" : "opacity-70"}`}>
                  {t.name}
                  {user && member && tier.name === t.name && " ◄ YOU"}
                </span>
                <span className="text-mono text-[10px] text-muted-foreground">
                  {t.min === 0 ? "Entry level" : `${t.min.toLocaleString()} pts`}
                </span>
              </div>
            ))}
          </div>

          {user && member && (
            <div className="mt-2 border border-border p-6 flex items-center gap-4 bg-primary/5">
              <Trophy className="size-6 text-primary shrink-0" />
              <p className="text-xs text-mono text-foreground/80 leading-relaxed">
                {orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED").length} valid order{orders.length === 1 ? "" : "s"} · {points.toLocaleString()} pts total · ₹{redeemValue.toLocaleString()} value
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
