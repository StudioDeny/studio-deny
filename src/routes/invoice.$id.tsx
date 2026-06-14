import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getOrder, type Order } from "@/lib/orders";
import { getSettings, type InvoiceTemplate } from "@/lib/settings";
import { formatINR } from "@/context/CartContext";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/invoice/$id")({
  component: InvoicePage,
  head: () => ({ meta: [{ title: "Invoice — STUDIO/DENY" }] }),
});

function InvoicePage() {
  const { id } = Route.useParams();
  const [o, setO] = useState<Order | null>(null);
  const [tpl, setTpl] = useState<InvoiceTemplate | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setO(getOrder(id) ?? null); setTpl(getSettings().invoice); }, [id]);

  if (!o || !tpl) return <section className="px-4 md:px-8 py-24 text-center"><h1 className="text-display text-5xl">INVOICE NOT FOUND</h1></section>;

  // Status pill color
  const statusColor =
    o.status === "REFUNDED" ? "border-rose-400 text-rose-300" :
    o.status === "CANCELLED" ? "border-neutral-500 text-neutral-400" :
    o.status === "DELIVERED" ? "border-emerald-400 text-emerald-300" :
    "border-amber-400 text-amber-300";

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-3xl mx-auto pb-16">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link to="/order/$id" params={{ id: o.id }} className="text-mono text-[11px] tracking-widest text-muted-foreground hover:text-primary">← BACK TO ORDER</Link>
        <button onClick={() => window.print()} className="border border-border h-10 px-4 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
          <Printer className="size-4" /> PRINT
        </button>
      </div>

      <div ref={ref} className="bg-white text-neutral-900 border border-border shadow-2xl invoice-doc relative overflow-hidden">
        {/* watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <div className="text-[110px] font-display font-black tracking-widest text-neutral-100 rotate-[-22deg] opacity-70">
            {tpl.brandName.replace("/", " ")}
          </div>
        </div>

        {/* Header band */}
        <div className="relative px-8 md:px-12 py-8 flex justify-between items-start flex-wrap gap-4 text-white" style={{ background: tpl.accent }}>
          <div>
            <div className="font-display text-3xl tracking-[0.18em]">{tpl.brandName}</div>
            <div className="text-[10px] tracking-[0.3em] opacity-70 mt-1">{tpl.tagline}</div>
            <div className="text-[10px] opacity-60 mt-3">GSTIN {tpl.gstin} · {tpl.email} · {tpl.phone}</div>
            <div className="text-[10px] opacity-50 mt-1 max-w-sm">{tpl.address}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-[0.3em] opacity-70">{tpl.taxLabel}</div>
            <div className="font-display text-3xl mt-1">{o.invoiceNo}</div>
            <div className="text-xs opacity-80 mt-1">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
            <div className={`inline-block mt-2 text-[10px] tracking-widest px-2 py-1 border ${statusColor}`}>{o.status}</div>
          </div>
        </div>

        <div className="relative px-8 md:px-12 py-8">
          <div className="grid sm:grid-cols-3 gap-6 mb-8 pb-6 border-b border-neutral-200">
            <div>
              <div className="text-[10px] tracking-[0.25em] text-neutral-500 mb-2">BILLED TO</div>
              <div className="font-semibold text-neutral-900">{o.address.name}</div>
              <div className="text-sm text-neutral-600">{o.userEmail}</div>
              <div className="text-sm text-neutral-600 mt-1">{o.address.line1}</div>
              <div className="text-sm text-neutral-600">{o.address.city}, {o.address.state} {o.address.pincode}</div>
              <div className="text-sm text-neutral-600">{o.address.phone}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-neutral-500 mb-2">SHIP TO</div>
              <div className="font-semibold text-neutral-900">{o.address.name}</div>
              <div className="text-sm text-neutral-600 mt-1">{o.address.line1}</div>
              <div className="text-sm text-neutral-600">{o.address.city}, {o.address.state} {o.address.pincode}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-neutral-500 mb-2">PAYMENT</div>
              <div className="text-sm text-neutral-900 font-semibold">Razorpay</div>
              <div className="text-[11px] text-neutral-500 break-all font-mono">{o.paymentId}</div>
              <div className="text-[10px] tracking-[0.25em] text-neutral-500 mt-3 mb-1">ORDER ID</div>
              <div className="text-xs text-neutral-700 font-mono">{o.order_number ?? o.id}</div>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-[10px] tracking-[0.2em] text-white" style={{ background: tpl.accent }}>
                <th className="text-left p-3">DESCRIPTION</th>
                <th className="text-left p-3">SIZE</th>
                <th className="text-right p-3">QTY</th>
                <th className="text-right p-3">RATE</th>
                <th className="text-right p-3">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it, i) => (
                <tr key={it.slug + it.size} className={`border-b border-neutral-200 ${i % 2 ? "bg-neutral-50" : ""}`}>
                  <td className="p-3 text-neutral-900">{it.name}</td>
                  <td className="p-3 text-neutral-600 font-mono text-xs">{it.size}</td>
                  <td className="p-3 text-right font-mono">{it.qty}</td>
                  <td className="p-3 text-right font-mono">{formatINR(it.price)}</td>
                  <td className="p-3 text-right font-mono">{formatINR(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-full sm:w-80 space-y-1.5 font-mono text-sm">
              <Row k="Subtotal" v={formatINR(o.subtotal)} />
              <Row k="Shipping" v={o.shipping === 0 ? "FREE" : formatINR(o.shipping)} />
              {o.taxRate ? <Row k={`GST (${o.taxRate}%)`} v={formatINR(o.tax)} /> : null}
              {o.discount ? <Row k="Discount" v={"− " + formatINR(o.discount)} /> : null}
              {o.extraLines.map((l, i) => <Row key={i} k={l.label} v={formatINR(l.amount)} />)}
              <div className="flex justify-between pt-3 mt-2 border-t-2 text-lg font-bold text-neutral-900" style={{ borderColor: tpl.accent }}><span>TOTAL</span><span>{formatINR(o.total)}</span></div>
              {o.refundAmount ? <Row k="Refunded" v={"− " + formatINR(o.refundAmount)} /> : null}
            </div>
          </div>

          {o.notes && (
            <div className="mt-8 border-t border-neutral-200 pt-4">
              <div className="text-[10px] tracking-[0.25em] text-neutral-500 mb-1">NOTES</div>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{o.notes}</p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-neutral-200 grid sm:grid-cols-2 gap-6 text-xs text-neutral-500">
            <div>
              <div className="tracking-[0.25em] mb-1 text-neutral-700">TERMS & CONDITIONS</div>
              <p className="leading-relaxed">{tpl.terms}</p>
            </div>
            <div className="sm:text-right">
              <div className="tracking-[0.25em] mb-1 text-neutral-700">AUTHORIZED SIGNATORY</div>
              <div className="font-display text-2xl text-neutral-900 italic mt-2">{tpl.signatory}</div>
              <div className="text-[10px] mt-1 text-neutral-400">For {tpl.brandName}</div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-200 text-center text-[10px] tracking-[0.3em] text-neutral-400">
            {tpl.footer}
          </div>
        </div>
      </div>
      <style>{`@media print{nav,header,footer,.print\\:hidden{display:none!important}body{background:white!important;color:black!important}.invoice-doc{box-shadow:none!important;border:none!important}}`}</style>
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-neutral-600"><span>{k}</span><span className="text-neutral-900">{v}</span></div>;
}
