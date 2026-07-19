import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WebsiteSection, SectionType } from "@/types/database";
import { ChevronUp, ChevronDown, Pencil, Eye, EyeOff, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { listProducts, type Product } from "@/lib/productsStore";

export const Route = createFileRoute("/admin/website-sections")({
  component: AdminWebsiteSections,
});

type HeroConfig = { title: string; subtitle: string; cta_label: string; cta_href: string; bg_image: string; bg_video: string; media_type: "video" | "image" };
type MarqueeConfig = { items: string[]; speed: number };
type ArrivalsConfig = { eyebrow: string; title: string; subtitle: string; cta_label: string; product_slugs: string[] };
type LookbookConfig = { images: string[]; title: string };
type WhyUsFeature = { label: string; desc: string };
type WhyUsConfig = { eyebrow: string; title: string; subtitle: string; features: WhyUsFeature[] };
type InstagramConfig = { eyebrow: string; title: string; handle: string; image_urls: string[] };
type NewsletterConfig = { eyebrow: string; title: string; subtitle: string; cta_label: string };
type FaqConfig = { eyebrow: string; title: string };

const TYPE_COLORS: Record<string, string> = {
  hero:          "bg-blue-100 text-blue-800",
  marquee:       "bg-purple-100 text-purple-800",
  new_arrivals:  "bg-emerald-100 text-emerald-800",
  lookbook:      "bg-amber-100 text-amber-800",
  testimonials:  "bg-pink-100 text-pink-800",
  faq:           "bg-orange-100 text-orange-800",
  why_us:        "bg-cyan-100 text-cyan-800",
  instagram_feed:"bg-rose-100 text-rose-800",
  newsletter:    "bg-lime-100 text-lime-800",
};

function AdminWebsiteSections() {
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WebsiteSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    if (is_locked) { toast.error("This section is locked and cannot be hidden."); return; }
    const { error } = await supabase.from("website_sections").update({ is_visible: val }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSections((s) => s.map((x) => (x.id === id ? { ...x, is_visible: val } : x)));
    toast.success(val ? "Section shown" : "Section hidden");
  };

  const deleteSection = async (id: string, is_locked: boolean) => {
    if (is_locked) { toast.error("Cannot delete a locked section."); return; }
    if (!confirm("Delete this section permanently?")) return;
    setDeleting(id);
    const { error } = await supabase.from("website_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); setDeleting(null); return; }
    setSections((s) => s.filter((x) => x.id !== id));
    toast.success("Section deleted");
    setDeleting(null);
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
      .update({ config: editing.config, title: editing.title })
      .eq("id", editing.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Section saved");
    setSaving(false);
    setEditing(null);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-mono text-xs tracking-widest text-muted-foreground">
      LOADING…
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display text-4xl md:text-5xl text-foreground">WEBSITE SECTIONS.</h1>
        <p className="text-sm mt-2 text-muted-foreground">Toggle visibility, reorder, and edit each homepage section. Delete duplicates with the trash icon.</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest text-foreground uppercase w-24">Order</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest text-foreground uppercase">Section</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest text-foreground uppercase w-36">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest text-foreground uppercase w-32">Visibility</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold tracking-widest text-foreground uppercase w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sections.map((s, idx) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                {/* ORDER */}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => reorder(s.id, -1)} disabled={idx === 0}
                      className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      onClick={() => reorder(s.id, 1)} disabled={idx === sections.length - 1}
                      className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                </td>

                {/* SECTION NAME */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">{s.title}</div>
                  {s.is_locked && (
                    <div className="text-[10px] tracking-widest text-muted-foreground mt-0.5">LOCKED</div>
                  )}
                </td>

                {/* TYPE BADGE */}
                <td className="px-4 py-3">
                  <span className={`inline-block text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full ${TYPE_COLORS[s.section_type] ?? "bg-muted text-foreground"}`}>
                    {s.section_type.toUpperCase()}
                  </span>
                </td>

                {/* VISIBILITY TOGGLE */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleVisible(s.id, s.is_locked, !s.is_visible)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${
                      s.is_visible
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title={s.is_locked ? "Locked — cannot hide" : undefined}
                  >
                    {s.is_visible
                      ? <><Check className="size-3" /> VISIBLE</>
                      : <><EyeOff className="size-3" /> HIDDEN</>
                    }
                  </button>
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditing(s)}
                      title="Edit config"
                      className="h-8 w-8 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {!s.is_locked && (
                      <button
                        onClick={() => deleteSection(s.id, s.is_locked)}
                        disabled={deleting === s.id}
                        title="Delete section"
                        className="h-8 w-8 inline-flex items-center justify-center rounded border border-border bg-background hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sections.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No sections found.</div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <div className="text-xs font-semibold tracking-widest text-primary uppercase">Edit Section</div>
                <div className="text-foreground font-semibold mt-0.5">{editing.title}</div>
              </div>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Section title */}
              <F label="SECTION TITLE">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="inp"
                />
              </F>
              <div className="mt-5 pt-5 border-t border-border">
                <div className="text-[11px] font-semibold tracking-widest text-foreground mb-4">SECTION CONTENT</div>
                <SectionConfigForm
                  section={editing}
                  onChange={(c) => setEditing({ ...editing, config: c as import("@/types/database").Json })}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0 bg-muted/30">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground h-10 px-6 text-xs font-semibold tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity rounded"
              >
                {saving ? "SAVING…" : "SAVE CHANGES"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="h-10 px-5 text-xs font-semibold tracking-widest border border-border hover:border-foreground hover:text-foreground transition-colors rounded text-muted-foreground"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inp {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          height: 40px;
          padding: 0 12px;
          width: 100%;
          font-size: 13px;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s;
        }
        .inp:focus { border-color: var(--primary); }
        textarea.inp { height: auto; padding: 10px 12px; resize: vertical; }
        .inp::placeholder { color: var(--muted-foreground); opacity: 0.6; }
      `}</style>
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
        <div className="space-y-4">
          <F label="HEADLINE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="IN THE CUT NOT IN THE CROWD" /></F>
          <F label="SUBTEXT"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" placeholder="Elevated streetwear…" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="SHOP THE DROP" /></F>
            <F label="CTA URL"><input value={c.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} className="inp" placeholder="/shop" /></F>
          </div>
          <F label="MEDIA TYPE">
            <select value={c.media_type ?? "video"} onChange={(e) => set("media_type", e.target.value)} className="inp" style={{ cursor: "pointer" }}>
              <option value="video">Video</option>
              <option value="image">Image / Photo</option>
            </select>
          </F>
          {(c.media_type ?? "video") === "video" ? (
            <F label="BACKGROUND VIDEO URL"><input value={c.bg_video ?? ""} onChange={(e) => set("bg_video", e.target.value)} className="inp" placeholder="https://…/hero-video.mp4" /></F>
          ) : (
            <F label="BACKGROUND IMAGE URL"><input value={c.bg_image ?? ""} onChange={(e) => set("bg_image", e.target.value)} className="inp" placeholder="https://…/hero-photo.jpg" /></F>
          )}
        </div>
      );
    }
    case "marquee": {
      const c = cfg as Partial<MarqueeConfig>;
      return (
        <div className="space-y-4">
          <F label="TICKER ITEMS (one per line)">
            <textarea
              rows={6}
              value={(c.items ?? []).join("\n")}
              onChange={(e) => set("items", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              className="inp"
              placeholder={"NEW DROP — SS26 Available Now\nRESTOCK — Essential Hoodie Back In Stock"}
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" placeholder="JUST DROPPED" /></F>
            <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="VIEW ALL" /></F>
          </div>
          <F label="HEADING"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="NEW ARRIVALS." /></F>
          <F label="SUBTEXT"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></F>
          <F label={`PRODUCTS — select up to 4 (${selected.length}/4 selected)`}>
            <div className="border border-border rounded divide-y divide-border max-h-52 overflow-y-auto mt-1">
              {allProducts.length === 0 && <div className="p-3 text-sm text-muted-foreground">No products found.</div>}
              {allProducts.map((p) => (
                <label key={p.slug} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.slug)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selected, p.slug].slice(-4) : selected.filter((s) => s !== p.slug);
                      set("product_slugs", next);
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground flex-1">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
                </label>
              ))}
            </div>
          </F>
        </div>
      );
    }
    case "lookbook": {
      const c = cfg as Partial<LookbookConfig>;
      return (
        <div className="space-y-4">
          <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="LOOKBOOK" /></F>
          <F label="IMAGE URLS (one per line)">
            <textarea
              rows={6}
              value={(c.images ?? []).join("\n")}
              onChange={(e) => set("images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              className="inp"
              placeholder="https://…"
            />
          </F>
        </div>
      );
    }
    case "faq": {
      const c = cfg as Partial<FaqConfig>;
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            FAQ items are managed in the <strong className="text-foreground">FAQ</strong> admin page. Here you can edit the section heading and toggle visibility.
          </div>
          <F label="EYEBROW TEXT"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" placeholder="GOT QUESTIONS?" /></F>
          <F label="SECTION HEADING"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="WE'VE GOT ANSWERS." /></F>
        </div>
      );
    }
    case "why_us": {
      const c = cfg as Partial<WhyUsConfig>;
      const features: WhyUsFeature[] = c.features ?? [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" placeholder="WHY STUDIO DENY" /></F>
            <F label="TITLE LINE 1"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="BUILT DIFFERENT." /></F>
          </div>
          <F label="TITLE LINE 2"><input value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" placeholder="STAYS DIFFERENT." /></F>
          <div className="text-[11px] font-semibold tracking-widest text-foreground mt-2 mb-1">PILLARS (4 items)</div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded p-3 space-y-2 bg-muted/20">
              <div className="text-[10px] font-semibold tracking-widest text-muted-foreground">PILLAR {i + 1}</div>
              <F label="LABEL">
                <input value={features[i]?.label ?? ""} onChange={(e) => { const next = [...features]; next[i] = { ...next[i], label: e.target.value }; set("features", next); }} className="inp" />
              </F>
              <F label="DESCRIPTION">
                <textarea rows={2} value={features[i]?.desc ?? ""} onChange={(e) => { const next = [...features]; next[i] = { ...next[i], desc: e.target.value }; set("features", next); }} className="inp" />
              </F>
            </div>
          ))}
        </div>
      );
    }
    case "instagram_feed": {
      const c = cfg as Partial<InstagramConfig>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" placeholder="THE COMMUNITY" /></F>
            <F label="TITLE"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="@STUDIODENY" /></F>
          </div>
          <F label="INSTAGRAM HANDLE (no @)"><input value={c.handle ?? ""} onChange={(e) => set("handle", e.target.value)} className="inp" placeholder="studiodeny" /></F>
          <F label="IMAGE URLS — one per line, up to 6">
            <textarea rows={8} value={(c.image_urls ?? []).join("\n")} onChange={(e) => set("image_urls", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6))} className="inp" placeholder="https://…" />
          </F>
        </div>
      );
    }
    case "newsletter": {
      const c = cfg as Partial<NewsletterConfig>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="EYEBROW"><input value={c.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} className="inp" placeholder="DROP ALERTS" /></F>
            <F label="CTA BUTTON"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="GET EARLY ACCESS" /></F>
          </div>
          <F label="HEADING"><input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} className="inp" placeholder="READY FOR THE NEXT DROP?" /></F>
          <F label="SUBTEXT"><textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></F>
        </div>
      );
    }
    default:
      return <p className="text-sm text-muted-foreground">No config fields for this section type.</p>;
  }
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-semibold tracking-widest text-foreground/70 mb-1.5 uppercase">{label}</div>
      {children}
    </label>
  );
}
