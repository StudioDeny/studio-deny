import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { pointsFromOrders, tierFor } from "@/lib/loyalty";

export const Route = createFileRoute("/admin/customers")({
  component: Customers,
});

function Customers() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => setOrders(listOrders()), []);

  const rows = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach((o) => { (map[o.userEmail] ??= []).push(o); });
    return Object.entries(map).map(([email, os]) => {
      const spent = os.filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
      const pts = pointsFromOrders(os);
      return { email, orders: os.length, spent, points: pts, tier: tierFor(pts).name, last: Math.max(...os.map((o) => o.createdAt)) };
    }).sort((a, b) => b.spent - a.spent);
  }, [orders]);

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">CUSTOMERS.</h1>
      {rows.length === 0 ? <p className="text-muted-foreground text-sm">No customers yet.</p> : (
        <div className="border border-border bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">EMAIL</th>
                <th className="text-left p-3">ORDERS</th>
                <th className="text-left p-3">SPENT</th>
                <th className="text-left p-3">POINTS</th>
                <th className="text-left p-3">TIER</th>
                <th className="text-left p-3">LAST ORDER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.email}>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3 text-mono">{r.orders}</td>
                  <td className="p-3 text-mono">{formatINR(r.spent)}</td>
                  <td className="p-3 text-mono">{r.points}</td>
                  <td className="p-3"><span className="text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{r.tier}</span></td>
                  <td className="p-3 text-mono text-xs text-muted-foreground">{new Date(r.last).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
