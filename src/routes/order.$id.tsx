import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOrder, cancelOrder, requestReturn, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { Check, FileText, X, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const RETURN_WINDOW_DAYS = 7;
const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Return requested",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKUP_FAILED: "Pickup pending — contact support",
  RECEIVED: "Received at warehouse — refund pending",
  REPLACED: "Replacement sent",
};

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
  head: () => ({ meta: [{ title: "Order — STUDIO DENY" }] }),
});

function OrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => {
    getOrder(id).then((o) => {
      setOrder(o ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Loading className="py-24" />;
  if (!order) {
    return (
      <section className="px-4 md:px-8 py-24 text-center">
        <h1 className="text-display text-5xl">ORDER NOT FOUND</h1>
        <Link to="/shop" className="mt-6 inline-block text-mono text-xs tracking-widest text-primary hover:underline">→ SHOP</Link>
      </section>
    );
  }

  const canCancel = order.status === "PLACED" || order.status === "PACKED" || order.status === "SHIPPED";
  const daysSinceDelivery = order.deliveredAt ? (Date.now() - order.deliveredAt) / (1000 * 60 * 60 * 24) : Infinity;
  const canReturn = order.status === "DELIVERED" && !order.returnStatus && daysSinceDelivery <= RETURN_WINDOW_DAYS;

  const onCancel = async () => {
    const { shiprocketCancelled, rtoInitiated } = await cancelOrder(order.id);
    setOrder(await getOrder(id) ?? null);
    toast.success(
      rtoInitiated ? "Order cancelled — parcel already picked up, return-to-origin requested"
        : shiprocketCancelled ? "Order cancelled — shipment cancelled with courier"
        : "Order cancelled"
    );
  };

  const onRequestReturn = async () => {
    const { pickupScheduled, pickupError } = await requestReturn(order.id, returnReason.trim() || undefined);
    setReturnReason("");
    setOrder(await getOrder(id) ?? null);
    toast.success(pickupScheduled ? "Return requested — pickup scheduled" : `Return requested — pickup not scheduled (${pickupError ?? "unknown reason"}), we'll follow up`);
  };

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-3xl mx-auto">
      <div className="size-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-6 glow-lime">
        <Check className="size-8" />
      </div>
      <div className="text-mono text-[11px] tracking-[0.3em] text-secondary mb-2">◢ ORDER {order.status}</div>
      <h1 className="text-display text-5xl md:text-7xl">{order.status === "CANCELLED" ? "CANCELLED." : order.status === "REFUNDED" ? "REFUNDED." : "YOU'RE IN."}</h1>
      <p className="text-muted-foreground mt-3">Order <span className="text-mono text-foreground">{order.order_number ?? order.id}</span> — confirmation sent to <span className="text-foreground">{order.userEmail}</span>.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="border border-border p-5 bg-surface">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">SHIPPING TO</div>
          <div className="font-semibold">{order.address.name}</div>
          <div className="text-sm text-muted-foreground">{order.address.line1}</div>
          <div className="text-sm text-muted-foreground">{order.address.city}, {order.address.state} {order.address.pincode}</div>
          <div className="text-sm text-muted-foreground mt-1">{order.address.phone}</div>
        </div>
        <div className="border border-border p-5 bg-surface">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">PAYMENT</div>
          <div className="font-semibold">Razorpay</div>
          <div className="text-sm text-muted-foreground text-mono break-all">{order.paymentId}</div>
          <div className="text-sm text-muted-foreground mt-1">Status: <span className="text-secondary">{order.status}</span></div>
          {order.refundAmount ? <div className="text-sm text-primary mt-1">Refunded: {formatINR(order.refundAmount)}</div> : null}
        </div>
      </div>

      {order.awbNumber && (
        <div className="mt-6 border border-border p-5 bg-surface flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><Truck className="size-3.5" /> SHIPPING</div>
            <div className="font-semibold">{order.courierName ?? "Courier assigned"}</div>
            <div className="text-sm text-muted-foreground text-mono">AWB {order.awbNumber}</div>
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border h-11 px-6 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
            >
              TRACK SHIPMENT
            </a>
          )}
        </div>
      )}

      {order.returnStatus && (
        <div className="mt-6 border border-border p-5 bg-surface flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><RotateCcw className="size-3.5" /> RETURN</div>
            <div className="font-semibold">{RETURN_STATUS_LABEL[order.returnStatus] ?? order.returnStatus}</div>
            {order.returnAwbNumber && <div className="text-sm text-muted-foreground text-mono">AWB {order.returnAwbNumber}</div>}
          </div>
          {order.returnStatus === "REPLACED" && order.replacementOrderId ? (
            <Link
              to="/order/$id"
              params={{ id: order.replacementOrderId }}
              className="border border-border h-11 px-6 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
            >
              VIEW REPLACEMENT
            </Link>
          ) : order.returnTrackingUrl && (
            <a
              href={order.returnTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border h-11 px-6 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
            >
              TRACK RETURN
            </a>
          )}
        </div>
      )}

      <div className="mt-6 border border-border bg-surface">
        <ul className="divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.slug + it.size} className="p-4 flex gap-4">
              <div className="w-16 h-20 bg-muted overflow-hidden shrink-0"><img src={it.image} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1">
                <div className="font-semibold">{it.name}</div>
                <div className="text-xs text-mono text-muted-foreground">SIZE {it.size} · QTY {it.qty}</div>
              </div>
              <div className="text-mono">{formatINR(it.price * it.qty)}</div>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-border space-y-1 text-sm text-mono">
          <div className="flex justify-between text-muted-foreground"><span>SUBTOTAL</span><span>{formatINR(order.subtotal)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>SHIPPING</span><span>{order.shipping === 0 ? "FREE" : formatINR(order.shipping)}</span></div>
          {order.taxRate ? <div className="flex justify-between text-muted-foreground"><span>TAX ({order.taxRate}%)</span><span>{formatINR(order.tax)}</span></div> : null}
          {order.discount ? <div className="flex justify-between text-muted-foreground"><span>DISCOUNT</span><span>− {formatINR(order.discount)}</span></div> : null}
          <div className="flex justify-between pt-2 border-t border-border"><span>TOTAL</span><span className="text-display text-2xl">{formatINR(order.total)}</span></div>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-3">
        <Link to="/invoice/$id" params={{ id: order.id }} className="text-center border border-border h-12 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
          <FileText className="size-4" /> INVOICE
        </Link>
        {canCancel ? (
          <button onClick={() => setConfirmCancel(true)} className="border border-border h-12 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            <X className="size-4" /> CANCEL ORDER
          </button>
        ) : canReturn ? (
          <button onClick={() => setConfirmReturn(true)} className="border border-border h-12 inline-flex items-center justify-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            <RotateCcw className="size-4" /> REQUEST RETURN
          </button>
        ) : (
          <Link to="/account" className="text-center border border-border h-12 inline-flex items-center justify-center text-mono text-xs tracking-widest hover:border-primary hover:text-primary">VIEW ORDERS</Link>
        )}
        <Link to="/shop" className="text-center bg-foreground text-background h-12 inline-flex items-center justify-center text-mono text-xs tracking-widest hover:bg-primary hover:text-primary-foreground">KEEP SHOPPING</Link>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="CANCEL THIS ORDER?"
        description="A refund will be processed."
        confirmLabel="CANCEL ORDER"
        destructive
        onConfirm={onCancel}
      />
      <ConfirmDialog
        open={confirmReturn}
        onOpenChange={(open) => { setConfirmReturn(open); if (!open) setReturnReason(""); }}
        title="REQUEST A RETURN?"
        description="A courier pickup will be scheduled automatically from your address."
        confirmLabel="REQUEST RETURN"
        onConfirm={onRequestReturn}
      >
        <textarea
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="Reason for return (optional)"
          rows={3}
          className="w-full border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:border-primary"
        />
      </ConfirmDialog>
    </section>
  );
}
