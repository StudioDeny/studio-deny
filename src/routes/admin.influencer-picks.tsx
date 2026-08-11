import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { InfluencerPick, InfluencerVideoSource } from "@/types/database";
import { uploadVideoToCloudinary } from "@/lib/cloudinary";
import { listProducts, type Product } from "@/lib/productsStore";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Upload, X, Search } from "lucide-react";
import { toast } from "sonner";
import { MediaField } from "@/components/admin/MediaField";

export const Route = createFileRoute("/admin/influencer-picks")({
  component: InfluencerPicksAdmin,
  head: () => ({ meta: [{ title: "Influencer Picks — STUDIO DENY" }] }),
});

const EMPTY: Omit<InfluencerPick, "id" | "created_at"> = {
  name: "",
  handle: null,
  video_source: "upload",
  video_url: null,
  link_url: null,
  thumbnail_url: null,
  thumbnail_type: "image",
  quote: null,
  is_active: true,
  position: 0,
};

function InfluencerPicksAdmin() {
  const [rows, setRows] = useState<InfluencerPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<InfluencerPick> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLInputElement>(null);

  // Product tagging state (only usable once the pick has an id)
  const [taggedSlugs, setTaggedSlugs] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("influencer_picks").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { listProducts().then(setAllProducts); }, []);

  const loadTags = async (pickId: string) => {
    const { data } = await supabase.from("influencer_pick_products").select("product_slug").eq("influencer_pick_id", pickId).order("position");
    setTaggedSlugs((data ?? []).map((r) => r.product_slug));
  };

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("influencer_picks").update({ is_active: val }).eq("id", id);
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
    await Promise.all(next.map((r, i) => supabase.from("influencer_picks").update({ position: i }).eq("id", r.id)));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this influencer pick?")) return;
    const { error } = await supabase.from("influencer_picks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const openModal = (row: Partial<InfluencerPick> | null) => {
    setModal(row ?? { ...EMPTY });
    setProductQuery("");
    if (row?.id) loadTags(row.id);
    else setTaggedSlugs([]);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoProgress(0);
    try {
      const result = await uploadVideoToCloudinary(file, setVideoProgress);
      setModal((m) => (m ? { ...m, video_url: result.secure_url } : m));
      toast.success("Video uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploadingVideo(false);
      setVideoProgress(0);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.name?.trim()) return toast.error("Name is required");
    if (modal.video_source === "upload" && !modal.video_url?.trim()) return toast.error("Upload a video, or switch to pasting a link");
    if (modal.video_source === "link" && !modal.link_url?.trim()) return toast.error("Paste a reel link, or switch to uploading a video");
    setSaving(true);
    const payload = {
      name: modal.name,
      handle: modal.handle || null,
      video_source: modal.video_source ?? "upload",
      video_url: modal.video_url || null,
      link_url: modal.link_url || null,
      thumbnail_url: modal.thumbnail_url || null,
      thumbnail_type: modal.thumbnail_type ?? "image",
      quote: modal.quote || null,
      is_active: modal.is_active ?? true,
      position: modal.position ?? 0,
    };
    if (modal.id) {
      const { error } = await supabase.from("influencer_picks").update(payload).eq("id", modal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Updated");
      setSaving(false);
      load();
    } else {
      const { data, error } = await supabase.from("influencer_picks").insert({ ...payload, position: rows.length }).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Created — now tag any products worn in this video below");
      setSaving(false);
      setModal(data);
      load();
    }
  };

  const addTag = async (slug: string) => {
    if (!modal?.id) return;
    if (taggedSlugs.includes(slug)) return;
    const { error } = await supabase.from("influencer_pick_products").insert({ influencer_pick_id: modal.id, product_slug: slug, position: taggedSlugs.length });
    if (error) return toast.error(error.message);
    setTaggedSlugs((s) => [...s, slug]);
  };

  const removeTag = async (slug: string) => {
    if (!modal?.id) return;
    const { error } = await supabase.from("influencer_pick_products").delete().eq("influencer_pick_id", modal.id).eq("product_slug", slug);
    if (error) return toast.error(error.message);
    setTaggedSlugs((s) => s.filter((x) => x !== slug));
  };

  const matches = productQuery.trim()
    ? allProducts.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 8)
    : [];

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-display text-4xl md:text-5xl">INFLUENCER PICKS.</h1>
          <p className="text-muted-foreground text-sm mt-1">Paste a reel link or upload a video, then tag the products worn in it.</p>
        </div>
        <button onClick={() => openModal(null)} className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary">
          <Plus className="size-4" /> NEW
        </button>
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">INFLUENCER</th>
              <th className="text-left p-3 hidden md:table-cell">SOURCE</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder(r.id, -1)} disabled={idx === 0} className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronUp className="size-3" />
                    </button>
                    <button onClick={() => reorder(r.id, 1)} disabled={idx === rows.length - 1} className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt={r.name} className="w-10 h-12 object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-10 h-12 bg-muted flex items-center justify-center text-mono text-[10px] flex-shrink-0">{r.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      {r.handle && <div className="text-muted-foreground text-xs">{r.handle}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-mono text-xs uppercase text-muted-foreground">{r.video_source}</td>
                <td className="p-3">
                  <button onClick={() => toggle(r.id, !r.is_active)} className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${r.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => openModal(r)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
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
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No influencer picks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{modal.id ? "EDIT" : "NEW"} INFLUENCER PICK</div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="NAME *"><input value={modal.name ?? ""} onChange={(e) => setModal({ ...modal, name: e.target.value })} className="inp" /></F>
                <F label="HANDLE"><input value={modal.handle ?? ""} onChange={(e) => setModal({ ...modal, handle: e.target.value })} className="inp" placeholder="@handle" /></F>
              </div>
              <F label="QUOTE (optional)"><textarea rows={2} value={modal.quote ?? ""} onChange={(e) => setModal({ ...modal, quote: e.target.value })} className="inp" /></F>

              <F label="VIDEO SOURCE">
                <select
                  value={modal.video_source ?? "upload"}
                  onChange={(e) => setModal({ ...modal, video_source: e.target.value as InfluencerVideoSource })}
                  className="inp" style={{ cursor: "pointer" }}
                >
                  <option value="upload">Upload a video file (plays on hover in the grid)</option>
                  <option value="link">Paste a reel link (Instagram / YouTube — opens on click)</option>
                </select>
              </F>

              {modal.video_source === "link" ? (
                <F label="REEL LINK *"><input value={modal.link_url ?? ""} onChange={(e) => setModal({ ...modal, link_url: e.target.value })} className="inp" placeholder="https://instagram.com/reel/…" /></F>
              ) : (
                <F label="VIDEO FILE *">
                  <div className="flex items-center gap-3">
                    {modal.video_url && <video src={modal.video_url} className="w-16 h-20 object-cover border border-border" muted />}
                    <div className="flex flex-col gap-2 flex-1">
                      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      <button type="button" onClick={() => videoRef.current?.click()} disabled={uploadingVideo}
                        className="border border-border h-9 px-3 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary disabled:opacity-50">
                        <Upload className="size-3" /> {uploadingVideo ? `UPLOADING… ${videoProgress}%` : "UPLOAD VIDEO"}
                      </button>
                    </div>
                  </div>
                </F>
              )}

              <MediaField
                label="THUMBNAIL (shown in the grid before hover / for reel links)"
                value={{ url: modal.thumbnail_url ?? "", type: modal.thumbnail_type ?? "image" }}
                onChange={(v) => setModal({ ...modal, thumbnail_url: v.url, thumbnail_type: v.type })}
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={modal.is_active ?? true} onChange={(e) => setModal({ ...modal, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-mono text-[11px] tracking-widest">ACTIVE</span>
              </label>

              <div className="border-t border-border pt-4">
                <div className="text-[11px] font-semibold tracking-widest text-foreground mb-2">TAGGED PRODUCTS</div>
                {!modal.id ? (
                  <p className="text-sm text-muted-foreground">Save this pick first, then come back here to tag products worn in it.</p>
                ) : (
                  <>
                    {taggedSlugs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {taggedSlugs.map((slug) => {
                          const p = allProducts.find((x) => x.slug === slug);
                          return (
                            <span key={slug} className="inline-flex items-center gap-2 border border-border bg-muted/40 rounded-full pl-1 pr-2 py-1 text-xs">
                              {p?.image && <img src={p.image} alt="" className="size-5 rounded-full object-cover" />}
                              {p?.name ?? slug}
                              <button onClick={() => removeTag(slug)} className="text-muted-foreground hover:text-red-500"><X className="size-3" /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products to tag…" className="inp" style={{ paddingLeft: "2.25rem" }} />
                    </div>
                    {matches.length > 0 && (
                      <div className="border border-border rounded mt-2 divide-y divide-border max-h-40 overflow-y-auto">
                        {matches.map((p) => (
                          <button key={p.slug} onClick={() => addTag(p.slug)} disabled={taggedSlugs.includes(p.slug)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/40 text-left disabled:opacity-40">
                            <img src={p.image} alt="" className="size-8 object-cover" />
                            <span className="text-sm flex-1">{p.name}</span>
                            {taggedSlugs.includes(p.slug) ? <span className="text-mono text-[10px] text-muted-foreground">TAGGED</span> : <Plus className="size-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setModal(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CLOSE</button>
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
