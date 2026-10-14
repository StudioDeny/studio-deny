// The customer's loyalty status on their account page: member or not (and
// what it takes to join), tier, points, progress to the next tier, and the
// % off each tier gives. Same rules as checkout (src/lib/loyalty.ts, and
// customer_loyalty_discount() on the server).
import { formatINR } from "@/context/CartContext";
import { TIERS, isLoyaltyMember, pointsFromOrders, qualifyingOrderValue, tierFor } from "@/lib/loyalty";
import type { Order } from "@/lib/orders";
import type { LoyaltySettings } from "@/lib/settings";

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-border mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function LoyaltyCard({ orders, settings }: { orders: Order[]; settings: LoyaltySettings }) {
  const member = isLoyaltyMember(orders, settings.entryThreshold);
  const points = pointsFromOrders(orders, settings.rupeesPerEarnedPoint, settings.entryThreshold);
  const tier = tierFor(points);
  const next = TIERS[TIERS.findIndex((t) => t.name === tier.name) + 1];
  const pct = settings.discount[tier.name] ?? 0;
  const biggest = qualifyingOrderValue(orders);

  return (
    <div className="border border-border bg-surface grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-border">
        {member ? (
          <>
            <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground">YOUR TIER</div>
            <div className="text-display text-5xl mt-1">{tier.name}</div>
            <div className="text-mono text-sm mt-2">
              <span className="font-semibold">{points.toLocaleString("en-IN")}</span> POINTS
              {pct > 0 && <span className="text-muted-foreground"> · {pct}% OFF EVERY ORDER</span>}
            </div>
            <div className="mt-5">
              {next ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    {(next.min - points).toLocaleString("en-IN")} more points to <span className="text-foreground font-semibold">{next.name}</span>
                    {(settings.discount[next.name] ?? 0) > pct && ` (${settings.discount[next.name]}% off)`}
                  </div>
                  <Bar value={(points - tier.min) / (next.min - tier.min)} />
                </>
              ) : (
                <div className="text-xs text-muted-foreground">You're at the top tier.</div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              You earn 1 point for every {formatINR(settings.rupeesPerEarnedPoint)} you spend. Your discount is taken off automatically at checkout.
            </p>
          </>
        ) : (
          <>
            <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground">STATUS</div>
            <div className="text-display text-4xl mt-1">NOT A MEMBER YET</div>
            {settings.entryThreshold > 0 ? (
              <>
                <p className="text-sm mt-2">
                  Place one order of <span className="font-semibold">{formatINR(settings.entryThreshold)}</span> or more to join.
                </p>
                <div className="mt-5">
                  <div className="text-xs text-muted-foreground">
                    Your biggest order so far: <span className="text-foreground font-semibold">{formatINR(biggest)}</span>
                  </div>
                  <Bar value={biggest / settings.entryThreshold} />
                </div>
              </>
            ) : (
              <p className="text-sm mt-2">Place your first order to join.</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-4">
              Members earn 1 point for every {formatINR(settings.rupeesPerEarnedPoint)} spent and unlock a discount on every order as they move up.
            </p>
          </>
        )}
      </div>

      <div className="p-5 md:p-6">
        <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">TIERS</div>
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIERS.map((t) => {
            const current = member && t.name === tier.name;
            return (
              <li
                key={t.name}
                aria-current={current ? "step" : undefined}
                className={`border p-3 ${current ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
              >
                <div className="text-mono text-[11px] tracking-[0.2em] font-semibold">{t.name}</div>
                <div className={`text-[11px] mt-1 ${current ? "opacity-80" : "text-muted-foreground"}`}>
                  {t.min === 0 ? "On joining" : `${t.min.toLocaleString("en-IN")}+ points`}
                </div>
                <div className="text-display text-2xl mt-2">{settings.discount[t.name] ?? 0}%</div>
                <div className={`text-[10px] text-mono tracking-widest ${current ? "opacity-80" : "text-muted-foreground"}`}>OFF</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
