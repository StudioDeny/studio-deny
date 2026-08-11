import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders, refundOrder, createReplacementOrder, createShipment, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/admin/returns")({
  component: Returns,
});

const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "REQUESTED",
  PICKUP_SCHEDULED: "PICKUP SCHEDULED",
  PICKUP_FAILED: "PICKUP PENDING",
  RECEIVED: "RECEIVED",
  REPLACED: "REPLACED",
};

function Returns() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundTarget, setRefundTarget] = useState<{ id: string; amount: number } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  useEffect(() => { listOrders().then(setOrders); }, []);

  const confirmRefund = async () => {
    if (!refundTarget) return;
    await refundOrder(refundTarget.id, refundTarget.amount);
    setOrders(await listOrders());
    toast.success("Refund processed");
  };

  const confirmSendReplacement = async () => {
    if (!replaceTarget) return;
    setReplacing(replaceTarget);
    try {
      const replacement = await createReplacementOrder(replaceTarget);
      const { pickupScheduled, pickupError } = await createShipment(replacement.id);
      setOrders(await listOrders());
      toast.success(
        pickupScheduled ? `Replacement order ${replacement.order_number} created — pickup scheduled`
          : `Replacement order ${replacement.order_number} created — pickup not scheduled (${pickupError ?? "unknown reason"})`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send replacement");
    } finally {
      setReplacing(null);
    }
  };

  const returns = orders.filter((o) => !!o.returnStatus);
  const inProgress = returns.filter((o) => o.returnStatus !== "RECEIVED" && o.returnStatus !== "REPLACED" && o.status !== "REFUNDED");
  const readyToRefund = returns.filter((o) => o.returnStatus === "RECEIVED" && o.status !== "REFUNDED");
  const replaced = returns.filter((o) => o.returnStatus === "REPLACED");
  const done = returns.filter((o) => o.status === "REFUNDED");

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-6">RETURNS.</h1>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <Card label="IN PROGRESS" v={inProgress.length} />
        <Card label="READY TO REFUND" v={readyToRefund.length} />
        <Card label="REPLACED" v={replaced.length} />
        <Card label="REFUNDED" v={done.length} />
      </div>

      <Section title="READY TO REFUND OR REPLACE — PARCEL RECEIVED AT WAREHOUSE">
        {readyToRefund.length === 0 ? <Empty /> : (
          <Table rows={readyToRefund.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail, formatINR(o.total),
              o.returnAwbNumber ?? "—", RETURN_STATUS_LABEL[o.returnStatus!] ?? o.returnStatus!,
              o.returnReason ?? "—",
            ],
            actions: (
              <div className="inline-flex gap-2">
                <button
                  onClick={() => setReplaceTarget(o.id)}
                  disabled={replacing === o.id}
                  className="border border-border px-3 h-8 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {replacing === o.id ? "SENDING…" : "SEND REPLACEMENT"}
                </button>
                <button onClick={() => setRefundTarget({ id: o.id, amount: o.total })} className="border border-primary text-primary px-3 h-8 text-mono text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground">REFUND</button>
              </div>
            ),
          }))} />
        )}
      </Section>

      <Section title="IN PROGRESS — WITH COURIER">
        {inProgress.length === 0 ? <Empty /> : (
          <Table rows={inProgress.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail, formatINR(o.total),
              o.returnAwbNumber ?? "—", RETURN_STATUS_LABEL[o.returnStatus!] ?? o.returnStatus!,
              o.returnReason ?? "—",
            ],
            actions: o.returnTrackingUrl ? (
              <a href={o.returnTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-mono text-[10px] tracking-widest text-primary hover:underline">TRACK →</a>
            ) : undefined,
          }))} />
        )}
      </Section>

      <Section title="REPLACED">
        {replaced.length === 0 ? <Empty /> : (
          <Table rows={replaced.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail,
              o.returnRequestedAt ? new Date(o.returnRequestedAt).toLocaleDateString() : "—",
              o.replacementOrderId ?? "—", "REPLACED",
            ],
          }))} />
        )}
      </Section>

      <Section title="REFUNDED">
        {done.length === 0 ? <Empty /> : (
          <Table rows={done.map((o) => ({
            cells: [
              o.order_number ?? o.id, o.userEmail,
              o.refundedAt ? new Date(o.refundedAt).toLocaleDateString() : "—",
              formatINR(o.refundAmount ?? o.total), "REFUNDED",
            ],
          }))} />
        )}
      </Section>

      <ConfirmDialog
        open={refundTarget !== null}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="ISSUE THIS REFUND?"
        description={refundTarget ? `Refund ${formatINR(refundTarget.amount)}?` : undefined}
        confirmLabel="REFUND"
        destructive
        onConfirm={confirmRefund}
      />
      <ConfirmDialog
        open={replaceTarget !== null}
        onOpenChange={(open) => !open && setReplaceTarget(null)}
        title="SEND A REPLACEMENT?"
        description="Creates a new order with the same items, shipped to the same address — a courier pickup is scheduled automatically. The original stays on record as REPLACED."
        confirmLabel="SEND REPLACEMENT"
        onConfirm={confirmSendReplacement}
      />
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
