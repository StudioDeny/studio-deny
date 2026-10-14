import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listOrders, setPickupCollected, isStorePickup, isPickupOverdue, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/admin/store-pickups")({
  component: StorePickups,
});

type Filter = "pending" | "collected" | "all";
const DAY_MS = 24 * 60 * 60 * 1000;
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const closed = (o: Order) => o.status === "CANCELLED" || o.status === "REFUNDED";

// Store pickup orders: paid online, collected at the store. Nothing here
// ships or changes the order status — collecting just records the date.
function StorePickups() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setOrders((await listOrders()).filter(isStorePickup));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isPending = (o: Order) => !o.collectedAt && !closed(o);
  const counts = {
    pending: orders.filter(isPending).length,
    collected: orders.filter((o) => !!o.collectedAt).length,
    all: orders.length,
  };

  const visible = useMemo(() => {
    const t = search.trim().toLowerCase();
    return orders
      .filter((o) => (filter === "pending" ? isPending(o) : filter === "collected" ? !!o.collectedAt : true))
      .filter((o) => !t || [o.order_number, o.id, o.address?.name, o.address?.phone, o.userEmail].some((v) => (v ?? "").toLowerCase().includes(t)))
      // Pending: soonest collect-by first. Otherwise newest first.
      .sort((a, b) => (filter === "pending" ? (a.pickupDueAt ?? 0) - (b.pickupDueAt ?? 0) : b.createdAt - a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, filter, search]);

  const mark = async (o: Order, collected: boolean) => {
    setBusy(o.id);
    try {
      await setPickupCollected(o.id, collected);
      toast.success(collected ? `${o.order_number ?? o.id} marked collected` : `${o.order_number ?? o.id} back to pending`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">STORE PICKUPS.</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Paid online, collected at the store. The collect-by date is 7 days after the order. When the customer collects, press
        <span className="text-mono text-xs"> MARK COLLECTED</span> — nothing is shipped and no shipping message is sent.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex border border-border">
          {(["pending", "collected", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 h-9 text-mono text-[11px] tracking-widest border-r border-border last:border-r-0 ${filter === f ? "bg-foreground text-background" : "hover:text-primary"}`}
            >
              {f.toUpperCase()} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order, name or phone"
            className="h-9 w-64 pl-8 pr-3 border border-border bg-background text-sm outline-none focus:border-foreground"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          {orders.length === 0 ? "No store pickup orders yet." : "Nothing here."}
        </p>
      ) : (
        <div className="border border-border bg-surface overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">ORDER</th>
                <th className="text-left p-3">CUSTOMER</th>
                <th className="text-left p-3">ITEMS</th>
                <th className="text-left p-3">PAID</th>
                <th className="text-left p-3">COLLECT BY</th>
                <th className="text-left p-3">STATUS</th>
                <th className="text-right p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((o) => {
                const overdue = isPickupOverdue(o);
                const daysLate = overdue && o.pickupDueAt ? Math.ceil((Date.now() - o.pickupDueAt) / DAY_MS) : 0;
                return (
                  <tr key={o.id} className="align-top">
                    <td className="p-3">
                      <Link to="/admin/invoice/$id" params={{ id: o.id }} className="text-mono text-xs hover:text-primary">{o.order_number ?? o.id}</Link>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(o.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{o.address?.name}</div>
                      <div className="text-xs text-muted-foreground">{o.address?.phone}</div>
                      <div className="text-xs text-muted-foreground">{o.userEmail}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {o.items.slice(0, 3).map((it, i) => (
                        <div key={i}>{it.name}{it.size ? ` · ${it.size}` : ""} × {it.qty}</div>
                      ))}
                      {o.items.length > 3 && <div className="text-muted-foreground">+{o.items.length - 3} more</div>}
                    </td>
                    <td className="p-3 text-mono">{formatINR(o.total)}</td>
                    <td className="p-3">
                      <div className={overdue ? "text-red-500 font-semibold" : ""}>{o.pickupDueAt ? fmtDate(o.pickupDueAt) : "—"}</div>
                      {overdue && <div className="text-mono text-[10px] tracking-widest text-red-500">OVERDUE · {daysLate} DAY{daysLate > 1 ? "S" : ""}</div>}
                    </td>
                    <td className="p-3">
                      {closed(o) ? (
                        <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-border text-muted-foreground">{o.status}</span>
                      ) : o.collectedAt ? (
                        <>
                          <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-emerald-500 text-emerald-600">COLLECTED</span>
                          <div className="text-[11px] text-muted-foreground mt-1">{fmtDate(o.collectedAt)}</div>
                        </>
                      ) : (
                        <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-amber-500 text-amber-600">PENDING</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {!closed(o) && (o.collectedAt ? (
                        <button
                          type="button"
                          disabled={busy === o.id}
                          onClick={() => mark(o, false)}
                          className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary underline underline-offset-4 disabled:opacity-50"
                        >
                          UNDO
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === o.id}
                          onClick={() => mark(o, true)}
                          className="h-9 px-4 bg-primary text-primary-foreground text-mono text-[10px] tracking-widest inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {busy === o.id && <Loader2 className="size-3 animate-spin" />} MARK COLLECTED
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
