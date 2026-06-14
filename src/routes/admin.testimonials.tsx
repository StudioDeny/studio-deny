import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Testimonial } from "@/types/database";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Star, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/testimonials")({
  component: AdminTestimonials,
});

const EMPTY: Omit<Testimonial, "id" | "created_at"> = {
  name: "",
  role: null,
  avatar: null,
  body: "",
  rating: 5,
  is_active: true,
  position: 0,
};

function AdminTestimonials() {
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Testimonial> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from("testimonials").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("testimonials").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, is_active: val } : x)));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRows(next.map((r, i) => ({ ...r, position: i })));
    await Promise.all(
      next.map((r, i) => supabase.from("testimonials").update({ position: i }).eq("id", r.id))
    );
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      setModal((m) => m ? { ...m, avatar: result.secure_url } : m);
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.name?.trim()) return toast.error("Name is required");
    if (!modal.body?.trim()) return toast.error("Review body is required");
    setSaving(true);
    const payload = {
      name: modal.name,
      role: modal.role || null,
      avatar: modal.avatar || null,
      body: modal.body,
      rating: modal.rating ?? 5,
      is_active: modal.is_active ?? true,
      position: modal.position ?? 0,
    };
    if (modal.id) {
      const { error } = await supabase.from("testimonials").update(payload).eq("id", modal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("testimonials").insert({ ...payload, position: rows.length });
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
        <h1 className="text-display text-4xl md:text-5xl">TESTIMONIALS.</h1>
        <button
          onClick={() => setModal({ ...EMPTY })}
          className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary"
        >
          <Plus className="size-4" /> NEW
        </button>
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">PERSON</th>
              <th className="text-left p-3 hidden md:table-cell">RATING</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder(r.id, -1)} disabled={idx === 0}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronUp className="size-3" />
                    </button>
                    <button onClick={() => reorder(r.id, 1)} disabled={idx === rows.length - 1}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.avatar ? (
                      <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-mono text-xs flex-shrink-0">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      {r.role && <div className="text-muted-foreground text-xs">{r.role}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
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
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No testimonials yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{modal.id ? "EDIT" : "NEW"} TESTIMONIAL</div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="NAME *">
                  <input value={modal.name ?? ""} onChange={(e) => setModal({ ...modal, name: e.target.value })} className="inp" />
                </F>
                <F label="ROLE / TITLE">
                  <input value={modal.role ?? ""} onChange={(e) => setModal({ ...modal, role: e.target.value })} className="inp" />
                </F>
              </div>
              <F label="REVIEW BODY *">
                <textarea rows={4} value={modal.body ?? ""} onChange={(e) => setModal({ ...modal, body: e.target.value })} className="inp" />
              </F>
              <F label="RATING">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setModal({ ...modal, rating: n })}
                      className="p-1"
                    >
                      <Star className={`size-5 ${n <= (modal.rating ?? 5) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                  <span className="text-mono text-[11px] text-muted-foreground self-center ml-1">{modal.rating ?? 5}/5</span>
                </div>
              </F>
              <F label="AVATAR">
                <div className="flex items-center gap-3">
                  {modal.avatar && <img src={modal.avatar} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />}
                  <div className="flex flex-col gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="border border-border h-9 px-3 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <Upload className="size-3" /> {uploading ? "UPLOADING…" : "UPLOAD"}
                    </button>
                    <input value={modal.avatar ?? ""} onChange={(e) => setModal({ ...modal, avatar: e.target.value })} placeholder="or paste URL" className="inp" style={{ height: 36 }} />
                  </div>
                </div>
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
