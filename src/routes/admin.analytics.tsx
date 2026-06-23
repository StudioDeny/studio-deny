import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { listAllAdminProducts, type Product } from "@/lib/productsStore";

export const Route = createFileRoute("/admin/analytics")({
  component: Analytics,
});

function Analytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inv, setInv] = useState<Product[]>([]);
  useEffect(() => { setOrders(listOrders()); listAllAdminProducts().then(setInv); }, []);

  const m = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
    const revenue = valid.reduce((s, o) => s + o.total, 0);
    const refunded = orders.filter((o) => o.status === "REFUNDED").reduce((s, o) => s + (o.refundAmount ?? 0), 0);
    const aov = valid.length ? revenue / valid.length : 0;
    const customers = new Set(orders.map((o) => o.userEmail));
    const repeat = [...customers].filter((e) => orders.filter((o) => o.userEmail === e).length > 1).length;

    // Top products
    const tally: Record<string, { name: string; qty: number; rev: number }> = {};
    valid.forEach((o) => o.items.forEach((it) => {
      const k = it.slug;
      tally[k] ??= { name: it.name, qty: 0, rev: 0 };
      tally[k].qty += it.qty;
      tally[k].rev += it.qty * it.price;
    }));
    const top = Object.values(tally).sort((a, b) => b.rev - a.rev).slice(0, 5);

    // Last 7 days
    const days: { d: string; rev: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - i);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const rev = valid.filter((o) => o.createdAt >= start.getTime() && o.createdAt < end.getTime()).reduce((s, o) => s + o.total, 0);
      days.push({ d: start.toLocaleDateString(undefined, { weekday: "short" }), rev });
    }
    const max = Math.max(1, ...days.map((d) => d.rev));

    const lowStock = inv.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const sold = inv.filter((p) => p.stock === 0).length;

    return { revenue, refunded, aov, customers: customers.size, repeat, top, days, max, lowStock, sold, totalOrders: orders.length };
  }, [orders, inv]);

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">ANALYTICS.</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="NET REVENUE" v={formatINR(m.revenue - m.refunded)} />
        <Stat label="GROSS REVENUE" v={formatINR(m.revenue)} />
        <Stat label="AOV" v={formatINR(Math.round(m.aov))} />
        <Stat label="ORDERS" v={m.totalOrders} />
        <Stat label="CUSTOMERS" v={m.customers} />
        <Stat label="REPEAT BUYERS" v={m.repeat} />
        <Stat label="LOW STOCK" v={m.lowStock} />
        <Stat label="SOLD OUT" v={m.sold} />
      </div>

      <div className="mt-8 border border-border bg-surface p-5">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-4">REVENUE · LAST 7 DAYS</div>
        <div className="flex items-end gap-3 h-40">
          {m.days.map((d) => (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-mono text-[10px] text-muted-foreground">{formatINR(d.rev)}</div>
              <div className="w-full bg-primary glow-primary transition-all" style={{ height: `${(d.rev / m.max) * 100}%`, minHeight: 2 }} />
              <div className="text-mono text-[10px] tracking-widest">{d.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border border-border bg-surface p-5">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-3">TOP PRODUCTS</div>
        {m.top.length === 0 ? <p className="text-muted-foreground text-sm">No sales yet.</p> : (
          <ul className="divide-y divide-border">
            {m.top.map((t) => (
              <li key={t.name} className="py-2 flex justify-between text-sm">
                <span>{t.name} <span className="text-mono text-[10px] text-muted-foreground">× {t.qty}</span></span>
                <span className="text-mono">{formatINR(t.rev)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{label}</div>
      <div className="text-display text-3xl mt-2">{v}</div>
    </div>
  );
}
