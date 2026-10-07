import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WelcomeOfferSettings, WelcomeOfferTier } from "@/types/database";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/welcome-offer")({
  component: AdminWelcomeOffer,
});

type TierDraft = Pick<WelcomeOfferTier, "label" | "discount_type" | "discount_value" | "target_percent" | "is_active"> & { id?: string };
type Stat = { tier_id: string | null; issued: number; redeemed: number };

function AdminWelcomeOffer() {
  const [settings, setSettings] = useState<WelcomeOfferSettings | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, t, st] = await Promise.all([
      supabase.from("welcome_offer_settings").select("*").limit(1).maybeSingle(),
      supabase.from("welcome_offer_tiers").select("*").order("sort_order"),
      supabase.rpc("welcome_offer_stats" as never),
    ]);
    if (s.error) toast.error(s.error.message);
    setSettings((s.data as WelcomeOfferSettings) ?? null);
    setTiers(((t.data as WelcomeOfferTier[]) ?? []).map(({ id, label, discount_type, discount_value, target_percent, is_active }) =>
      ({ id, label, discount_type, discount_value: Number(discount_value), target_percent: Number(target_percent), is_active })));
    setStats(((st.data as unknown as Stat[]) ?? []).map((r) => ({ ...r, issued: Number(r.issued), redeemed: Number(r.redeemed) })));
    setRemoved([]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activeTotal = tiers.filter((t) => t.is_active).reduce((s, t) => s + (Number(t.target_percent) || 0), 0);
  const totalIssued = stats.reduce((s, r) => s + r.issued, 0);
  const statFor = (id?: string) => stats.find((r) => r.tier_id === id);

  const updateTier = (i: number, patch: Partial<TierDraft>) => setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const removeTier = (i: number) => {
    const t = tiers[i];
    if (t.id) setRemoved((r) => [...r, t.id!]);
    setTiers((ts) => ts.filter((_, j) => j !== i));
  };

  const save = async () => {
    if (!settings) return;
    if (Math.abs(activeTotal - 100) > 0.001) return toast.error(`Active targets must add up to 100% (now ${activeTotal}%)`);
    for (const t of tiers) {
      if (!t.label.trim()) return toast.error("Every tier needs a label");
      if (!(t.discount_value > 0)) return toast.error(`${t.label}: discount must be more than 0`);
      if (t.discount_type === "percent" && t.discount_value > 100) return toast.error(`${t.label}: percent can't be over 100`);
    }
    if (!/^[A-Z0-9]{1,10}$/.test(settings.code_prefix)) return toast.error("Code prefix: 1–10 capital letters or numbers");

    setSaving(true);
    // One database call = one transaction: either every change lands or none does.
    const { error } = await supabase.rpc("save_welcome_offer" as never, {
      p_settings: settings,
      p_tiers: tiers.map((t) => ({ id: t.id ?? null, label: t.label.trim(), discount_type: t.discount_type, discount_value: t.discount_value, target_percent: t.target_percent, is_active: t.is_active })),
      p_removed: removed,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome offer saved");
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!settings) return <div className="text-mono text-xs">No welcome offer settings found — run the migration first.</div>;

  const setS = (patch: Partial<WelcomeOfferSettings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">WELCOME OFFER.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        EVERY NEW ACCOUNT GETS ONE UNIQUE CODE. THE DISCOUNT IS PICKED AT RANDOM USING YOUR TARGET SPLIT.
      </p>

      <div className="max-w-3xl space-y-6">
        <div className="border border-border bg-surface p-4 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setS({ enabled: e.target.checked })} className="size-4" />
            <span className="lbl !mb-0">GIVE NEW USERS A WELCOME CODE</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block"><div className="lbl">CODE PREFIX (E.G. DENY → DENY-7KX2QM)</div>
              <input value={settings.code_prefix} onChange={(e) => setS({ code_prefix: e.target.value.toUpperCase() })} className="inp uppercase" maxLength={10} /></label>
            <label className="block"><div className="lbl">VALID FOR (DAYS, BLANK = NEVER EXPIRES)</div>
              <input type="number" min={1} value={settings.valid_days ?? ""} onChange={(e) => setS({ valid_days: numOrNull(e.target.value) })} className="inp" /></label>
            <label className="block"><div className="lbl">MIN ORDER ₹ (BLANK = NONE)</div>
              <input type="number" min={0} value={settings.min_order ?? ""} onChange={(e) => setS({ min_order: numOrNull(e.target.value) })} className="inp" /></label>
            <label className="block"><div className="lbl">MAX DISCOUNT ₹ (BLANK = NO CAP)</div>
              <input type="number" min={1} value={settings.max_discount ?? ""} onChange={(e) => setS({ max_discount: numOrNull(e.target.value) })} className="inp" /></label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.first_order_only} onChange={(e) => setS({ first_order_only: e.target.checked })} className="size-4" />
            <span className="lbl !mb-0">ONLY ON THE CUSTOMER'S FIRST ORDER</span>
          </label>
          <p className="text-[11px] text-muted-foreground">Changes apply to codes issued from now on. Codes already handed out keep their original terms (edit them under Coupons).</p>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="lbl !mb-0">DISCOUNT TIERS</div>
            <div className={`text-mono text-[11px] tracking-widest ${Math.abs(activeTotal - 100) < 0.001 ? "text-emerald-600" : "text-red-500"}`}>
              TARGETS TOTAL {activeTotal}% {Math.abs(activeTotal - 100) < 0.001 ? "✓" : "— MUST BE 100%"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-mono text-[10px] tracking-widest text-muted-foreground">
                <tr><th className="text-left p-2">LABEL</th><th className="text-left p-2">TYPE</th><th className="text-left p-2">VALUE</th><th className="text-left p-2">TARGET %</th><th className="text-left p-2">ACTUAL</th><th className="text-left p-2">ON</th><th /></tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const st = statFor(t.id);
                  const actual = totalIssued > 0 && st ? Math.round((st.issued / totalIssued) * 1000) / 10 : 0;
                  return (
                    <tr key={t.id ?? `new-${i}`} className="border-t border-border">
                      <td className="p-2"><input value={t.label} onChange={(e) => updateTier(i, { label: e.target.value })} className="inp" /></td>
                      <td className="p-2">
                        <select value={t.discount_type} onChange={(e) => updateTier(i, { discount_type: e.target.value as TierDraft["discount_type"] })} className="inp">
                          <option value="percent">%</option><option value="fixed">₹</option>
                        </select>
                      </td>
                      <td className="p-2"><input type="number" min={0} value={t.discount_value} onChange={(e) => updateTier(i, { discount_value: Number(e.target.value) })} className="inp !w-24" /></td>
                      <td className="p-2"><input type="number" min={0} max={100} value={t.target_percent} onChange={(e) => updateTier(i, { target_percent: Number(e.target.value) })} className="inp !w-24" /></td>
                      <td className="p-2 text-mono text-xs whitespace-nowrap">{actual}% · {st?.issued ?? 0} issued · {st?.redeemed ?? 0} used</td>
                      <td className="p-2"><input type="checkbox" checked={t.is_active} onChange={(e) => updateTier(i, { is_active: e.target.checked })} className="size-4" /></td>
                      <td className="p-2"><button type="button" onClick={() => removeTier(i)} className="text-muted-foreground hover:text-red-500" aria-label="Remove tier"><Trash2 className="size-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setTiers((ts) => [...ts, { label: "", discount_type: "percent", discount_value: 5, target_percent: 0, is_active: true }])}
            className="border border-border h-9 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2">
            <Plus className="size-3" /> ADD TIER
          </button>
        </div>

        <button type="button" onClick={save} disabled={saving} className="h-11 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
        </button>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
