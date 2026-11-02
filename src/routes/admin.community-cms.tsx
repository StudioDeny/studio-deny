import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CommunityPhoto } from "@/types/database";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { MediaField } from "@/components/admin/MediaField";
import { BENTO_SLOTS, BENTO_SLOT_COUNT } from "@/lib/communityBento";
import { thumbImage } from "@/lib/image";

export const Route = createFileRoute("/admin/community-cms")({
  component: CommunityCmsAdmin,
  head: () => ({ meta: [{ title: "Community — STUDIO DENY" }] }),
});

// Slots added on this page get a temporary id until SAVE inserts them.
const DRAFT_PREFIX = "draft-";
const isDraft = (id: string) => id.startsWith(DRAFT_PREFIX);

function CommunityCmsAdmin() {
  const [rows, setRows] = useState<CommunityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("community_photos").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
    setDirty(false);
  };

  useEffect(() => { load(); }, []);

  // Image/handle/order are all local-only until SAVE — nothing writes to
  // the database on every keystroke or click.
  const editLocal = (id: string, patch: Partial<Omit<CommunityPhoto, "id" | "created_at">>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  // A slot added here exists only on this page until SAVE inserts it. Without
  // this, deleting every photo left the page with nothing to click and the
  // homepage section hidden for good (it renders only with photos).
  const addSlot = () => {
    setRows((r) => [
      ...r,
      {
        id: `${DRAFT_PREFIX}${crypto.randomUUID()}`,
        image_url: "",
        media_type: "image",
        handle: null,
        bento_size: "md",
        is_active: true,
        position: r.length,
        created_at: "",
      },
    ]);
    setDirty(true);
  };

  const remove = async (id: string) => {
    if (isDraft(id)) {
      setRows((r) => r.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i })));
      return;
    }
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("community_photos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reorder = (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRows(next.map((r, i) => ({ ...r, position: i })));
    setDirty(true);
  };

  const save = async () => {
    if (rows.some((r) => !r.image_url.trim())) return toast.error("Add a photo or video to every slot before saving.");
    setSaving(true);
    const drafts = rows.filter((r) => isDraft(r.id));
    const results = await Promise.all([
      ...rows
        .filter((r) => !isDraft(r.id))
        .map((r) =>
          supabase
            .from("community_photos")
            .update({ handle: r.handle, image_url: r.image_url, media_type: r.media_type, position: r.position })
            .eq("id", r.id)
        ),
      ...(drafts.length
        ? [
            supabase.from("community_photos").insert(
              drafts.map((r) => ({ handle: r.handle, image_url: r.image_url, media_type: r.media_type, bento_size: r.bento_size, position: r.position, is_active: true }))
            ),
          ]
        : []),
    ]);
    setSaving(false);
    const failed = results.find((res) => res.error);
    if (failed?.error) return toast.error(failed.error.message);
    toast.success("Saved");
    // New rows need their real ids before they can be edited or deleted again.
    if (drafts.length) await load();
    else setDirty(false);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">COMMUNITY.</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage the "Worn By Our Community" bento grid. The layout itself is fixed — exactly {BENTO_SLOT_COUNT}
        {" "}slots, each a fixed shape (hero / tall / wide / standard) — so you choose which photo sits in which
        position. Reorder to change what shows where. The section stays hidden on the homepage until at least
        one photo is saved.
      </p>

      {/* Live-layout preview — same shapes/order as the real homepage section */}
      <div className="mb-8">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">PREVIEW — MATCHES THE HOMEPAGE LAYOUT</div>
        <div className="grid grid-cols-4 auto-rows-[70px] gap-1.5 max-w-md border border-border bg-surface p-2">
          {BENTO_SLOTS.map((slot, idx) => {
            const photo = rows[idx];
            return (
              <div key={idx} className={`relative overflow-hidden border border-border/60 bg-muted/30 ${slot.className}`}>
                {photo?.image_url ? (
                  photo.media_type === "video" ? (
                    <video src={photo.image_url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={thumbImage(photo.image_url, 400)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )
                ) : null}
                <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[8px] font-mono px-1 tracking-widest">
                  {slot.shape.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {rows.map((photo, idx) => {
          const slot = BENTO_SLOTS[idx];
          return (
            <div key={photo.id} className="relative border border-border overflow-hidden bg-surface">
              <div className="relative aspect-square">
                {!photo.image_url ? (
                  <div className="w-full h-full flex items-center justify-center text-mono text-[10px] tracking-widest text-muted-foreground">
                    UPLOAD BELOW
                  </div>
                ) : photo.media_type === "video" ? (
                  <video src={photo.image_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={thumbImage(photo.image_url, 400)} alt={photo.handle ?? ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 tracking-widest">
                  {slot ? slot.shape.toUpperCase() : "NOT SHOWN"}
                </span>
              </div>
              <div className="p-2 space-y-2">
                <input
                  value={photo.handle ?? ""}
                  onChange={(e) => editLocal(photo.id, { handle: e.target.value || null })}
                  className="w-full bg-background border border-border h-7 px-2 text-xs font-mono"
                  placeholder="@handle (optional)"
                />
                <MediaField
                  value={{ url: photo.image_url, type: photo.media_type }}
                  onChange={(v) => editLocal(photo.id, { image_url: v.url, media_type: v.type })}
                />
              </div>
            </div>
          );
        })}
        {rows.length < BENTO_SLOT_COUNT && (
          <button
            type="button"
            onClick={addSlot}
            className="aspect-square border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Plus className="size-5" />
            <span className="text-mono text-[10px] tracking-widest">
              ADD {BENTO_SLOTS[rows.length].shape.toUpperCase()} PHOTO
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50"
        >
          {saving ? "SAVING…" : "SAVE CHANGES"}
        </button>
        {dirty && !saving && (
          <span className="text-mono text-[10px] tracking-widest text-muted-foreground">UNSAVED CHANGES</span>
        )}
      </div>
    </div>
  );
}
