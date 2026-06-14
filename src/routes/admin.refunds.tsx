import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders, refundOrder, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/refunds")({
  component: Refunds,
});

function Refunds() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => setOrders(listOrders()), []);

  const refund = (id: string, amount: number) => {
    if (!confirm(`Refund ${formatINR(amount)}?`)) return;
    refundOrder(id, amount);
    setOrders(listOrders());
    toast.success("Refund processed");
  };

  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const refunded = orders.filter((o) => o.status === "REFUNDED");
  const eligible = orders.filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED");

  const totalRefunded = refunded.reduce((s, o) => s + (o.refundAmount ?? 0), 0);

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">REFUNDS & CANCELLATIONS.</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card label="REFUNDED ORDERS" v={refunded.length} />
        <Card label="CANCELLED" v={cancelled.length} />
        <Card label="TOTAL REFUNDED" v={formatINR(totalRefunded)} />
      </div>

      <Section title="ELIGIBLE FOR REFUND">
        {eligible.length === 0 ? <Empty /> : (
          <Table rows={eligible.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail, new Date(o.createdAt).toLocaleDateString(), formatINR(o.total), o.status,
            ],
            actions: <button onClick={() => refund(o.id, o.total)} className="border border-primary text-primary px-3 h-8 text-mono text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground">REFUND</button>,
          }))} />
        )}
      </Section>

      <Section title="REFUNDED">
        {refunded.length === 0 ? <Empty /> : (
          <Table rows={refunded.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail,
              o.refundedAt ? new Date(o.refundedAt).toLocaleDateString() : "—",
              formatINR(o.refundAmount ?? 0), "REFUNDED",
            ],
          }))} />
        )}
      </Section>

      <Section title="CANCELLED">
        {cancelled.length === 0 ? <Empty /> : (
          <Table rows={cancelled.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail,
              o.cancelledAt ? new Date(o.cancelledAt).toLocaleDateString() : "—",
              formatINR(o.total), "CANCELLED",
            ],
            actions: <button onClick={() => refund(o.id, o.total)} className="border border-primary text-primary px-3 h-8 text-mono text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground">REFUND</button>,
          }))} />
        )}
      </Section>
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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-display text-xl tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Empty() { return <p className="text-muted-foreground text-sm">Nothing here.</p>; }
function Table({ rows }: { rows: { cells: React.ReactNode[]; actions?: React.ReactNode }[] }) {
  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.cells.map((c, j) => <td key={j} className="p-3 text-mono text-xs">{c}</td>)}
              {r.actions && <td className="p-3 text-right">{r.actions}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
