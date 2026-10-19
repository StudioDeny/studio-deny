import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Cake, ChevronDown, Loader2 } from "lucide-react";

// Admin → Coupons: pick a birth month, tick customers, release one personal
// single-use code to each (issue_birthday_coupons). Customers see it under
// Account → My Coupons and in the checkout coupon list.

type Customer = { user_id: string; name: string | null; email: string | null; phone: string | null; dob: string };

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const istPart = (part: "year" | "month") =>
  Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", [part]: "numeric" }).format(new Date()));

export function BirthdayCoupons({ onReleased }: { onReleased: () => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(istPart("month"));
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sentThisYear, setSentThisYear] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [offer, setOffer] = useState({ type: "percent" as "percent" | "fixed", value: "15", maxDiscount: "", minOrder: "", days: "30" });
  const [confirming, setConfirming] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const load = async () => {
    const year = istPart("year");
    const [people, sent] = await Promise.all([
      supabase.from("profiles").select("user_id, name, email, phone, dob").not("dob", "is", null),
      supabase.from("coupons").select("assigned_user_id").eq("kind", "birthday").gte("created_at", `${year}-01-01T00:00:00+05:30`),
    ]);
    if (people.error) {
      setLoadError("Birthdays aren't set up in the database yet (the 20261019000001 update hasn't been applied).");
      setCustomers([]);
      return;
    }
    setLoadError(null);
    setCustomers((people.data as Customer[]) ?? []);
    setSentThisYear(new Set(((sent.data ?? []) as { assigned_user_id: string | null }[]).map((r) => r.assigned_user_id ?? "")));
  };
  useEffect(() => { if (open && customers === null) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const inMonth = useMemo(
    () => (customers ?? [])
      .filter((c) => Number(c.dob.slice(5, 7)) === month)
      .sort((a, b) => a.dob.slice(8, 10).localeCompare(b.dob.slice(8, 10))),
    [customers, month],
  );
  // Default selection: everyone in the month who hasn't had a code this year.
  useEffect(() => {
    setPicked(new Set(inMonth.filter((c) => !sentThisYear.has(c.user_id)).map((c) => c.user_id)));
  }, [inMonth, sentThisYear]);

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const offerProblem = (): string | null => {
    const v = Number(offer.value);
    if (!(v > 0)) return "Discount must be more than 0";
    if (offer.type === "percent" && v > 100) return "Percent discount can't be over 100";
    if (offer.maxDiscount && !(Number(offer.maxDiscount) > 0)) return "Max discount must be blank or more than 0";
    if (offer.minOrder && !(Number(offer.minOrder) > 0)) return "Min order must be blank or more than 0";
    const d = Number(offer.days);
    if (!Number.isInteger(d) || d < 1 || d > 365) return "Valid for: 1–365 days";
    if (picked.size === 0) return "Tick at least one customer";
    return null;
  };
  const askRelease = () => {
    const problem = offerProblem();
    if (problem) return toast.error(problem);
    setConfirming(true);
  };
  const release = async () => {
    setReleasing(true);
    const { data, error } = await supabase.rpc("issue_birthday_coupons" as never, {
      p_user_ids: [...picked],
      p_discount_type: offer.type,
      p_discount_value: Number(offer.value),
      p_max_discount: offer.maxDiscount ? Number(offer.maxDiscount) : null,
      p_min_order: offer.minOrder ? Number(offer.minOrder) : null,
      p_valid_days: Number(offer.days),
    } as never);
    setReleasing(false);
    if (error) return toast.error(error.message);
    const n = Number(data ?? 0);
    toast.success(n > 0 ? `Done — ${n} birthday code${n > 1 ? "s" : ""} released` : "Nothing released — they already have a code this year");
    await load();
    onReleased();
  };

  const offerText = `${offer.type === "percent" ? `${offer.value}%` : `₹${offer.value}`} off`;

  return (
    <div className="border border-border mb-6">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface">
        <span className="inline-flex items-center gap-2 text-mono text-xs tracking-widest font-semibold"><Cake className="size-4" /> BIRTHDAY COUPONS</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <div className="lbl">BIRTHDAYS IN</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="inp !w-auto">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <span className="text-xs text-muted-foreground pb-3">
              {customers === null ? "Loading…" : `${inMonth.length} customer${inMonth.length === 1 ? "" : "s"} · ${picked.size} ticked`}
            </span>
          </div>

          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : (
            <div className="border border-border max-h-72 overflow-y-auto">
              {inMonth.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No customer birthdays saved for {MONTHS[month - 1].toLowerCase()}.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {inMonth.map((c) => {
                      const sent = sentThisYear.has(c.user_id);
                      return (
                        <tr key={c.user_id} className="border-t border-border first:border-t-0">
                          <td className="p-2 w-8">
                            <input type="checkbox" checked={picked.has(c.user_id)} disabled={sent} onChange={() => toggle(c.user_id)} aria-label={`Pick ${c.name ?? c.email}`} />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{c.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="p-2 text-mono text-xs whitespace-nowrap">{Number(c.dob.slice(8, 10))} {MONTHS[month - 1].slice(0, 3)}</td>
                          <td className="p-2 text-right text-mono text-[10px] tracking-widest text-muted-foreground whitespace-nowrap">{sent ? "SENT THIS YEAR" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <label className="block">
              <div className="lbl">TYPE</div>
              <select value={offer.type} onChange={(e) => setOffer((o) => ({ ...o, type: e.target.value as "percent" | "fixed" }))} className="inp">
                <option value="percent">% OFF</option>
                <option value="fixed">₹ OFF</option>
              </select>
            </label>
            <label className="block">
              <div className="lbl">{offer.type === "percent" ? "PERCENT" : "AMOUNT ₹"}</div>
              <input value={offer.value} onChange={(e) => setOffer((o) => ({ ...o, value: e.target.value }))} inputMode="decimal" className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MAX OFF ₹ (OPTIONAL)</div>
              <input value={offer.maxDiscount} onChange={(e) => setOffer((o) => ({ ...o, maxDiscount: e.target.value }))} inputMode="decimal" className="inp" />
            </label>
            <label className="block">
              <div className="lbl">MIN ORDER ₹ (OPTIONAL)</div>
              <input value={offer.minOrder} onChange={(e) => setOffer((o) => ({ ...o, minOrder: e.target.value }))} inputMode="decimal" className="inp" />
            </label>
            <label className="block">
              <div className="lbl">VALID FOR (DAYS)</div>
              <input value={offer.days} onChange={(e) => setOffer((o) => ({ ...o, days: e.target.value }))} inputMode="numeric" className="inp" />
            </label>
          </div>

          <button type="button" onClick={askRelease} disabled={releasing || !!loadError} className="h-10 px-6 bg-foreground text-background text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
            {releasing && <Loader2 className="size-3.5 animate-spin" />} RELEASE TO {picked.size} CUSTOMER{picked.size === 1 ? "" : "S"}
          </button>
          <p className="text-xs text-muted-foreground">Each customer gets their own single-use code (BDAY-…), shown in their account and at checkout. One per customer per year.</p>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`RELEASE ${picked.size} BIRTHDAY CODE${picked.size === 1 ? "" : "S"}?`}
        description={`${offerText}${offer.minOrder ? ` on orders of ₹${offer.minOrder}+` : ""}, valid for ${offer.days} days.`}
        confirmLabel="YES, RELEASE"
        onConfirm={release}
      />
    </div>
  );
}
