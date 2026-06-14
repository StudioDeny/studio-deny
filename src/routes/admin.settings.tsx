import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSettings, saveSettings, TIER_KEYS, type LoyaltySettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import type { BrandSettings, ThemeSettings, AppSettings } from "@/types/database";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Tab = "loyalty" | "brand" | "theme" | "cod";

function AdminSettings() {
  const [tab, setTab] = useState<Tab>("loyalty");

  return (
    <div className="max-w-3xl">
      <h1 className="text-display text-4xl md:text-5xl mb-2">SETTINGS.</h1>
      <p className="text-muted-foreground text-sm mb-6">Configure loyalty, brand, theme, and payment options.</p>

      <div className="flex flex-wrap gap-1 mb-8">
        {(["loyalty", "brand", "theme", "cod"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-mono text-[10px] tracking-widest px-4 h-9 border ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "loyalty" && <LoyaltyTab />}
      {tab === "brand" && <BrandTab />}
      {tab === "theme" && <ThemeTab />}
      {tab === "cod" && <CodTab />}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}select.inp{cursor:pointer}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   LOYALTY TAB (existing, unchanged logic)
───────────────────────────────────────── */
function LoyaltyTab() {
  const [s, setS] = useState<LoyaltySettings | null>(null);
  useEffect(() => setS(getSettings()), []);
  if (!s) return <div className="text-mono text-xs">LOADING…</div>;

  const setDiscount = (k: keyof LoyaltySettings["discount"], v: number) =>
    setS({ ...s, discount: { ...s.discount, [k]: v } });

  return (
    <div className="space-y-6">
      <section className="border border-border bg-surface p-6">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-4">LOYALTY DISCOUNT BY TIER</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {TIER_KEYS.map((t) => (
            <label key={t} className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{t} (%)</div>
              <input
                type="number" min={0} max={90}
                value={s.discount[t]}
                onChange={(e) => setDiscount(t, Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                className="inp"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="border border-border bg-surface p-6">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-4">POINTS ECONOMY</div>
        <div className="grid sm:grid-cols-3 gap-4">
          <label>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">POINTS / ₹100</div>
            <input type="number" value={s.pointsPer100} onChange={(e) => setS({ ...s, pointsPer100: Number(e.target.value) || 0 })} className="inp" />
          </label>
          <label>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">₹ / POINT</div>
            <input type="number" value={s.rupeesPerPoint} onChange={(e) => setS({ ...s, rupeesPerPoint: Number(e.target.value) || 0 })} className="inp" />
          </label>
          <label>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FREE SHIPPING ABOVE ₹</div>
            <input type="number" value={s.freeShipping} onChange={(e) => setS({ ...s, freeShipping: Number(e.target.value) || 0 })} className="inp" />
          </label>
        </div>
      </section>

      <button
        onClick={() => { saveSettings(s); toast.success("Loyalty settings saved"); }}
        className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary"
      >
        SAVE SETTINGS
      </button>
    </div>
  );
}

/* ─────────────────────────────────────
   BRAND TAB
───────────────────────────────────── */
function BrandTab() {
  const [data, setData] = useState<Partial<BrandSettings>>({});
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("brand_settings").select("*").limit(1).single().then(({ data: row }) => {
      if (row) { setData(row); setRowId(row.id); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      site_name: data.site_name ?? "STUDIO/DENY",
      tagline: data.tagline || null,
      logo_url: data.logo_url || null,
      favicon_url: data.favicon_url || null,
      og_default_image: data.og_default_image || null,
      social_instagram: data.social_instagram || null,
      social_twitter: data.social_twitter || null,
      social_facebook: data.social_facebook || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      address: data.address || null,
    };
    const { error } = rowId
      ? await supabase.from("brand_settings").update(payload).eq("id", rowId)
      : await supabase.from("brand_settings").insert(payload).select().single().then((r) => { if (r.data) setRowId(r.data.id); return r; });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Brand settings saved");
    setSaving(false);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  const set = <K extends keyof BrandSettings>(k: K, v: BrandSettings[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-6">
      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">BRAND IDENTITY</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="SITE NAME"><input value={data.site_name ?? ""} onChange={(e) => set("site_name", e.target.value)} className="inp" /></F>
          <F label="TAGLINE"><input value={data.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} className="inp" /></F>
        </div>
        <F label="LOGO URL"><input value={data.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} className="inp" placeholder="https://..." /></F>
        <F label="FAVICON URL"><input value={data.favicon_url ?? ""} onChange={(e) => set("favicon_url", e.target.value)} className="inp" placeholder="https://..." /></F>
        <F label="DEFAULT OG IMAGE"><input value={data.og_default_image ?? ""} onChange={(e) => set("og_default_image", e.target.value)} className="inp" placeholder="1200×630 image URL" /></F>
      </section>

      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">SOCIAL LINKS</div>
        <div className="grid sm:grid-cols-3 gap-4">
          <F label="INSTAGRAM"><input value={data.social_instagram ?? ""} onChange={(e) => set("social_instagram", e.target.value)} className="inp" placeholder="@handle or URL" /></F>
          <F label="TWITTER"><input value={data.social_twitter ?? ""} onChange={(e) => set("social_twitter", e.target.value)} className="inp" placeholder="@handle or URL" /></F>
          <F label="FACEBOOK"><input value={data.social_facebook ?? ""} onChange={(e) => set("social_facebook", e.target.value)} className="inp" placeholder="Page URL" /></F>
        </div>
      </section>

      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">CONTACT</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="EMAIL"><input value={data.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} className="inp" /></F>
          <F label="PHONE"><input value={data.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} className="inp" /></F>
        </div>
        <F label="ADDRESS"><textarea rows={3} value={data.address ?? ""} onChange={(e) => set("address", e.target.value)} className="inp" /></F>
      </section>

      <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
        {saving ? "SAVING…" : "SAVE BRAND SETTINGS"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────
   THEME TAB
───────────────────────────────────── */
function ThemeTab() {
  const [data, setData] = useState<Partial<ThemeSettings>>({ accent_color: "#c8f135", animations_enabled: true });
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("theme_settings").select("*").limit(1).single().then(({ data: row }) => {
      if (row) { setData(row); setRowId(row.id); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      accent_color: data.accent_color ?? "#c8f135",
      font_display: data.font_display || null,
      font_ui: data.font_ui || null,
      border_radius: data.border_radius || null,
      animations_enabled: data.animations_enabled ?? true,
      custom_css: data.custom_css || null,
    };
    const { error } = rowId
      ? await supabase.from("theme_settings").update(payload).eq("id", rowId)
      : await supabase.from("theme_settings").insert(payload).select().single().then((r) => { if (r.data) setRowId(r.data.id); return r; });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Theme settings saved");
    setSaving(false);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;
  const set = <K extends keyof ThemeSettings>(k: K, v: ThemeSettings[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-6">
      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">COLORS</div>
        <F label="ACCENT COLOR">
          <div className="flex gap-3 items-center">
            <input type="color" value={data.accent_color ?? "#c8f135"} onChange={(e) => set("accent_color", e.target.value)} className="h-10 w-10 cursor-pointer border border-border bg-background p-0.5 shrink-0" />
            <input value={data.accent_color ?? ""} onChange={(e) => set("accent_color", e.target.value)} className="inp" />
          </div>
        </F>
      </section>

      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">TYPOGRAPHY</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="DISPLAY FONT"><input value={data.font_display ?? ""} onChange={(e) => set("font_display", e.target.value)} className="inp" placeholder="Font family name" /></F>
          <F label="UI FONT"><input value={data.font_ui ?? ""} onChange={(e) => set("font_ui", e.target.value)} className="inp" placeholder="Font family name" /></F>
        </div>
      </section>

      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">BEHAVIOUR</div>
        <F label="BORDER RADIUS">
          <select value={data.border_radius ?? ""} onChange={(e) => set("border_radius", e.target.value)} className="inp">
            <option value="">DEFAULT (sharp)</option>
            <option value="2px">SUBTLE (2px)</option>
            <option value="4px">SMALL (4px)</option>
            <option value="8px">MEDIUM (8px)</option>
            <option value="12px">LARGE (12px)</option>
          </select>
        </F>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={data.animations_enabled ?? true} onChange={(e) => set("animations_enabled", e.target.checked)} className="w-4 h-4" />
          <span className="text-mono text-[11px] tracking-widest">ENABLE ANIMATIONS</span>
        </label>
      </section>

      <section className="border border-border bg-surface p-6 space-y-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">CUSTOM CSS</div>
        <textarea rows={8} value={data.custom_css ?? ""} onChange={(e) => set("custom_css", e.target.value)} className="inp font-mono text-xs" placeholder=":root { /* your overrides */ }" />
      </section>

      <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
        {saving ? "SAVING…" : "SAVE THEME SETTINGS"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────
   COD TAB
───────────────────────────────────── */
function CodTab() {
  const [data, setData] = useState<Partial<AppSettings>>({ cod_enabled: false, cod_advance_percent: 20, cod_min_order: 500 });
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).single().then(({ data: row }) => {
      if (row) { setData(row); setRowId(row.id); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      cod_enabled: data.cod_enabled ?? false,
      cod_advance_percent: Math.max(1, Math.min(100, data.cod_advance_percent ?? 20)),
      cod_min_order: Math.max(0, data.cod_min_order ?? 0),
    };
    const { error } = rowId
      ? await supabase.from("settings").update(payload).eq("id", rowId)
      : await supabase.from("settings").insert(payload).select().single().then((r) => { if (r.data) setRowId(r.data.id); return r; });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("COD settings saved");
    setSaving(false);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div className="space-y-6">
      <section className="border border-border bg-surface p-6 space-y-5">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">CASH ON DELIVERY</div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-semibold">Enable Cash on Delivery</div>
            <div className="text-muted-foreground text-sm mt-0.5">Allow customers to pay with cash at delivery</div>
          </div>
          <div
            onClick={() => setData((d) => ({ ...d, cod_enabled: !d.cod_enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${data.cod_enabled ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-background border border-border transition-transform ${data.cod_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </div>
        </label>

        <div className={`space-y-4 transition-opacity ${data.cod_enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <F label="ADVANCE PAYMENT (% of total)">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                value={data.cod_advance_percent ?? 20}
                onChange={(e) => setData((d) => ({ ...d, cod_advance_percent: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                className="inp max-w-[120px]"
              />
              <div className="text-mono text-[11px] text-muted-foreground">
                % advance collected at checkout via Razorpay; rest paid on delivery
              </div>
            </div>
          </F>

          <F label="MINIMUM ORDER FOR COD (₹)">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={data.cod_min_order ?? 0}
                onChange={(e) => setData((d) => ({ ...d, cod_min_order: Math.max(0, Number(e.target.value) || 0) }))}
                className="inp max-w-[160px]"
              />
              <div className="text-mono text-[11px] text-muted-foreground">Orders below this amount cannot use COD</div>
            </div>
          </F>

          {data.cod_enabled && (
            <div className="border border-border bg-muted/30 p-4">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">PREVIEW</div>
              <div className="text-sm">
                On a ₹{(data.cod_min_order ?? 500).toLocaleString()} order:
                <span className="text-primary font-semibold ml-2">₹{Math.round((data.cod_min_order ?? 500) * ((data.cod_advance_percent ?? 20) / 100)).toLocaleString()} advance</span>
                <span className="text-muted-foreground ml-2">+ ₹{Math.round((data.cod_min_order ?? 500) * (1 - (data.cod_advance_percent ?? 20) / 100)).toLocaleString()} on delivery</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
        {saving ? "SAVING…" : "SAVE COD SETTINGS"}
      </button>
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
