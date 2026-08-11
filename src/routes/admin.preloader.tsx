import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/preloader")({
  component: AdminPreloader,
});

function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      onChange(result.secure_url);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="inp" placeholder="Image URL…" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border border-border h-10 px-4 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
          {uploading ? "UPLOADING…" : "UPLOAD"}
        </button>
      </div>
      {value && (
        <div className="mt-2 h-16 w-16 border border-border rounded overflow-hidden bg-muted/30">
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function AdminPreloader() {
  const [row, setRow] = useState<PreloaderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("preloader_settings").select("*").limit(1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRow(data ?? null);
      setLoading(false);
    });
  }, []);

  const update = (patch: Partial<PreloaderSettings>) => setRow((r) => (r ? { ...r, ...patch } : r));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = row;
    const { error } = await supabase.from("preloader_settings").update(fields).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preloader saved");
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!row) return <div className="text-mono text-xs">No preloader config found — run the migration first.</div>;

  const bgMedia: MediaValue = {
    url: row.bg_type === "video" ? row.bg_video_url ?? "" : row.bg_image_url ?? "",
    type: row.bg_type === "video" ? "video" : "image",
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">PRELOADER.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        THE LOADING SCREEN EVERY VISITOR SEES ON FIRST LOAD. THE GLITCH ANIMATION ITSELF IS FIXED — THIS CONTROLS THE BACKDROP AND WHAT GLITCHES.
      </p>

      <div className="max-w-2xl space-y-6">
        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BACKDROP (IMAGE OR VIDEO)</div>
          <MediaField
            value={bgMedia}
            onChange={(next) =>
              update({
                bg_type: next.type,
                bg_image_url: next.type === "image" ? next.url : row.bg_image_url,
                bg_video_url: next.type === "video" ? next.url : row.bg_video_url,
              })
            }
          />
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">WHAT GLITCHES — IMAGE OR TEXT</div>
          <div className="inline-flex border border-border rounded overflow-hidden mb-3">
            {(["image", "text"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update({ content_type: t })}
                className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
                  row.content_type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {row.content_type === "image" ? (
            <ImageField value={row.content_image_url} onChange={(url) => update({ content_image_url: url })} />
          ) : (
            <div className="space-y-3">
              <label className="block">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TEXT</div>
                <input value={row.content_text} onChange={(e) => update({ content_text: e.target.value })} className="inp" placeholder="STUDIO DENY" />
              </label>
              <label className="block">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TEXT COLOUR</div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={row.text_color}
                    onChange={(e) => update({ text_color: e.target.value })}
                    className="h-10 w-16 bg-background border border-border p-1"
                  />
                  <input value={row.text_color} onChange={(e) => update({ text_color: e.target.value })} className="inp max-w-[160px]" />
                </div>
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-11 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          SAVE
        </button>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}
