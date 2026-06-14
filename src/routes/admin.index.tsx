import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { listProducts } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";
import { TrendingUp, Package, ShoppingBag, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => setOrders(listOrders()), []);

  const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const customers = new Set(orders.map((o) => o.userEmail)).size;
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;

  const stats = [
    { label: "REVENUE", value: formatINR(revenue), icon: TrendingUp },
    { label: "ORDERS", value: orders.length, icon: ShoppingBag },
    { label: "PRODUCTS", value: listProducts().length, icon: Package },
    { label: "CUSTOMERS", value: customers, icon: Users },
  ];

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">DASHBOARD.</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{s.label}</div>
              <s.icon className="size-4 text-primary" />
            </div>
            <div className="text-display text-3xl mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-border bg-surface p-5">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground">AVG ORDER VALUE</div>
        <div className="text-display text-3xl">{formatINR(aov)}</div>
      </div>

      <h2 className="text-display text-2xl tracking-wider mt-10 mb-4">RECENT ORDERS</h2>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No orders yet. Place a test order from the storefront.</p>
      ) : (
        <ul className="border border-border bg-surface divide-y divide-border">
          {orders.slice(0, 8).map((o) => (
            <li key={o.id} className="p-4 flex items-center justify-between text-sm flex-wrap gap-3">
              <div className="text-mono text-xs">{o.order_number ?? o.id}</div>
              <div className="text-muted-foreground">{o.userEmail}</div>
              <div>{o.items.length} item(s)</div>
              <div className="text-mono">{formatINR(o.total)}</div>
              <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-secondary text-secondary">{o.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
