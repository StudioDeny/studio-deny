import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PopupPromo } from "@/types/database";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import {
  Loader2, Upload, ChevronDown, Lock, Zap, Gift, Trophy, Truck, RotateCcw,
  ShieldCheck, Star, Sparkles, Heart, Award, Package, Clock, CheckCircle,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin/popup")({
  component: AdminPopup,
});

const ICON_NAMES = [
  "Lock", "Zap", "Gift", "Trophy", "Truck", "RotateCcw", "ShieldCheck", "Star",
  "Sparkles", "Heart", "Award", "Package", "Clock", "CheckCircle",
];
const ICON_MAP: Record<string, LucideIcon> = {
  Lock, Zap, Gift, Trophy, Truck, RotateCcw, ShieldCheck, Star,
  Sparkles, Heart, Award, Package, Clock, CheckCircle,
};

function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const SelectedIcon = ICON_MAP[value] ?? Star;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inp flex items-center gap-2 text-left">
        <SelectedIcon className="size-4 shrink-0" />
        <span className="flex-1">{value}</span>
        <ChevronDown className={`size-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-background border border-border shadow-lg p-2 grid grid-cols-4 gap-1 w-[220px]">
          {ICON_NAMES.map((name) => {
            const Icon = ICON_MAP[name];
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onChange(name); setOpen(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded hover:bg-surface hover:text-primary transition-colors ${
                  value === name ? "bg-surface text-primary" : ""
                }`}
              >
                <Icon className="size-4" />
                <span className="text-[8px] tracking-wide truncate w-full text-center">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogoField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
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
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="inp"
          placeholder="Paste a logo image URL…"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
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
          <img src={value} alt="Logo preview" className="h-full w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function AdminPopup() {
  const [row, setRow] = useState<PopupPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("popup_promo").select("*").limit(1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRow(data ?? null);
      setLoading(false);
    });
  }, []);

  const update = (patch: Partial<PopupPromo>) => setRow((r) => (r ? { ...r, ...patch } : r));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = row;
    const { error } = await supabase.from("popup_promo").update(fields).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Popup saved");
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!row) return <div className="text-mono text-xs">No popup config found — run the migration first.</div>;

  const bgMedia: MediaValue = {
    url: row.bg_type === "video" ? row.bg_video_url ?? "" : row.bg_image_url ?? "",
    type: row.bg_type === "video" ? "video" : "image",
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">POPUP.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        THE LOYALTY POPUP EVERY VISITOR SEES AFTER THE DELAY BELOW — NO CODE REQUIRED.
      </p>

      <div className="max-w-2xl space-y-6">
        <div className="border border-border bg-surface p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                className="size-4"
              />
              <span className="text-mono text-[10px] tracking-widest">ENABLED</span>
            </label>
          </div>

          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">DELAY BEFORE SHOWING (SECONDS)</div>
            <input
              type="number"
              min={0}
              value={row.delay_seconds}
              onChange={(e) => update({ delay_seconds: Math.max(0, Number(e.target.value) || 0) })}
              className="inp max-w-[140px]"
            />
          </label>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BACKGROUND</div>
          <div className="inline-flex border border-border rounded overflow-hidden mb-3">
            {(["none", "image", "video"] as const).map((t) => (
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
          {row.bg_type !== "none" && (
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

          <label className="block pt-2">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">LOGO (OPTIONAL)</div>
            <LogoField value={row.logo_url} onChange={(url) => update({ logo_url: url })} />
          </label>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">CONTENT</div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BADGE TEXT</div>
            <input value={row.badge_text} onChange={(e) => update({ badge_text: e.target.value })} className="inp" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">HEADLINE LINE 1</div>
              <input value={row.headline_line1} onChange={(e) => update({ headline_line1: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">HEADLINE LINE 2</div>
              <input value={row.headline_line2} onChange={(e) => update({ headline_line2: e.target.value })} className="inp" />
            </label>
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BODY TEXT</div>
            <textarea value={row.body_text} onChange={(e) => update({ body_text: e.target.value })} rows={3} className="inp" />
          </label>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">RULE ROW</div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">UNLOCK ICON</div>
              <IconPicker value={row.rule_unlock_icon} onChange={(name) => update({ rule_unlock_icon: name })} />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">EARN ICON</div>
              <IconPicker value={row.rule_earn_icon} onChange={(name) => update({ rule_earn_icon: name })} />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">REDEEM ICON</div>
              <IconPicker value={row.rule_redeem_icon} onChange={(name) => update({ rule_redeem_icon: name })} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">UNLOCK LABEL</div>
              <input value={row.rule_unlock_label} onChange={(e) => update({ rule_unlock_label: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">EARN LABEL</div>
              <input value={row.rule_earn_label} onChange={(e) => update({ rule_earn_label: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">REDEEM LABEL</div>
              <input value={row.rule_redeem_label} onChange={(e) => update({ rule_redeem_label: e.target.value })} className="inp" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">EARN VALUE (E.G. "1 PT")</div>
              <input value={row.rule_earn_value} onChange={(e) => update({ rule_earn_value: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">UNLOCK SUB TEXT (E.G. "SINGLE ORDER")</div>
              <input value={row.rule_unlock_sub} onChange={(e) => update({ rule_unlock_sub: e.target.value })} className="inp" />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            UNLOCK's ₹ amount and EARN/REDEEM's "per ₹…" sub text come from the loyalty math in Settings → Loyalty, not from here.
          </p>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TIER LABELS</div>
          <div className="grid grid-cols-4 gap-3">
            <input value={row.tier_1_label} onChange={(e) => update({ tier_1_label: e.target.value })} className="inp" />
            <input value={row.tier_2_label} onChange={(e) => update({ tier_2_label: e.target.value })} className="inp" />
            <input value={row.tier_3_label} onChange={(e) => update({ tier_3_label: e.target.value })} className="inp" />
            <input value={row.tier_4_label} onChange={(e) => update({ tier_4_label: e.target.value })} className="inp" />
          </div>
        </div>

        <div className="border border-border bg-surface p-4 space-y-3">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BUTTONS</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">PRIMARY BUTTON TEXT</div>
              <input value={row.cta_primary_text} onChange={(e) => update({ cta_primary_text: e.target.value })} className="inp" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">PRIMARY BUTTON LINK</div>
              <input value={row.cta_primary_href} onChange={(e) => update({ cta_primary_href: e.target.value })} className="inp" />
            </label>
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SECONDARY BUTTON TEXT ("LATER")</div>
            <input value={row.cta_secondary_text} onChange={(e) => update({ cta_secondary_text: e.target.value })} className="inp max-w-[240px]" />
          </label>
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
