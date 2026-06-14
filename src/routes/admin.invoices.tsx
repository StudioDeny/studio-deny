import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";

export const Route = createFileRoute("/admin/invoices")({
  component: Invoices,
});

function Invoices() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => setOrders(listOrders()), []);

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">INVOICES.</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No invoices yet.</p>
      ) : (
        <div className="border border-border bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">INVOICE</th>
                <th className="text-left p-3">ORDER</th>
                <th className="text-left p-3">CUSTOMER</th>
                <th className="text-left p-3">DATE</th>
                <th className="text-left p-3">TOTAL</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 text-mono text-xs">{o.invoiceNo}</td>
                  <td className="p-3 text-mono text-xs">{o.order_number ?? o.id}</td>
                  <td className="p-3 text-muted-foreground">{o.userEmail}</td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-mono">{formatINR(o.total)}</td>
                  <td className="p-3 text-right">
                    <Link to="/admin/invoice/$id" params={{ id: o.id }} className="text-mono text-[11px] tracking-widest text-primary hover:underline">EDIT →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
