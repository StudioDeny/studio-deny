import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WebsiteSection, SectionType } from "@/types/database";
import { ChevronUp, ChevronDown, Pencil, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { listProducts, type Product } from "@/lib/productsStore";

export const Route = createFileRoute("/admin/website-sections")({
  component: AdminWebsiteSections,
});

type HeroConfig = { title: string; subtitle: string; cta_label: string; cta_href: string; bg_image: string };
type MarqueeConfig = { items: string[]; speed: number };
type ArrivalsConfig = { eyebrow: string; title: string; subtitle: string; cta_label: string; product_slugs: string[] };
type LookbookConfig = { images: string[]; title: string };
type WhyUsFeature = { label: string; desc: string };
type WhyUsConfig = { eyebrow: string; title: string; subtitle: string; features: WhyUsFeature[] };
type InstagramConfig = { eyebrow: string; title: string; handle: string; image_urls: string[] };
type NewsletterConfig = { eyebrow: string; title: string; subtitle: string; cta_label: string };

function AdminWebsiteSections() {
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WebsiteSection | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("website_sections")
      .select("*")
      .eq("page_slug", "home")
      .order("position");
    if (error) toast.error(error.message);
    else setSections(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleVisible = async (id: string, is_locked: boolean, val: boolean) => {
    if (is_locked) return toast.error("This section is locked and cannot be hidden.");
    const { error } = await supabase.from("website_sections").update({ is_visible: val }).eq("id", id);
    if (error) return toast.error(error.message);
    setSections((s) => s.map((x) => (x.id === id ? { ...x, is_visible: val } : x)));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSections(next.map((r, i) => ({ ...r, position: i })));
    await Promise.all(
      next.map((r, i) => supabase.from("website_sections").update({ position: i }).eq("id", r.id))
    );
  };

  const saveConfig = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("website_sections")
      .update({ config: editing.config })
      .eq("id", editing.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Section config saved");
    setSaving(false);
    setEditing(null);
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display text-4xl md:text-5xl">WEBSITE SECTIONS.</h1>
        <p className="text-muted-foreground text-sm mt-2">Manage homepage section visibility and content.</p>
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">SECTION</th>
              <th className="text-left p-3">TYPE</th>
              <th className="text-left p-3">VISIBLE</th>
              <th className="text-right p-3">CONFIG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sections.map((s, idx) => (
              <tr key={s.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder(s.id, -1)} disabled={idx === 0}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronUp className="size-3" />
                    </button>
                    <button onClick={() => reorder(s.id, 1)} disabled={idx === sections.length - 1}
                      className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-semibold">{s.title}</div>
                  {s.is_locked && <div className="text-mono text-[10px] text-muted-foreground">LOCKED</div>}
                </td>
                <td className="p-3">
                  <span className="text-mono text-[10px] tracking-widest px-2 py-1 border border-border text-muted-foreground">
                    {s.section_type.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleVisible(s.id, s.is_locked, !s.is_visible)}
                    className={`flex items-center gap-1.5 text-mono text-[10px] tracking-widest ${s.is_visible ? "text-secondary" : "text-muted-foreground"}`}
                  >
                    {s.is_visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    {s.is_visible ? "VISIBLE" : "HIDDEN"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  {!["testimonials", "faq"].includes(s.section_type) && (
                    <button onClick={() => setEditing(s)}
                      className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                      <Pencil className="size-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">EDIT: {editing.title.toUpperCase()}</div>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5">
              <SectionConfigForm section={editing} onChange={(c) => setEditing({ ...editing, config: c as import("@/types/database").Json })} />
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={saveConfig} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE CONFIG"}
              </button>
              <button onClick={() => setEditing(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}

function SectionConfigForm({ section, onChange }: { section: WebsiteSection; onChange: (c: unknown) => void }) {
  const cfg = (section.config ?? {}) as Record<string, unknown>;
  const set = (k: string, v: unknown) => onChange({ ...cfg, [k]: v });
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  useEffect(() => { listProducts().then(setAllProducts); }, []);

  switch (section.section_type as SectionType) {
    case "hero": {
      const c = cfg as Partial<HeroConfig>;
      return (
        <div className="space-y-3">
          <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          <F label="SUBTITLE"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" /></F>
            <F label="CTA URL"><input value={c.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} className="inp" /></F>
          </div>
          <F label="BACKGROUND IMAGE URL"><input value={c.bg_image ?? ""} onChange={(e) => set("bg_image", e.target.value)} className="inp" /></F>
        </div>
      );
    }
    case "marquee": {
      const c = cfg as Partial<MarqueeConfig>;
      const items = c.items ?? [];
      return (
        <div className="space-y-3">
          <F label="ITEMS (one per line)">
            <textarea
              rows={6}
              value={items.join("\n")}
              onChange={(e) => set("items", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              className="inp"
            />
          </F>
          <F label="SPEED (px/s)"><input type="number" value={c.speed ?? 40} onChange={(e) => set("speed", Number(e.target.value))} className="inp" /></F>
        </div>
      );
    }
    case "new_arrivals": {
      const c = cfg as Partial<ArrivalsConfig>;
      const selected = c.product_slugs ?? [];
      return (
        <div className="space-y-3">
          <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" /></F>
          <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          <F label="SUBTITLE"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" /></F>
          </div>
          <F label="PRODUCTS (select up to 4)">
            <div className="border border-border divide-y divide-border max-h-52 overflow-y-auto">
              {allProducts.map((p) => (
                <label key={p.slug} className="flex items-center gap-3 p-2 hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.slug)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, p.slug].slice(-4)
                        : selected.filter((s) => s !== p.slug);
                      set("product_slugs", next);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{p.name}</span>
                  <span className="text-mono text-[10px] text-muted-foreground ml-auto">{p.slug}</span>
                </label>
              ))}
            </div>
          </F>
        </div>
      );
    }
    case "lookbook": {
      const c = cfg as Partial<LookbookConfig>;
      const images = c.images ?? [];
      return (
        <div className="space-y-3">
          <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          <F label="IMAGE URLS (one per line)">
            <textarea
              rows={6}
              value={images.join("\n")}
              onChange={(e) => set("images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              className="inp"
            />
          </F>
        </div>
      );
    }
    case "why_us": {
      const c = cfg as Partial<WhyUsConfig>;
      const features: WhyUsFeature[] = c.features ?? [];
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" /></F>
            <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          </div>
          <F label="SUBTITLE (second line)"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></F>
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-4 mb-2">PILLARS (4 items)</div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border p-3 space-y-2">
              <div className="text-mono text-[10px] text-muted-foreground">PILLAR {i + 1}</div>
              <F label="LABEL">
                <input
                  value={features[i]?.label ?? ""}
                  onChange={(e) => {
                    const next = [...features];
                    next[i] = { ...next[i], label: e.target.value };
                    set("features", next);
                  }}
                  className="inp"
                />
              </F>
              <F label="DESCRIPTION">
                <textarea
                  rows={2}
                  value={features[i]?.desc ?? ""}
                  onChange={(e) => {
                    const next = [...features];
                    next[i] = { ...next[i], desc: e.target.value };
                    set("features", next);
                  }}
                  className="inp"
                />
              </F>
            </div>
          ))}
        </div>
      );
    }
    case "instagram_feed": {
      const c = cfg as Partial<InstagramConfig>;
      const urls = c.image_urls ?? [];
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" /></F>
            <F label="TITLE (e.g. @handle)"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          </div>
          <F label="INSTAGRAM HANDLE (no @)"><input value={c.handle ?? ""} onChange={(e) => set("handle", e.target.value)} className="inp" /></F>
          <F label="IMAGE URLS (one per line, up to 6)">
            <textarea
              rows={8}
              value={urls.join("\n")}
              onChange={(e) => set("image_urls", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6))}
              className="inp"
              placeholder="https://images.unsplash.com/..."
            />
          </F>
        </div>
      );
    }
    case "newsletter": {
      const c = cfg as Partial<NewsletterConfig>;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" /></F>
            <F label="CTA BUTTON LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" /></F>
          </div>
          <F label="HEADING"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" /></F>
          <F label="SUBTEXT">
            <textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" />
          </F>
        </div>
      );
    }
    default:
      return <p className="text-muted-foreground text-sm">No config fields for this section type.</p>;
  }
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
