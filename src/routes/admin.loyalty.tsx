import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { pointsFromOrders, tierFor, TIERS } from "@/lib/loyalty";
import { formatINR } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/loyalty")({
  component: LoyaltyDash,
});

type SupaMember = {
  user_id: string;
  points: number;
  lifetime_spent: number;
  tier: string;
  email?: string;
};

function LoyaltyDash() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supaMembers, setSupaMembers] = useState<SupaMember[]>([]);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    setOrders(listOrders());
    supabase
      .from("loyalty_balances")
      .select("user_id, points, lifetime_spent, tier")
      .order("points", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setUseSupabase(true);
          const members = data.map((row: any) => ({
            user_id: row.user_id,
            points: row.points,
            lifetime_spent: Number(row.lifetime_spent),
            tier: row.tier,
            email: undefined as string | undefined,
          }));
          // Enrich with profile emails
          supabase
            .from("profiles")
            .select("user_id, email")
            .in("user_id", members.map((m) => m.user_id))
            .then(({ data: profiles }) => {
              const emailMap: Record<string, string> = {};
              (profiles ?? []).forEach((p: any) => { emailMap[p.user_id] = p.email; });
              setSupaMembers(members.map((m) => ({ ...m, email: emailMap[m.user_id] })));
            });
        }
      });
  }, []);

  // localStorage-derived data (fallback)
  const localData = useMemo(() => {
    const byUser: Record<string, Order[]> = {};
    orders.forEach((o) => { (byUser[o.userEmail] ??= []).push(o); });
    const members = Object.entries(byUser).map(([email, os]) => {
      const pts = pointsFromOrders(os);
      return { email, points: pts, tier: tierFor(pts).name, spent: os.reduce((s, o) => s + o.total, 0) };
    });
    const dist: Record<string, number> = {};
    TIERS.forEach((t) => (dist[t.name] = 0));
    members.forEach((m) => (dist[m.tier]++));
    return { members, dist, totalPoints: members.reduce((s, m) => s + m.points, 0) };
  }, [orders]);

  // Supabase-derived distribution
  const supaDist = useMemo(() => {
    const dist: Record<string, number> = {};
    TIERS.forEach((t) => (dist[t.name] = 0));
    supaMembers.forEach((m) => { if (dist[m.tier] !== undefined) dist[m.tier]++; });
    return dist;
  }, [supaMembers]);

  const members = useSupabase
    ? supaMembers.map((m) => ({ email: m.email ?? m.user_id, points: m.points, tier: m.tier, spent: m.lifetime_spent }))
    : localData.members;
  const dist = useSupabase ? supaDist : localData.dist;
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const max = Math.max(1, ...Object.values(dist));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-4xl md:text-5xl">LOYALTY.</h1>
        {useSupabase && (
          <span className="text-mono text-[10px] tracking-widest text-primary border border-primary/30 px-3 py-1">LIVE DATA</span>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card label="MEMBERS" v={members.length} />
        <Card label="POINTS ISSUED" v={totalPoints.toLocaleString()} />
        <Card label="REDEEM VALUE" v={formatINR(totalPoints)} />
      </div>

      <div className="border border-border bg-surface p-5">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-4">TIER DISTRIBUTION</div>
        <div className="space-y-3">
          {TIERS.map((t) => (
            <div key={t.name}>
              <div className="flex justify-between text-mono text-xs mb-1"><span>{t.name}</span><span>{dist[t.name] ?? 0}</span></div>
              <div className="h-2 bg-muted overflow-hidden">
                <div className="h-full bg-primary glow-primary" style={{ width: `${((dist[t.name] ?? 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-display text-2xl tracking-wider mt-10 mb-4">TOP MEMBERS</h2>
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">CUSTOMER</th>
              <th className="text-left p-3">POINTS</th>
              <th className="text-left p-3">SPENT</th>
              <th className="text-left p-3">TIER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...members].sort((a, b) => b.points - a.points).slice(0, 20).map((m, i) => (
              <tr key={m.email + i}>
                <td className="p-3 text-muted-foreground text-xs">{m.email}</td>
                <td className="p-3 text-mono text-xs">{m.points.toLocaleString()} pts</td>
                <td className="p-3 text-mono text-xs">{formatINR(m.spent)}</td>
                <td className="p-3">
                  <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-secondary text-secondary">{m.tier}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="text-muted-foreground text-sm p-5">No loyalty members yet.</p>
        )}
      </div>
    </div>
  );
}

function Card({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{label}</div>
      <div className="text-display text-3xl mt-2">{v}</div>
    </div>
  );
}
