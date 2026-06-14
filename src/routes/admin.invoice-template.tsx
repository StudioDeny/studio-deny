import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSettings, saveSettings, type LoyaltySettings } from "@/lib/settings";
import { toast } from "sonner";
import { formatINR } from "@/context/CartContext";

export const Route = createFileRoute("/admin/invoice-template")({
  component: TemplateEditor,
});

function TemplateEditor() {
  const [s, setS] = useState<LoyaltySettings | null>(null);
  useEffect(() => setS(getSettings()), []);
  if (!s) return <div className="text-mono text-xs">LOADING…</div>;

  const t = s.invoice;
  const set = <K extends keyof typeof t>(k: K, v: (typeof t)[K]) =>
    setS({ ...s, invoice: { ...t, [k]: v } });

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">INVOICE TEMPLATE.</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Edit the common invoice template — applies to every customer & admin invoice.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4 border border-border bg-surface p-6">
          <Field label="BRAND NAME"><input value={t.brandName} onChange={(e) => set("brandName", e.target.value)} className="inp" /></Field>
          <Field label="TAGLINE"><input value={t.tagline} onChange={(e) => set("tagline", e.target.value)} className="inp" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="GSTIN"><input value={t.gstin} onChange={(e) => set("gstin", e.target.value)} className="inp" /></Field>
            <Field label="INVOICE LABEL"><input value={t.taxLabel} onChange={(e) => set("taxLabel", e.target.value)} className="inp" /></Field>
            <Field label="EMAIL"><input value={t.email} onChange={(e) => set("email", e.target.value)} className="inp" /></Field>
            <Field label="PHONE"><input value={t.phone} onChange={(e) => set("phone", e.target.value)} className="inp" /></Field>
          </div>
          <Field label="ADDRESS"><textarea rows={2} value={t.address} onChange={(e) => set("address", e.target.value)} className="inp" /></Field>
          <Field label="ACCENT (HEADER) COLOR">
            <div className="flex gap-2 items-center">
              <input type="color" value={t.accent} onChange={(e) => set("accent", e.target.value)} className="h-10 w-14 bg-background border border-border" />
              <input value={t.accent} onChange={(e) => set("accent", e.target.value)} className="inp flex-1" />
            </div>
          </Field>
          <Field label="TERMS"><textarea rows={3} value={t.terms} onChange={(e) => set("terms", e.target.value)} className="inp" /></Field>
          <Field label="SIGNATORY"><input value={t.signatory} onChange={(e) => set("signatory", e.target.value)} className="inp" /></Field>
          <Field label="FOOTER"><input value={t.footer} onChange={(e) => set("footer", e.target.value)} className="inp" /></Field>
          <button
            onClick={() => { saveSettings(s); toast.success("Template saved"); }}
            className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary"
          >SAVE TEMPLATE</button>
        </div>

        <div>
          <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">LIVE PREVIEW</div>
          <div className="bg-white text-neutral-900 border border-border shadow-2xl">
            <div className="px-6 py-5 flex justify-between items-start text-white" style={{ background: t.accent }}>
              <div>
                <div className="font-display text-2xl tracking-[0.18em]">{t.brandName}</div>
                <div className="text-[9px] tracking-[0.3em] opacity-70 mt-1">{t.tagline}</div>
                <div className="text-[9px] opacity-60 mt-2">GSTIN {t.gstin} · {t.email}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] tracking-[0.3em] opacity-70">{t.taxLabel}</div>
                <div className="font-display text-xl mt-1">INV-PREVIEW</div>
                <div className="text-[10px] opacity-70">{new Date().toLocaleDateString("en-IN")}</div>
              </div>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-[9px] tracking-widest text-neutral-500">BILLED TO</div><div className="font-semibold mt-1">Aarav Sharma</div><div className="text-neutral-600">14 Demo Lane, Mumbai 400001</div></div>
                <div><div className="text-[9px] tracking-widest text-neutral-500">PAYMENT</div><div className="font-semibold mt-1">Razorpay</div><div className="font-mono text-[10px] text-neutral-500">pay_demo123</div></div>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="bg-neutral-100 text-[9px] tracking-widest text-neutral-600"><th className="text-left p-2">DESCRIPTION</th><th className="text-right p-2">AMOUNT</th></tr></thead>
                <tbody>
                  <tr className="border-b border-neutral-200"><td className="p-2">Shadow Realm Hoodie · L × 1</td><td className="p-2 text-right font-mono">{formatINR(2499)}</td></tr>
                  <tr className="border-b border-neutral-200"><td className="p-2">Static Trucker Cap × 1</td><td className="p-2 text-right font-mono">{formatINR(899)}</td></tr>
                </tbody>
              </table>
              <div className="flex justify-between font-mono text-xs"><span>Subtotal</span><span>{formatINR(3398)}</span></div>
              <div className="flex justify-between font-mono text-xs"><span>GST (5%)</span><span>{formatINR(170)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t-2 border-neutral-900"><span>TOTAL</span><span>{formatINR(3568)}</span></div>
              <div className="pt-3 border-t border-neutral-200 text-[10px] text-neutral-500">{t.terms}</div>
              <div className="flex justify-between items-end pt-3">
                <div className="text-[9px] tracking-widest text-neutral-400">{t.footer}</div>
                <div className="font-display italic text-lg">{t.signatory}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>{children}</label>;
}
