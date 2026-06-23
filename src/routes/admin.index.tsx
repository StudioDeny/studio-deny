import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { listAllAdminProducts } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";
import { TrendingUp, Package, ShoppingBag, Users } from "lucide-react";

const ORDER_STATUS_COLOR: Record<string, string> = {
  PLACED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PACKED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  SHIPPED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  useEffect(() => {
    setOrders(listOrders());
    listAllAdminProducts().then((p) => setProductCount(p.length));
  }, []);

  const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const customers = new Set(orders.map((o) => o.userEmail)).size;
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;

  const stats = [
    { label: "REVENUE", value: formatINR(revenue), icon: TrendingUp },
    { label: "ORDERS", value: orders.length, icon: ShoppingBag },
    { label: "PRODUCTS", value: productCount, icon: Package },
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
              <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${ORDER_STATUS_COLOR[o.status] ?? "bg-muted text-muted-foreground"}`}>{o.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
