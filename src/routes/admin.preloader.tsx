import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PreloaderSettings } from "@/types/database";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/preloader")({
  component: AdminPreloader,
});

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
        THE LOADING SCREEN EVERY VISITOR SEES ON FIRST LOAD — TYPOGRAPHY AND BACKDROP ONLY. THE GLITCH ANIMATION AND LOGO ARE FIXED.
      </p>

      <div className="max-w-2xl space-y-6">
        <div className="border border-border bg-surface p-4 space-y-4">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TYPOGRAPHY (LABEL + % COUNTER)</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FONT SIZE (PX)</div>
              <input
                type="number"
                min={8}
                max={48}
                value={row.font_size_px}
                onChange={(e) => update({ font_size_px: Math.max(8, Number(e.target.value) || 8) })}
                className="inp"
              />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FONT WEIGHT</div>
              <select
                value={row.font_weight}
                onChange={(e) => update({ font_weight: Number(e.target.value) })}
                className="inp"
              >
                {[400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FONT TYPE (CSS FONT-FAMILY, BLANK = SITE DEFAULT)</div>
            <input
              value={row.font_family}
              onChange={(e) => update({ font_family: e.target.value })}
              className="inp"
              placeholder="e.g. Satoshi, Archivo Black, monospace…"
            />
          </label>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FONT COLOUR</div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={row.font_color}
                onChange={(e) => update({ font_color: e.target.value })}
                className="h-10 w-16 bg-background border border-border p-1"
              />
              <input value={row.font_color} onChange={(e) => update({ font_color: e.target.value })} className="inp max-w-[160px]" />
            </div>
          </label>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BACKDROP</div>
          <div className="inline-flex border border-border rounded overflow-hidden mb-3">
            {(["color", "image", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update({ bg_type: t })}
                className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
                  row.bg_type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {row.bg_type === "color" ? (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={row.bg_color}
                onChange={(e) => update({ bg_color: e.target.value })}
                className="h-10 w-16 bg-background border border-border p-1"
              />
              <input value={row.bg_color} onChange={(e) => update({ bg_color: e.target.value })} className="inp max-w-[160px]" />
            </div>
          ) : (
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
