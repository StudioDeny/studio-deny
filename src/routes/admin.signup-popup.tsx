import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SIGNUP_POPUP, type SignupPopupConfig } from "@/lib/signupPopup";
import { SignupPopupView } from "@/components/signup/SignupPopupView";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin/signup-popup")({
  component: AdminSignupPopup,
});

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="border border-border bg-surface p-4 space-y-3">
    <div className="lbl">{title}</div>
    {children}
  </div>
);

function AdminSignupPopup() {
  const [row, setRow] = useState<SignupPopupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewStage, setPreviewStage] = useState<"form" | "success">("form");

  useEffect(() => {
    supabase.from("signup_popup").select("*").limit(1).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRow(data ? { ...DEFAULT_SIGNUP_POPUP, ...(data as SignupPopupConfig) } : null);
      setLoading(false);
    });
  }, []);

  const update = (patch: Partial<SignupPopupConfig>) => setRow((r) => (r ? { ...r, ...patch } : r));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = row;
    const { error } = await supabase.from("signup_popup").update(fields).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Signup popup saved");
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  if (!row) return <div className="text-mono text-xs">No signup popup config found — run the migration first.</div>;

  const text = (key: keyof SignupPopupConfig, label: string, area = false) => (
    <label className="block">
      <div className="lbl">{label}</div>
      {area ? (
        <textarea value={String(row[key] ?? "")} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} rows={2} className="inp" />
      ) : (
        <input value={String(row[key] ?? "")} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="inp" />
      )}
    </label>
  );

  const color = (key: keyof SignupPopupConfig, label: string) => (
    <label className="block">
      <div className="lbl">{label}</div>
      <div className="flex gap-2">
        <input type="color" value={String(row[key])} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="h-10 w-12 border border-border bg-background p-1" />
        <input value={String(row[key])} onChange={(e) => update({ [key]: e.target.value } as Partial<SignupPopupConfig>)} className="inp" />
      </div>
    </label>
  );

  const bgMedia: MediaValue = {
    url: row.bg_type === "video" ? row.bg_video_url ?? "" : row.bg_image_url ?? "",
    type: row.bg_type === "video" ? "video" : "image",
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">SIGNUP POPUP.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        SHOWN TO LOGGED-OUT VISITORS. NEW SIGNUPS SEE THEIR WELCOME CODE RIGHT AWAY.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title="BEHAVIOUR">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={row.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="size-4" />
              <span className="lbl !mb-0">ENABLED</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block"><div className="lbl">DELAY (SECONDS)</div>
                <input type="number" min={0} value={row.delay_seconds} onChange={(e) => update({ delay_seconds: Math.max(0, Number(e.target.value) || 0) })} className="inp" /></label>
              <label className="block"><div className="lbl">SHOW AGAIN AFTER CLOSE (HOURS)</div>
                <input type="number" min={0} value={row.reshow_after_hours} onChange={(e) => update({ reshow_after_hours: Math.max(0, Number(e.target.value) || 0) })} className="inp" /></label>
              <label className="block"><div className="lbl">SHOW ON</div>
                <select value={row.show_on} onChange={(e) => update({ show_on: e.target.value as SignupPopupConfig["show_on"] })} className="inp">
                  <option value="all">ALL STORE PAGES</option><option value="home">HOME PAGE ONLY</option>
                </select></label>
            </div>
          </Card>

          <Card title="LAYOUT & BACKGROUND">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><div className="lbl">LAYOUT</div>
                <select value={row.layout} onChange={(e) => update({ layout: e.target.value as SignupPopupConfig["layout"] })} className="inp">
                  <option value="media_left">PICTURE LEFT, FORM RIGHT</option>
                  <option value="media_right">FORM LEFT, PICTURE RIGHT</option>
                  <option value="form_only">FORM ONLY</option>
                </select></label>
              <label className="flex items-center gap-2 cursor-pointer pt-5">
                <input type="checkbox" checked={row.show_media_on_mobile} onChange={(e) => update({ show_media_on_mobile: e.target.checked })} className="size-4" />
                <span className="lbl !mb-0">SHOW PICTURE PANEL ON PHONES</span>
              </label>
            </div>
            <div className="inline-flex border border-border overflow-hidden">
              {(["color", "image", "video"] as const).map((t) => (
                <button key={t} type="button" onClick={() => update({ bg_type: t })}
                  className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase ${row.bg_type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                  {t === "color" ? "PLAIN COLOUR" : t}
                </button>
              ))}
            </div>
            {color("bg_color", "BACKGROUND COLOUR")}
            {row.bg_type !== "color" && (
              <>
                <MediaField value={bgMedia} onChange={(next) => update({
                  bg_type: next.type,
                  bg_image_url: next.type === "image" ? next.url : row.bg_image_url,
                  bg_video_url: next.type === "video" ? next.url : row.bg_video_url,
                })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {color("overlay_color", "DARKEN/TINT COLOUR")}
                  <label className="block"><div className="lbl">TINT STRENGTH ({row.overlay_opacity}%)</div>
                    <input type="range" min={0} max={100} value={row.overlay_opacity} onChange={(e) => update({ overlay_opacity: Number(e.target.value) })} className="w-full" /></label>
                </div>
              </>
            )}
            {text("logo_url", "LOGO IMAGE URL (OPTIONAL — PASTE FROM MEDIA)")}
          </Card>

          <Card title="PICTURE PANEL TEXT">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
              {text("heading", "HEADING")}{color("heading_color", "HEADING COLOUR")}
              {text("subheading", "SUBHEADING", true)}{color("subheading_color", "SUBHEADING COLOUR")}
            </div>
          </Card>

          <Card title="FORM">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {color("form_bg_color", "FORM BACKGROUND")}{color("form_text_color", "FORM TEXT COLOUR")}
              {text("form_title", "TITLE")}{text("form_subtitle", "SUBTITLE")}
              {text("name_placeholder", "NAME PLACEHOLDER")}{text("email_placeholder", "EMAIL PLACEHOLDER")}
              {text("phone_placeholder", "PHONE PLACEHOLDER")}{text("password_placeholder", "PASSWORD PLACEHOLDER")}
              {text("submit_text", "BUTTON TEXT")}{text("login_link_text", "LOG-IN LINK TEXT")}
              {color("submit_bg_color", "BUTTON COLOUR")}{color("submit_text_color", "BUTTON TEXT COLOUR")}
            </div>
            {text("terms_text", "SMALL PRINT", true)}
          </Card>

          <Card title="AFTER SIGNUP">
            {text("success_heading", "HEADING")}
            {text("success_body", "MESSAGE — {discount} AND {code} ARE FILLED IN", true)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {text("copy_button_text", "COPY BUTTON")}{text("cta_text", "SHOP BUTTON")}{text("cta_href", "SHOP BUTTON LINK")}
            </div>
          </Card>

          <button type="button" onClick={save} disabled={saving} className="h-11 px-6 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />} SAVE
          </button>
        </div>

        <div className="xl:sticky xl:top-6 min-w-0 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={`h-8 px-3 border text-mono text-[10px] tracking-widest inline-flex items-center gap-1 ${device === d ? "border-primary text-primary" : "border-border"}`}>
                {d === "desktop" ? <Monitor className="size-3" /> : <Smartphone className="size-3" />} {d.toUpperCase()}
              </button>
            ))}
            {(["form", "success"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setPreviewStage(s)} className={`h-8 px-3 border text-mono text-[10px] tracking-widest ${previewStage === s ? "border-primary text-primary" : "border-border"}`}>
                {s === "form" ? "SIGNUP FORM" : "AFTER SIGNUP"}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto border border-border">
            <SignupPopupView
              cfg={row}
              stage={previewStage}
              code="DENY-7KX2QM"
              discountLabel="10% off"
              error={null}
              submitting={false}
              onSubmit={() => toast.message("Preview only")}
              onClose={() => {}}
              onLogin={() => {}}
              onCta={() => {}}
              preview
              device={device}
            />
          </div>
        </div>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}.lbl{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--muted-foreground);margin-bottom:4px}`}</style>
    </div>
  );
}
