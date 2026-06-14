import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AnnouncementBar } from "@/types/database";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

const EMPTY: Omit<AnnouncementBar, "id" | "created_at"> = {
  message: "",
  cta_label: null,
  cta_href: null,
  bg_color: "#c8f135",
  text_color: "#0a0a0a",
  is_active: true,
  position: 0,
  starts_at: null,
  ends_at: null,
};

function AdminAnnouncements() {
  const [rows, setRows] = useState<AnnouncementBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<AnnouncementBar> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("announcement_bars")
      .select("*")
      .order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase
      .from("announcement_bars")
      .update({ is_active: val })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, is_active: val } : x)));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updates = next.map((r, i) => ({ id: r.id, position: i }));
    setRows(next.map((r, i) => ({ ...r, position: i })));
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from("announcement_bars").update({ position }).eq("id", id)
      )
    );
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement bar?")) return;
    const { error } = await supabase.from("announcement_bars").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.message?.trim()) return toast.error("Message is required");
    setSaving(true);
    if (modal.id) {
      const { error } = await supabase
        .from("announcement_bars")
        .update({
          message: modal.message,
          cta_label: modal.cta_label || null,
          cta_href: modal.cta_href || null,
          bg_color: modal.bg_color ?? "#c8f135",
          text_color: modal.text_color ?? "#0a0a0a",
          is_active: modal.is_active ?? true,
          position: modal.position ?? 0,
          starts_at: modal.starts_at || null,
          ends_at: modal.ends_at || null,
        })
        .eq("id", modal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("announcement_bars").insert({
        message: modal.message,
        cta_label: modal.cta_label || null,
        cta_href: modal.cta_href || null,
        bg_color: modal.bg_color ?? "#c8f135",
        text_color: modal.text_color ?? "#0a0a0a",
        is_active: modal.is_active ?? true,
        position: rows.length,
        starts_at: modal.starts_at || null,
        ends_at: modal.ends_at || null,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Created");
    }
    setSaving(false);
    setModal(null);
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">ANNOUNCEMENTS.</h1>
        <button
          onClick={() => setModal({ ...EMPTY })}
          className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary"
        >
          <Plus className="size-4" /> NEW BAR
        </button>
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">MESSAGE</th>
              <th className="text-left p-3 hidden md:table-cell">COLORS</th>
              <th className="text-left p-3 hidden lg:table-cell">SCHEDULE</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => reorder(r.id, -1)}
                      disabled={idx === 0}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      onClick={() => reorder(r.id, 1)}
                      disabled={idx === rows.length - 1}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-semibold truncate max-w-[200px]">{r.message}</div>
                  {r.cta_label && (
                    <div className="text-mono text-[10px] text-muted-foreground mt-0.5">{r.cta_label} → {r.cta_href}</div>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-sm border border-border" style={{ background: r.bg_color }} title={r.bg_color} />
                    <div className="h-5 w-5 rounded-sm border border-border" style={{ background: r.text_color }} title={r.text_color} />
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell text-mono text-[10px] text-muted-foreground">
                  {r.starts_at ? new Date(r.starts_at).toLocaleDateString() : "—"}
                  {r.ends_at ? ` → ${new Date(r.ends_at).toLocaleDateString()}` : ""}
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
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No announcement bars yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{modal.id ? "EDIT" : "NEW"} ANNOUNCEMENT BAR</div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <F label="MESSAGE *">
                <input value={modal.message ?? ""} onChange={(e) => setModal({ ...modal, message: e.target.value })} className="inp" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="CTA LABEL">
                  <input value={modal.cta_label ?? ""} onChange={(e) => setModal({ ...modal, cta_label: e.target.value })} className="inp" />
                </F>
                <F label="CTA URL">
                  <input value={modal.cta_href ?? ""} onChange={(e) => setModal({ ...modal, cta_href: e.target.value })} className="inp" />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="BACKGROUND COLOR">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={modal.bg_color ?? "#c8f135"} onChange={(e) => setModal({ ...modal, bg_color: e.target.value })} className="h-10 w-10 cursor-pointer border border-border bg-background p-0.5" />
                    <input value={modal.bg_color ?? "#c8f135"} onChange={(e) => setModal({ ...modal, bg_color: e.target.value })} className="inp flex-1" />
                  </div>
                </F>
                <F label="TEXT COLOR">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={modal.text_color ?? "#0a0a0a"} onChange={(e) => setModal({ ...modal, text_color: e.target.value })} className="h-10 w-10 cursor-pointer border border-border bg-background p-0.5" />
                    <input value={modal.text_color ?? "#0a0a0a"} onChange={(e) => setModal({ ...modal, text_color: e.target.value })} className="inp flex-1" />
                  </div>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="STARTS AT">
                  <input type="datetime-local" value={modal.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setModal({ ...modal, starts_at: e.target.value || null })} className="inp" />
                </F>
                <F label="ENDS AT">
                  <input type="datetime-local" value={modal.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setModal({ ...modal, ends_at: e.target.value || null })} className="inp" />
                </F>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={modal.is_active ?? true} onChange={(e) => setModal({ ...modal, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-mono text-[11px] tracking-widest">ACTIVE</span>
              </label>

              <div className="border border-border p-3" style={{ background: modal.bg_color ?? "#c8f135", color: modal.text_color ?? "#0a0a0a" }}>
                <div className="text-xs font-semibold tracking-widest uppercase truncate">{modal.message || "Preview text"}</div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setModal(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}`}</style>
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
