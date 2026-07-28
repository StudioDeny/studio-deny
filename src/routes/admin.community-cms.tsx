import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto, BentoSize } from "@/types/database";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/community-cms")({
  component: CommunityCmsAdmin,
  head: () => ({ meta: [{ title: "Community — STUDIO DENY" }] }),
});

const BENTO_SIZES: BentoSize[] = ["sm", "md", "lg", "wide", "tall"];

function CommunityCmsAdmin() {
  const [rows, setRows] = useState<CommunityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("community_photos").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Omit<CommunityPhoto, "id" | "created_at">>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("community_photos").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("community_photos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRows(next.map((r, i) => ({ ...r, position: i })));
    await Promise.all(next.map((r, i) => supabase.from("community_photos").update({ position: i }).eq("id", r.id)));
  };

  const addFromFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      const { data, error } = await supabase
        .from("community_photos")
        .insert({ image_url: result.secure_url, handle: null, bento_size: "md", is_active: true, position: rows.length })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setRows((r) => [...r, data]);
      toast.success("Photo added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">COMMUNITY.</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage the "Worn By Our Community" bento grid. Admin-curated images only — these tiles are purely visual, no click-through.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {rows.map((photo, idx) => (
          <div key={photo.id} className="relative border border-border overflow-hidden bg-surface">
            <div className="relative aspect-square">
              <img src={photo.image_url} alt={photo.handle ?? ""} className="w-full h-full object-cover" />
              <button type="button" onClick={() => remove(photo.id)}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                <Trash2 className="size-3" />
              </button>
              <div className="absolute top-1 left-1 flex gap-1">
                <button type="button" onClick={() => reorder(photo.id, -1)} disabled={idx === 0}
                  className="bg-black/70 text-white rounded-full p-1 hover:bg-primary disabled:opacity-30 transition-colors">
                  <ChevronLeft className="size-3" />
                </button>
                <button type="button" onClick={() => reorder(photo.id, 1)} disabled={idx === rows.length - 1}
                  className="bg-black/70 text-white rounded-full p-1 hover:bg-primary disabled:opacity-30 transition-colors">
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
            <div className="p-2 space-y-2">
              <input
                value={photo.handle ?? ""}
                onChange={(e) => setRows((r) => r.map((x) => (x.id === photo.id ? { ...x, handle: e.target.value } : x)))}
                onBlur={(e) => update(photo.id, { handle: e.target.value || null })}
                className="w-full bg-background border border-border h-7 px-2 text-xs font-mono"
                placeholder="@handle (optional)"
              />
              <select
                value={photo.bento_size}
                onChange={(e) => update(photo.id, { bento_size: e.target.value as BentoSize })}
                className="w-full bg-background border border-border h-7 px-2 text-xs font-mono"
                style={{ cursor: "pointer" }}
              >
                {BENTO_SIZES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        ))}

        <label className="aspect-square border border-dashed border-border hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5 text-muted-foreground" />}
          <span className="text-mono text-[10px] tracking-widest text-muted-foreground">
            <Upload className="inline size-3 mr-1" /> ADD PHOTO
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) addFromFile(f); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}
