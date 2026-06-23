import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ordersFor, cancelOrder, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { LogOut, ShieldCheck, FileText, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Account — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

function Account() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else setOrders(ordersFor(user.email));
  }, [user, loading, navigate]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-mono text-xs tracking-widest text-muted-foreground">LOADING…</div>;
  if (!user) return null;

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ MEMBER</div>
          <h1 className="text-display text-5xl md:text-7xl">HELLO, {user.name.toUpperCase()}.</h1>
          <p className="text-muted-foreground text-sm mt-2">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link to="/admin" className="border border-primary text-primary px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:bg-primary hover:text-primary-foreground">
              <ShieldCheck className="size-4" /> ADMIN
            </Link>
          )}
          <button onClick={async () => { await logout(); navigate({ to: "/" }); }} className="border border-border px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            <LogOut className="size-4" /> LOG OUT
          </button>
        </div>
      </div>

      <h2 className="text-display text-3xl tracking-wider mb-4">ORDERS</h2>
      {orders.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary hover:underline">→ START SHOPPING</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="border border-border bg-surface p-4 flex flex-wrap items-center gap-4 justify-between hover:border-primary transition-colors">
              <div>
                <div className="text-mono text-xs">{o.order_number ?? o.id}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-1">
                {o.items.slice(0, 4).map((it) => (
                  <div key={it.slug + it.size} className="w-10 h-12 bg-muted overflow-hidden"><img src={it.image} alt="" className="w-full h-full object-cover" /></div>
                ))}
              </div>
              <div className="text-mono">{formatINR(o.total)}</div>
              <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${
                o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : o.status === "SHIPPED" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : o.status === "PACKED" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : o.status === "PLACED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                : o.status === "REFUNDED" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}>{o.status}</span>
              <div className="flex gap-3 items-center">
                <Link to="/invoice/$id" params={{ id: o.id }} title="Invoice" className="text-muted-foreground hover:text-primary"><FileText className="size-4" /></Link>
                {(o.status === "PLACED" || o.status === "PACKED") && (
                  <button title="Cancel" onClick={() => {
                    if (!confirm("Cancel this order?")) return;
                    cancelOrder(o.id);
                    setOrders(ordersFor(user.email));
                    toast.success("Order cancelled");
                  }} className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
                )}
                <Link to="/order/$id" params={{ id: o.id }} className="text-mono text-[11px] tracking-widest text-primary hover:underline">VIEW →</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
