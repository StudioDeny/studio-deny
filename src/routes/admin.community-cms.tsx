import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto, BentoSize } from "@/types/database";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";

export const Route = createFileRoute("/admin/community-cms")({
  component: CommunityCmsAdmin,
  head: () => ({ meta: [{ title: "Community — STUDIO DENY" }] }),
});

const BENTO_SIZES: BentoSize[] = ["sm", "md", "lg", "wide", "tall"];

function CommunityCmsAdmin() {
  const [rows, setRows] = useState<CommunityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMedia, setNewMedia] = useState<MediaValue>({ url: "", type: "image" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("community_photos").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Omit<CommunityPhoto, "id" | "created_at">>) => {
    // Each bento slot on the homepage is keyed by size — two photos claiming
    // the same size would silently fight over the same slot, so this is
    // enforced here rather than letting the grid quietly break.
    if (patch.bento_size) {
      const clash = rows.find((r) => r.id !== id && r.bento_size === patch.bento_size);
      if (clash) {
        toast.error(`Two photos can't share the same size — ${clash.handle ?? "another photo"} is already ${patch.bento_size.toUpperCase()}`);
        setRows((r) => [...r]); // force the <select> back to its stored value
        return;
      }
    }
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

  // The bento grid has exactly one slot per size (sm/md/lg/wide/tall) — once
  // every size is taken there's nowhere left to put another photo, so that's
  // the real cap, not an arbitrary count.
  const usedSizes = new Set(rows.map((r) => r.bento_size));
  const nextAvailableSize = BENTO_SIZES.find((s) => !usedSizes.has(s));

  const addPhoto = async () => {
    if (!newMedia.url.trim()) return toast.error("Add an image/video URL, or upload one, first");
    if (!nextAvailableSize) {
      return toast.error(`All ${BENTO_SIZES.length} sizes are already in use — resize or remove a photo before adding another`);
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("community_photos")
      .insert({ image_url: newMedia.url, media_type: newMedia.type, handle: null, bento_size: nextAvailableSize, is_active: true, position: rows.length })
      .select()
      .single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setRows((r) => [...r, data]);
    setNewMedia({ url: "", type: "image" });
    toast.success("Added");
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
              {photo.media_type === "video" ? (
                <video src={photo.image_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={photo.image_url} alt={photo.handle ?? ""} className="w-full h-full object-cover" />
              )}
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
              <div className="inline-flex border border-border rounded overflow-hidden w-full">
                {(["image", "video"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update(photo.id, { media_type: t })}
                    className={`flex-1 h-7 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
                      photo.media_type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {nextAvailableSize ? (
          <div className="aspect-square border border-dashed border-border p-3 flex flex-col justify-center gap-2">
            <MediaField value={newMedia} onChange={setNewMedia} />
            <button
              type="button"
              onClick={addPhoto}
              disabled={adding}
              className="w-full h-8 border border-border text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {adding ? "ADDING…" : `ADD (${nextAvailableSize.toUpperCase()})`}
            </button>
          </div>
        ) : (
          <div className="aspect-square border border-dashed border-border p-3 flex flex-col items-center justify-center text-center gap-1">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground">ALL {BENTO_SIZES.length} SIZES USED</div>
            <div className="text-mono text-[9px] text-muted-foreground/70">Resize or remove a photo to add another</div>
          </div>
        )}
      </div>
    </div>
  );
}
