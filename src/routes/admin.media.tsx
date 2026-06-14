import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { MediaAsset } from "@/types/database";
import { Upload, Copy, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/media")({
  component: AdminMedia,
});

function fmtBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function AdminMedia() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setAssets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const folders = [...new Set(assets.map((a) => a.folder ?? "").filter(Boolean))];

  const filtered = assets.filter((a) => {
    const matchQ = !q || a.public_id.toLowerCase().includes(q.toLowerCase()) || (a.alt_text ?? "").toLowerCase().includes(q.toLowerCase());
    const matchFolder = !folderFilter || a.folder === folderFilter;
    return matchQ && matchFolder;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadToCloudinary(file);
        await supabase.from("media_assets").insert({
          public_id: result.public_id,
          secure_url: result.secure_url,
          alt_text: null,
          folder: result.folder || null,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      }
      toast.success(`${files.length} file(s) uploaded`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("URL copied!")).catch(() => toast.error("Copy failed"));
  };

  const saveAlt = async (id: string) => {
    const { error } = await supabase.from("media_assets").update({ alt_text: editingAlt }).eq("id", id);
    if (error) return toast.error(error.message);
    setAssets((a) => a.map((x) => (x.id === id ? { ...x, alt_text: editingAlt } : x)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, alt_text: editingAlt } : s);
    setEditingAlt(null);
    toast.success("Alt text saved");
  };

  const remove = async (id: string, publicId: string) => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    const { error } = await supabase.from("media_assets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAssets((a) => a.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success(`Deleted ${publicId}`);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">MEDIA LIBRARY.</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50"
          >
            <Upload className="size-4" /> {uploading ? "UPLOADING…" : "UPLOAD"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search assets…"
            className="bg-background border border-border h-10 pl-9 pr-3 text-sm w-48"
          />
        </div>
        {folders.length > 0 && (
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            className="bg-background border border-border h-10 px-3 text-sm text-mono"
          >
            <option value="">ALL FOLDERS</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground self-center">
          {filtered.length} ASSETS
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="border border-border bg-surface p-12 text-center text-muted-foreground text-sm">
              No assets found. Upload your first image.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setEditingAlt(a.alt_text ?? null); }}
                  className={`group relative aspect-square overflow-hidden border-2 ${selected?.id === a.id ? "border-primary" : "border-border hover:border-primary/50"} bg-surface`}
                >
                  <img src={a.secure_url} alt={a.alt_text ?? ""} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-1 opacity-0 group-hover:opacity-100">
                    <span className="text-mono text-[9px] tracking-widest text-white bg-black/70 px-1">{a.format?.toUpperCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="w-72 flex-shrink-0 border border-border bg-surface p-4 space-y-4 sticky top-20 self-start">
            <div className="flex items-center justify-between">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">ASSET DETAILS</div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <img src={selected.secure_url} alt={selected.alt_text ?? ""} className="w-full aspect-square object-contain bg-muted" />
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground">PUBLIC ID</div>
                <div className="font-mono text-[11px] break-all mt-0.5">{selected.public_id}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground">WIDTH</div>
                  <div className="text-mono text-[11px]">{selected.width ?? "—"}px</div>
                </div>
                <div>
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground">HEIGHT</div>
                  <div className="text-mono text-[11px]">{selected.height ?? "—"}px</div>
                </div>
                <div>
                  <div className="text-mono text-[10px] tracking-widest text-muted-foreground">SIZE</div>
                  <div className="text-mono text-[11px]">{fmtBytes(selected.bytes)}</div>
                </div>
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">ALT TEXT</div>
                <div className="flex gap-1">
                  <input
                    value={editingAlt ?? ""}
                    onChange={(e) => setEditingAlt(e.target.value)}
                    placeholder="Describe this image…"
                    className="flex-1 bg-background border border-border h-8 px-2 text-xs font-mono"
                  />
                  <button
                    onClick={() => saveAlt(selected.id)}
                    className="border border-border h-8 px-2 text-mono text-[10px] hover:border-primary hover:text-primary"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => copyUrl(selected.secure_url)}
                className="w-full border border-border h-9 inline-flex items-center justify-center gap-2 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary"
              >
                <Copy className="size-3" /> COPY URL
              </button>
              <button
                onClick={() => remove(selected.id, selected.public_id)}
                className="w-full border border-border h-9 inline-flex items-center justify-center gap-2 text-mono text-[10px] tracking-widest hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" /> DELETE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
