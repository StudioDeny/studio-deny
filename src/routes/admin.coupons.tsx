import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Coupon, CouponRedemption } from "@/types/database";
import { couponLabel, couponStatus } from "@/lib/coupons";
import { formatINR } from "@/context/CartContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shuffle, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Draft = {
  id?: string;
  kind: Coupon["kind"];
  code: string;
  description: string;
  discount_type: Coupon["discount_type"];
  discount_value: string;
  max_discount: string;
  min_order: string;
  max_uses: string;
  per_user_limit: string;
  starts_at: string;
  expires_at: string;
  first_order_only: boolean;
  is_active: boolean;
};

const BLANK: Draft = {
  kind: "general", code: "", description: "", discount_type: "percent", discount_value: "",
  max_discount: "", min_order: "", max_uses: "", per_user_limit: "1", starts_at: "", expires_at: "",
  first_order_only: false, is_active: true,
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () => "DENY" + Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const toDraft = (c: Coupon): Draft => ({
  id: c.id, kind: c.kind, code: c.code, description: c.description ?? "",
  discount_type: c.discount_type, discount_value: String(c.discount_value),
  max_discount: c.max_discount?.toString() ?? "", min_order: c.min_order?.toString() ?? "",
  max_uses: c.max_uses?.toString() ?? "", per_user_limit: c.per_user_limit?.toString() ?? "",
  starts_at: toLocalInput(c.starts_at), expires_at: toLocalInput(c.expires_at),
  first_order_only: c.first_order_only, is_active: c.is_active,
});

function validate(d: Draft): string | null {
  const code = d.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return "Code: 3–32 letters, numbers, - or _";
  const v = Number(d.discount_value);
  if (!(v > 0)) return "Discount must be more than 0";
  if (d.discount_type === "percent" && v > 100) return "Percent discount can't be over 100";
  for (const [label, val] of [["Max discount", d.max_discount], ["Min order", d.min_order], ["Total uses", d.max_uses], ["Uses per customer", d.per_user_limit]] as const) {
    if (val.trim() !== "" && !(Number(val) > 0)) return `${label} must be blank or more than 0`;
  }
  if (d.starts_at && d.expires_at && new Date(d.starts_at) >= new Date(d.expires_at)) return "End date must be after start date";
  return null;
}

function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | "general" | "welcome">("general");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "used" | "expired" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, CouponRedemption[]>>({});

  const load = async () => {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) toast.error(error.message);
    setRows((data as Coupon[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((c) =>
    (kindFilter === "all" || c.kind === kindFilter) &&
    (statusFilter === "all" || couponStatus(c) === statusFilter) &&
    (!search.trim() || c.code.includes(search.trim().toUpperCase()))
  ), [rows, kindFilter, statusFilter, search]);

  const save = async () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) return toast.error(problem);
    setSaving(true);
    const fields = {
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim() || null,
      discount_type: draft.discount_type,
      discount_value: Number(draft.discount_value),
      max_discount: numOrNull(draft.max_discount),
      min_order: numOrNull(draft.min_order),
      max_uses: numOrNull(draft.max_uses),
      per_user_limit: numOrNull(draft.per_user_limit),
      starts_at: fromLocalInput(draft.starts_at),
      expires_at: fromLocalInput(draft.expires_at),
      first_order_only: draft.first_order_only,
      is_active: draft.is_active,
    };
    const { error } = draft.id
      ? await supabase.from("coupons").update(fields).eq("id", draft.id)
      : await supabase.from("coupons").insert({ ...fields, kind: "general", assigned_user_id: null, welcome_tier_id: null });
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That code already exists" : error.message);
    toast.success("Coupon saved");
    setDraft(null);
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, is_active: !c.is_active } : r)));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("coupons").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id));
  };

  const toggleOpen = async (c: Coupon) => {
    const next = openId === c.id ? null : c.id;
    setOpenId(next);
    if (next && !redemptions[c.id]) {
      const { data } = await supabase.from("coupon_redemptions").select("*").eq("coupon_id", c.id).order("created_at", { ascending: false });
      setRedemptions((r) => ({ ...r, [c.id]: (data as CouponRedemption[]) ?? [] }));
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-display text-4xl md:text-5xl mb-2">COUPONS.</h1>
          <p className="text-mono text-[11px] tracking-widest text-muted-foreground">CREATE, LIMIT, SWITCH OFF AND DELETE CODES. WELCOME CODES ARE ISSUED AUTOMATICALLY.</p>
        </div>
        <button type="button" onClick={() => setDraft({ ...BLANK, code: randomCode() })} className="h-10 px-4 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2">
          <Plus className="size-3.5" /> NEW COUPON
        </button>
      </div>

      {draft && (
        <div className="border border-border bg-surface p-4 mb-6 max-w-3xl space-y-4">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{draft.id ? `EDIT ${draft.kind === "welcome" ? "WELCOME " : ""}COUPON` : "NEW COUPON"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="lbl">CODE</div>
              <div className="flex gap-2">
                <input value={draft.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="inp uppercase" disabled={draft.kind === "welcome"} />
                {draft.kind === "general" && (
                  <button type="button" title="Random code" onClick={() => set({ code: randomCode() })} className="border border-border h-10 px-3 hover:border-primary hover:text-primary"><Shuffle className="size-4" /></button>
                )}
              </div>
            </label>
            <label className="block">
              <div className="lbl">NOTE (ADMIN ONLY)</div>
              <input value={draft.description} onChange={(e) => set({ description: e.target.value })} className="inp" placeholder="e.g. Diwali campaign" />
            </label>
            <label className="block">
              <div className="lbl">DISCOUNT TYPE</div>
              <select value={draft.discount_type} onChange={(e) => set({ discount_type: e.target.value as Draft["discount_type"] })} className="inp">
                <option value="percent">% OFF</option>
                <option value="fixed">₹ FLAT OFF</option>
              </select>
            </label>
            <label className="block">
              <div className="lbl">{draft.discount_type === "percent" ? "PERCENT (1–100)" : "RUPEES OFF"}</div>
              <input type="number" min={0} value={draft.discount_value} onChange={(e) => set({ discount_value: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MAX DISCOUNT ₹ (BLANK = NO CAP)</div>
              <input type="number" min={0} value={draft.max_discount} onChange={(e) => set({ max_discount: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MIN ORDER ₹ (BLANK = NONE)</div>
              <input type="number" min={0} value={draft.min_order} onChange={(e) => set({ min_order: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">TOTAL USES ALLOWED (BLANK = UNLIMITED)</div>
              <input type="number" min={1} value={draft.max_uses} onChange={(e) => set({ max_uses: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">USES PER CUSTOMER (BLANK = UNLIMITED)</div>
              <input type="number" min={1} value={draft.per_user_limit} onChange={(e) => set({ per_user_limit: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">STARTS (BLANK = NOW)</div>
              <input type="datetime-local" value={draft.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="lbl">ENDS (BLANK = NEVER)</div>
              <input type="datetime-local" value={draft.expires_at} onChange={(e) => set({ expires_at: e.target.value })} className="inp" />
            </label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="size-4" /><span className="lbl !mb-0">ACTIVE</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={draft.first_order_only} onChange={(e) => set({ first_order_only: e.target.checked })} className="size-4" /><span className="lbl !mb-0">FIRST ORDER ONLY</span></label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={saving} className="h-10 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-10 px-6 border border-border text-mono text-xs tracking-widest">CANCEL</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)} className="inp !w-auto">
          <option value="general">GENERAL</option>
          <option value="welcome">WELCOME</option>
          <option value="all">ALL KINDS</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="inp !w-auto">
          <option value="all">ANY STATUS</option>
          <option value="active">ACTIVE</option>
          <option value="used">USED UP</option>
          <option value="expired">EXPIRED</option>
          <option value="inactive">SWITCHED OFF</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH CODE" className="inp !w-56 uppercase" />
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-surface text-mono text-[10px] tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">CODE</th>
              <th className="text-left p-3">DISCOUNT</th>
              <th className="text-left p-3">USES</th>
              <th className="text-left p-3">ENDS</th>
              <th className="text-left p-3">STATUS</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No coupons match.</td></tr>
            )}
            {visible.map((c) => {
              const status = couponStatus(c);
              return (
                <Fragment key={c.id}>
                  <tr className="border-t border-border">
                    <td className="p-3">
                      <button type="button" onClick={() => toggleOpen(c)} className="text-mono font-semibold inline-flex items-center gap-1 hover:text-primary">
                        <ChevronDown className={`size-3 transition-transform ${openId === c.id ? "rotate-180" : ""}`} /> {c.code}
                      </button>
                      <div className="text-[11px] text-muted-foreground">{c.kind === "welcome" ? "WELCOME" : c.description}</div>
                    </td>
                    <td className="p-3">
                      {couponLabel(c)}
                      {c.max_discount ? <span className="text-muted-foreground text-xs"> · max {formatINR(c.max_discount)}</span> : null}
                      {c.min_order ? <div className="text-muted-foreground text-xs">min {formatINR(c.min_order)}</div> : null}
                    </td>
                    <td className="p-3 text-mono text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td className="p-3 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString("en-IN") : "—"}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => toggleActive(c)} className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${status === "active" ? "border-emerald-500 text-emerald-600" : "border-border text-muted-foreground"}`} title="Click to switch on/off">
                        {status.toUpperCase()}
                      </button>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setDraft(toDraft(c))} className="text-mono text-[10px] tracking-widest hover:text-primary mr-3">EDIT</button>
                      <button type="button" onClick={() => setDeleteTarget(c)} className="text-muted-foreground hover:text-red-500" aria-label={`Delete ${c.code}`}><Trash2 className="size-3.5" /></button>
                    </td>
                  </tr>
                  {openId === c.id && (
                    <tr className="border-t border-border bg-surface/50">
                      <td colSpan={6} className="p-3">
                        {!redemptions[c.id] ? "Loading…" : redemptions[c.id].length === 0 ? <span className="text-muted-foreground text-xs">Not used yet.</span> : (
                          <ul className="text-xs space-y-1">
                            {redemptions[c.id].map((r) => (
                              <li key={r.id} className="flex gap-4">
                                <span className="text-mono">{r.order_id}</span>
                                <span>−{formatINR(r.discount_amount)}</span>
                                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`DELETE ${deleteTarget?.code ?? ""}?`}
        confirmLabel="DELETE"
        destructive
        onConfirm={confirmDelete}
      />

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
