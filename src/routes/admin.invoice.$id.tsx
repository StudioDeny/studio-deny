import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOrder, updateInvoice, recomputeTotal, type Order, type InvoiceLine } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/invoice/$id")({
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const [o, setO] = useState<Order | null>(null);
  useEffect(() => { getOrder(id).then((order) => setO(order ?? null)); }, [id]);

  if (!o) return <div className="text-mono text-xs">LOADING…</div>;

  const set = <K extends keyof Order>(k: K, v: Order[K]) => {
    const next = { ...o, [k]: v };
    next.tax = Math.round((next.subtotal * (next.taxRate || 0)) / 100);
    next.total = recomputeTotal(next);
    setO(next);
  };
  const setLine = (i: number, patch: Partial<InvoiceLine>) => {
    const lines = [...o.extraLines];
    lines[i] = { ...lines[i], ...patch };
    set("extraLines", lines);
  };
  const addLine = () => set("extraLines", [...o.extraLines, { label: "Line item", amount: 0 }]);
  const removeLine = (i: number) => set("extraLines", o.extraLines.filter((_, x) => x !== i));

  const save = async () => {
    await updateInvoice(o.id, o);
    toast.success("Invoice updated");
  };

  return (
    <div className="max-w-3xl">
      <Link to="/admin/invoices" className="text-mono text-[11px] tracking-widest text-muted-foreground hover:text-primary">← BACK</Link>
      <h1 className="text-display text-4xl md:text-5xl mt-3 mb-6">INVOICE {o.invoiceNo}</h1>

      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="INVOICE NO"><input value={o.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} className="inp" /></Field>
          <Field label="STATUS">
            <select value={o.status} onChange={(e) => set("status", e.target.value as Order["status"])} className="inp">
              {["PLACED","PACKED","SHIPPED","DELIVERED","CANCELLED","REFUNDED"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className="border border-border divide-y divide-border">
          {o.items.map((it) => (
            <div key={it.slug + it.size} className="p-3 flex justify-between text-sm">
              <span>{it.name} · {it.size} × {it.qty}</span>
              <span className="text-mono">{formatINR(it.price * it.qty)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="SHIPPING"><input type="number" value={o.shipping} onChange={(e) => set("shipping", Number(e.target.value))} className="inp" /></Field>
          <Field label="TAX RATE %"><input type="number" value={o.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} className="inp" /></Field>
          <Field label="DISCOUNT"><input type="number" value={o.discount} onChange={(e) => set("discount", Number(e.target.value))} className="inp" /></Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground">EXTRA LINES</div>
            <button onClick={addLine} className="text-mono text-[10px] text-primary inline-flex items-center gap-1"><Plus className="size-3" /> ADD</button>
          </div>
          <div className="space-y-2">
            {o.extraLines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} className="inp flex-1" />
                <input type="number" value={l.amount} onChange={(e) => setLine(i, { amount: Number(e.target.value) })} className="inp w-32" />
                <button onClick={() => removeLine(i)} className="border border-border w-10 inline-flex items-center justify-center hover:border-primary"><X className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>

        <Field label="NOTES"><textarea value={o.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} className="inp" /></Field>

        <div className="border-t border-border pt-3 text-mono text-sm space-y-1">
          <Row k="SUBTOTAL" v={formatINR(o.subtotal)} />
          <Row k="SHIPPING" v={formatINR(o.shipping)} />
          <Row k={`TAX (${o.taxRate}%)`} v={formatINR(o.tax)} />
          {o.discount ? <Row k="DISCOUNT" v={"− " + formatINR(o.discount)} /> : null}
          {o.extraLines.map((l, i) => <Row key={i} k={l.label.toUpperCase()} v={formatINR(l.amount)} />)}
          <Row k="TOTAL" v={formatINR(o.total)} bold />
        </div>

        <button onClick={save} className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary">SAVE INVOICE</button>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "text-base pt-2 border-t border-border" : "text-muted-foreground"}`}><span>{k}</span><span>{v}</span></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>{children}</label>;
}
