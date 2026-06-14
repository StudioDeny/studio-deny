import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FaqItem, FaqCategory } from "@/types/database";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/faq")({
  component: AdminFaq,
});

const CATEGORIES: FaqCategory[] = ["general", "orders", "shipping", "returns", "sizing"];

const EMPTY: Omit<FaqItem, "id" | "created_at"> = {
  question: "",
  answer: "",
  category: "general",
  is_active: true,
  position: 0,
};

function AdminFaq() {
  const [rows, setRows] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<FaqItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const load = async () => {
    const { data, error } = await supabase.from("faq_items").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filterCat === "all" ? rows : rows.filter((r) => r.category === filterCat);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("faq_items").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, is_active: val } : x)));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const allIds = filtered.map((r) => r.id);
    const idx = allIds.indexOf(id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const next = [...filtered];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updated = next.map((r, i) => ({ ...r, position: i }));
    setRows((r) => {
      const m = new Map(updated.map((x) => [x.id, x]));
      return r.map((x) => m.get(x.id) ?? x);
    });
    await Promise.all(
      updated.map(({ id, position }) => supabase.from("faq_items").update({ position }).eq("id", id))
    );
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ item?")) return;
    const { error } = await supabase.from("faq_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.question?.trim()) return toast.error("Question is required");
    if (!modal.answer?.trim()) return toast.error("Answer is required");
    setSaving(true);
    if (modal.id) {
      const { error } = await supabase.from("faq_items").update({
        question: modal.question,
        answer: modal.answer,
        category: modal.category ?? "general",
        is_active: modal.is_active ?? true,
        position: modal.position ?? 0,
      }).eq("id", modal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("faq_items").insert({
        question: modal.question!,
        answer: modal.answer!,
        category: modal.category ?? "general",
        is_active: modal.is_active ?? true,
        position: rows.length,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success(modal.id ? "Updated" : "Created");
    setSaving(false);
    setModal(null);
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">FAQ.</h1>
        <button
          onClick={() => setModal({ ...EMPTY })}
          className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary"
        >
          <Plus className="size-4" /> NEW ITEM
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`text-mono text-[10px] tracking-widest px-3 h-8 border ${filterCat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">QUESTION</th>
              <th className="text-left p-3 hidden md:table-cell">CATEGORY</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r, idx) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder(r.id, -1)} disabled={idx === 0}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronUp className="size-3" />
                    </button>
                    <button onClick={() => reorder(r.id, 1)} disabled={idx === filtered.length - 1}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-semibold truncate max-w-[280px]">{r.question}</div>
                  <div className="text-muted-foreground text-xs mt-0.5 truncate max-w-[280px]">{r.answer}</div>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-border text-muted-foreground">
                    {r.category.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggle(r.id, !r.is_active)}
                    className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${r.is_active ? "border-secondary text-secondary" : "border-border text-muted-foreground"}`}
                  >
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setModal(r)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                      <Pencil className="size-3" />
                    </button>
                    <button onClick={() => remove(r.id)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No FAQ items. Add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{modal.id ? "EDIT" : "NEW"} FAQ ITEM</div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5 space-y-4">
              <F label="QUESTION *">
                <input value={modal.question ?? ""} onChange={(e) => setModal({ ...modal, question: e.target.value })} className="inp" />
              </F>
              <F label="ANSWER *">
                <textarea rows={5} value={modal.answer ?? ""} onChange={(e) => setModal({ ...modal, answer: e.target.value })} className="inp" />
              </F>
              <F label="CATEGORY">
                <select value={modal.category ?? "general"} onChange={(e) => setModal({ ...modal, category: e.target.value as FaqCategory })} className="inp">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </F>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={modal.is_active ?? true} onChange={(e) => setModal({ ...modal, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-mono text-[11px] tracking-widest">ACTIVE</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setModal(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}select.inp{cursor:pointer}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
