import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WebsiteSection, SectionType } from "@/types/database";
import {
  ChevronUp, ChevronDown, Pencil, Eye, EyeOff, Trash2, X, Check, Search,
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { listProducts, type Product } from "@/lib/productsStore";
import { MediaField } from "@/components/admin/MediaField";

export const Route = createFileRoute("/admin/website-sections")({
  component: AdminWebsiteSections,
});

type HeroSlide = {
  id: string;
  media_type: "video" | "image";
  src: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  cta2_label?: string;
  cta2_href?: string;
};
type HeroConfig = { slides: HeroSlide[] };
type MarqueeConfig = { items: string[]; speed: number };
type ArrivalsConfig = { cta_label: string; product_slugs: string[] };
type LookbookConfig = { images: string[]; title: string };
type WhyUsFeature = { label: string; desc: string };
type WhyUsConfig = { features: WhyUsFeature[] };
type NewsletterConfig = { cta_label: string; success_heading?: string; success_body?: string };
type FaqConfig = { view_all_label?: string };
type SplitCard = { media_type: "image" | "video"; src: string; label: string; cta_href: string };
type GenderSplitConfig = { cards: SplitCard[]; explore_label?: string };
type CarouselSlide = { media_type: "image" | "video"; src: string; label: string; href: string; subtitle?: string; cta_label?: string };
type CategoryCarouselConfig = { slides: CarouselSlide[] };
type DenySpaceBenefit = { icon: string; label: string; desc: string };
type DenySpaceConfig = { logo_url: string; logo_type?: "image" | "video"; description: string; benefits: DenySpaceBenefit[]; cta_label: string; cta_href: string; bg_color?: string; text_color?: string; bg_media_url?: string; bg_media_type?: "image" | "video" };
type PopularNowItem = { slug: string; tag?: string };
type PopularNowConfig = { items: PopularNowItem[]; view_all_href?: string };
type FabricTab = { id: string; name: string; title: string; desc: string; img: string; img_type?: "image" | "video"; href?: string };
type FabricTabsConfig = { tabs: FabricTab[] };
type MotionPictureConfig = { video_url: string; media_type?: "image" | "video"; subtext: string };
type InfluencerPicksConfig = { explore_label?: string };
type ContactCard = { label: string; desc: string };
type ContactSupportConfig = { cards: ContactCard[]; cta_label?: string };
type TestimonialFallback = { quote: string; name: string; city: string };
type TestimonialsConfig = { fallback_quotes?: TestimonialFallback[] };

const DENYSPACE_ICONS = ["Truck", "RotateCcw", "ShieldCheck", "Gift", "Star", "Sparkles", "Heart", "Award", "Package", "Zap", "Clock", "CheckCircle"];
const ICON_MAP: Record<string, LucideIcon> = {
  Truck, RotateCcw, ShieldCheck, Gift, Star, Sparkles, Heart, Award,
  Package, Zap, Clock, CheckCircle,
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inp flex items-center gap-2 text-left"
      >
        <SelectedIcon className="size-4 shrink-0" />
        <span className="flex-1">{value}</span>
        <ChevronDown className={`size-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-background border border-border shadow-lg p-2 grid grid-cols-4 gap-1 w-[220px]">
          {DENYSPACE_ICONS.map((name) => {
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

const TYPE_COLORS: Record<string, string> = {
  hero:          "bg-blue-100 text-blue-800",
  marquee:       "bg-purple-100 text-purple-800",
  gender_split:  "bg-indigo-100 text-indigo-800",
  category_carousel: "bg-teal-100 text-teal-800",
  popular_now:   "bg-sky-100 text-sky-800",
  why_us:        "bg-cyan-100 text-cyan-800",
  lookbook:      "bg-amber-100 text-amber-800",
  new_arrivals:  "bg-emerald-100 text-emerald-800",
  fabric_tabs:   "bg-violet-100 text-violet-800",
  denyspace:     "bg-fuchsia-100 text-fuchsia-800",
  influencer_picks: "bg-rose-100 text-rose-800",
  motion_picture:"bg-slate-100 text-slate-800",
  community:     "bg-yellow-100 text-yellow-800",
  contact_support: "bg-red-100 text-red-800",
  testimonials:  "bg-pink-100 text-pink-800",
  newsletter:    "bg-lime-100 text-lime-800",
  faq:           "bg-orange-100 text-orange-800",
};

// Canonical home-page order — used only by "Reset order to default" below.
// Resets position alone; section content (picked products, headings,
// slides, etc.) is never touched.
const DEFAULT_POSITIONS: Record<string, number> = {
  hero: 0, marquee: 1, gender_split: 2, category_carousel: 3, popular_now: 4,
  why_us: 5, lookbook: 6, new_arrivals: 7, fabric_tabs: 8, denyspace: 9,
  influencer_picks: 10, motion_picture: 11, community: 12, contact_support: 13,
  testimonials: 14, newsletter: 15, faq: 16,
};

function AdminWebsiteSections() {
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WebsiteSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

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

  const resetOrderToDefault = async () => {
    if (!confirm("Reset every section back to its original order? This only changes order — no content, visibility, or headings are touched.")) return;
    setResetting(true);
    const updates = sections
      .filter((s) => s.section_type in DEFAULT_POSITIONS)
      .map((s) => supabase.from("website_sections").update({ position: DEFAULT_POSITIONS[s.section_type] }).eq("id", s.id));
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) { toast.error(failed.error.message); setResetting(false); return; }
    toast.success("Order reset to default");
    setResetting(false);
    load();
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
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display text-4xl md:text-5xl text-foreground">WEBSITE SECTIONS.</h1>
          <p className="text-sm mt-2 text-muted-foreground">Toggle visibility, reorder, and edit each homepage section. Delete duplicates with the trash icon.</p>
        </div>
        <button
          onClick={resetOrderToDefault}
          disabled={resetting}
          className="h-9 px-4 rounded border border-border bg-background text-[11px] font-semibold tracking-widest uppercase hover:border-primary hover:text-primary transition-colors disabled:opacity-40 shrink-0"
        >
          {resetting ? "RESETTING…" : "RESET ORDER TO DEFAULT"}
        </button>
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
  const [popularNowSearch, setPopularNowSearch] = useState("");
  const [arrivalsSearch, setArrivalsSearch] = useState("");

  switch (section.section_type as SectionType) {
    case "hero": {
      const c = cfg as Partial<HeroConfig>;
      const slides: HeroSlide[] = c.slides ?? [];

      const setSlides = (next: HeroSlide[]) => set("slides", next);
      const updateSlide = (i: number, patch: Partial<HeroSlide>) => {
        const next = [...slides];
        next[i] = { ...next[i], ...patch };
        setSlides(next);
      };
      const addSlide = () => {
        setSlides([
          ...slides,
          {
            id: `slide-${Date.now()}`,
            media_type: "image",
            src: "",
            title: "NEW SLIDE\nHEADLINE",
            subtitle: "",
            cta_label: "SHOP NOW",
            cta_href: "/shop",
          },
        ]);
      };
      const removeSlide = (i: number) => setSlides(slides.filter((_, idx) => idx !== i));
      const moveSlide = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= slides.length) return;
        const next = [...slides];
        [next[i], next[j]] = [next[j], next[i]];
        setSlides(next);
      };

      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The hero is a slider — add as many slides as you like, each with its own image or video, headline, and buttons.
          </div>

          {slides.map((slide, i) => (
            <div key={slide.id} className="border border-border rounded p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold tracking-widest text-foreground">SLIDE {i + 1}</div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors">
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors">
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSlide(i)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-red-500 hover:text-red-500 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <F label="HEADLINE (use a new line for a line break)">
                <textarea
                  rows={2}
                  value={slide.title}
                  onChange={(e) => updateSlide(i, { title: e.target.value })}
                  className="inp"
                  placeholder={"IN THE CUT\nNOT IN THE CROWD"}
                />
              </F>
              <F label="SUBTEXT"><input value={slide.subtitle} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} className="inp" placeholder="Elevated streetwear…" /></F>

              <MediaField
                label="SLIDE MEDIA"
                value={{ url: slide.src, type: slide.media_type }}
                onChange={(v) => updateSlide(i, { src: v.url, media_type: v.type })}
              />

              <div className="grid grid-cols-2 gap-3">
                <F label="BUTTON 1 LABEL"><input value={slide.cta_label} onChange={(e) => updateSlide(i, { cta_label: e.target.value })} className="inp" placeholder="SHOP THE DROP" /></F>
                <F label="BUTTON 1 URL"><input value={slide.cta_href} onChange={(e) => updateSlide(i, { cta_href: e.target.value })} className="inp" placeholder="/shop" /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="BUTTON 2 LABEL (optional)"><input value={slide.cta2_label ?? ""} onChange={(e) => updateSlide(i, { cta2_label: e.target.value })} className="inp" placeholder="VIEW LOOKBOOK" /></F>
                <F label="BUTTON 2 URL (optional)"><input value={slide.cta2_href ?? ""} onChange={(e) => updateSlide(i, { cta2_href: e.target.value })} className="inp" placeholder="/lookbook" /></F>
              </div>
            </div>
          ))}

          <button type="button" onClick={addSlide}
            className="w-full h-10 rounded border border-dashed border-border text-xs font-semibold tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            + ADD SLIDE
          </button>
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
      const moveSlug = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= selected.length) return;
        const next = [...selected];
        [next[i], next[j]] = [next[j], next[i]];
        set("product_slugs", next);
      };
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The heading/eyebrow/subtext for this section is managed on the <strong className="text-foreground">Headings</strong> admin page (key: new_arrivals).
          </div>
          <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="VIEW ALL" /></F>
          <F label={`ADD PRODUCTS — search and add, up to 12 (${selected.length}/12 selected)`}>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={arrivalsSearch}
                onChange={(e) => setArrivalsSearch(e.target.value)}
                placeholder="Search products to add…"
                className="inp pl-9"
              />
              {arrivalsSearch.trim() && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-64 overflow-y-auto">
                  {(() => {
                    const q = arrivalsSearch.trim().toLowerCase();
                    const results = allProducts.filter((p) => !selected.includes(p.slug) && p.name.toLowerCase().includes(q));
                    if (results.length === 0) return <p className="p-3 text-sm text-muted-foreground">No matching products.</p>;
                    return results.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        disabled={selected.length >= 12}
                        onClick={() => { set("product_slugs", [...selected, p.slug].slice(0, 12)); setArrivalsSearch(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/40 text-left disabled:opacity-40"
                      >
                        <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </F>
          {selected.length > 0 && (
            <F label="SELECTED — order">
              <div className="border border-border rounded divide-y divide-border">
                {selected.map((slug, i) => {
                  const p = allProducts.find((ap) => ap.slug === slug);
                  return (
                    <div key={slug} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-sm text-foreground flex-1 truncate">{p?.name ?? slug}</span>
                      <button type="button" onClick={() => moveSlug(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="size-4" /></button>
                      <button type="button" onClick={() => moveSlug(i, 1)} disabled={i === selected.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="size-4" /></button>
                      <button type="button" onClick={() => set("product_slugs", selected.filter((s) => s !== slug))} className="text-muted-foreground hover:text-red-500"><X className="size-4" /></button>
                    </div>
                  );
                })}
              </div>
            </F>
          )}
        </div>
      );
    }
    case "popular_now": {
      const c = cfg as Partial<PopularNowConfig>;
      const items: PopularNowItem[] = c.items ?? [];
      const selectedSlugs = items.map((it) => it.slug);
      const moveItem = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        set("items", next);
      };
      const updateTag = (i: number, tag: string) => {
        const next = [...items];
        next[i] = { ...next[i], tag: tag || undefined };
        set("items", next);
      };
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The heading for this section is managed on the <strong className="text-foreground">Headings</strong> admin page (key: popular_now).
          </div>
          <F label="VIEW ALL LINK (the tile at the end of the row)"><input value={c.view_all_href ?? ""} onChange={(e) => set("view_all_href", e.target.value)} className="inp" placeholder="/shop" /></F>
          {items.length > 0 && (
            <F label="SELECTED — order, and an optional tag (BEST SELLER, NEW ARRIVAL, or any custom text)">
              <div className="border border-border rounded divide-y divide-border">
                {items.map((item, i) => {
                  const p = allProducts.find((ap) => ap.slug === item.slug);
                  return (
                    <div key={item.slug} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-sm text-foreground flex-1 truncate">{p?.name ?? item.slug}</span>
                      <input
                        value={item.tag ?? ""}
                        onChange={(e) => updateTag(i, e.target.value)}
                        placeholder="TAG (optional)"
                        className="bg-background border border-border h-8 px-2 text-xs font-mono w-40"
                      />
                      <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="size-4" /></button>
                      <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="size-4" /></button>
                      <button type="button" onClick={() => set("items", items.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-500"><X className="size-4" /></button>
                    </div>
                  );
                })}
              </div>
            </F>
          )}
          <F label={`ADD PRODUCTS — search and add, up to 12 (${items.length}/12 selected)`}>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={popularNowSearch}
                onChange={(e) => setPopularNowSearch(e.target.value)}
                placeholder="Search products to add…"
                className="inp pl-9"
              />
              {popularNowSearch.trim() && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-64 overflow-y-auto">
                  {(() => {
                    const q = popularNowSearch.trim().toLowerCase();
                    const results = allProducts.filter((p) => !selectedSlugs.includes(p.slug) && p.name.toLowerCase().includes(q));
                    if (results.length === 0) return <p className="p-3 text-sm text-muted-foreground">No matching products.</p>;
                    return results.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        disabled={items.length >= 12}
                        onClick={() => { set("items", [...items, { slug: p.slug }].slice(0, 12)); setPopularNowSearch(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/40 text-left disabled:opacity-40"
                      >
                        <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </F>
        </div>
      );
    }
    case "fabric_tabs": {
      const c = cfg as Partial<FabricTabsConfig>;
      const tabs: FabricTab[] = c.tabs ?? [];
      const updateTab = (i: number, patch: Partial<FabricTab>) => {
        const next = [...tabs];
        next[i] = { ...next[i], ...patch };
        set("tabs", next);
      };
      const removeTab = (i: number) => set("tabs", tabs.filter((_, idx) => idx !== i));
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The "PRODUCT SPECIFICATIONS" tabs (T-SHIRTS / SHIRTS / JEANS by default) — each tab's label, headline, description, and photo.
          </div>
          {tabs.map((tab, i) => (
            <div key={i} className="border border-border rounded p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold tracking-widest text-foreground">TAB {i + 1}</div>
                <button type="button" onClick={() => removeTab(i)} className="text-mono text-[10px] tracking-widest text-red-500 hover:underline">REMOVE</button>
              </div>
              <F label="TAB LABEL"><input value={tab.name} onChange={(e) => updateTab(i, { name: e.target.value })} className="inp" placeholder="T-SHIRTS" /></F>
              <F label="HEADLINE"><input value={tab.title} onChange={(e) => updateTab(i, { title: e.target.value })} className="inp" placeholder="300+ GSM HEAVYWEIGHT COTTON" /></F>
              <F label="DESCRIPTION"><textarea rows={3} value={tab.desc} onChange={(e) => updateTab(i, { desc: e.target.value })} className="inp" /></F>
              <F label="LINK (where the arrow navigates to)"><input value={tab.href ?? ""} onChange={(e) => updateTab(i, { href: e.target.value })} className="inp" placeholder="/collections/tops" /></F>
              <MediaField
                label="PHOTO"
                value={{ url: tab.img, type: tab.img_type ?? "image" }}
                onChange={(v) => updateTab(i, { img: v.url, img_type: v.type })}
              />
            </div>
          ))}
          <button type="button" onClick={() => set("tabs", [...tabs, { id: `tab-${Date.now()}`, name: "NEW TAB", title: "", desc: "", img: "" }])}
            className="w-full h-10 rounded border border-dashed border-border text-xs font-semibold tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            + ADD TAB
          </button>
        </div>
      );
    }
    case "motion_picture": {
      const c = cfg as Partial<MotionPictureConfig>;
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The heading text/color for this section is managed on the <strong className="text-foreground">Headings</strong> admin page (key: motion_picture). Here you set the background video and the subtext line.
          </div>
          <MediaField
            label="BACKGROUND MEDIA"
            value={{ url: c.video_url ?? "", type: c.media_type ?? "video" }}
            onChange={(v) => onChange({ ...cfg, video_url: v.url, media_type: v.type })}
          />
          <F label="SUBTEXT"><textarea rows={2} value={c.subtext ?? ""} onChange={(e) => set("subtext", e.target.value)} className="inp" /></F>
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
            FAQ items are managed in the <strong className="text-foreground">FAQ</strong> admin page. The section heading/eyebrow is managed on <strong className="text-foreground">Headings</strong> (key: faq). Here you edit the "view all" link text and toggle visibility.
          </div>
          <F label="VIEW ALL LINK TEXT"><input value={c.view_all_label ?? ""} onChange={(e) => set("view_all_label", e.target.value)} className="inp" placeholder="VIEW ALL FAQS" /></F>
        </div>
      );
    }
    case "why_us": {
      const c = cfg as Partial<WhyUsConfig>;
      const features: WhyUsFeature[] = c.features ?? [];
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The heading/eyebrow/second line is managed on the <strong className="text-foreground">Headings</strong> admin page (key: why_us).
          </div>
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
    case "newsletter": {
      const c = cfg as Partial<NewsletterConfig>;
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The heading/eyebrow/subtext is managed on the <strong className="text-foreground">Headings</strong> admin page (key: newsletter).
          </div>
          <F label="CTA BUTTON"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="GET EARLY ACCESS" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="SUCCESS HEADING (shown after signup)"><input value={c.success_heading ?? ""} onChange={(e) => set("success_heading", e.target.value)} className="inp" placeholder="✓ YOU'RE ON THE LIST" /></F>
            <F label="SUCCESS BODY"><input value={c.success_body ?? ""} onChange={(e) => set("success_body", e.target.value)} className="inp" placeholder="We'll hit you first when the next drop goes live." /></F>
          </div>
        </div>
      );
    }
    case "gender_split": {
      const c = cfg as Partial<GenderSplitConfig>;
      const cards: SplitCard[] = c.cards ?? [];
      const setCards = (next: SplitCard[]) => set("cards", next);
      const updateCard = (i: number, patch: Partial<SplitCard>) => {
        const next = [...cards];
        next[i] = { ...next[i], ...patch };
        setCards(next);
      };
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            Full-bleed cards side by side (Men / Accessories / Women, or however you want to split it) — up to 3.
          </div>
          <F label="BUTTON TEXT (shown on every card)"><input value={c.explore_label ?? ""} onChange={(e) => set("explore_label", e.target.value)} className="inp" placeholder="EXPLORE" /></F>
          {cards.map((card, i) => (
            <div key={i} className="border border-border rounded p-4 space-y-3 bg-muted/20">
              <div className="text-[11px] font-semibold tracking-widest text-foreground">CARD {i + 1}</div>
              <F label="LABEL"><input value={card.label} onChange={(e) => updateCard(i, { label: e.target.value })} className="inp" placeholder="SHOP MEN" /></F>
              <MediaField
                label="CARD MEDIA"
                value={{ url: card.src, type: card.media_type }}
                onChange={(v) => updateCard(i, { src: v.url, media_type: v.type })}
              />
              <F label="CTA LINK"><input value={card.cta_href} onChange={(e) => updateCard(i, { cta_href: e.target.value })} className="inp" placeholder="/collections/men" /></F>
            </div>
          ))}
          {cards.length < 3 && (
            <button type="button" onClick={() => setCards([...cards, { media_type: "image", src: "", label: "NEW CARD", cta_href: "/shop" }])}
              className="w-full h-10 rounded border border-dashed border-border text-xs font-semibold tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + ADD CARD
            </button>
          )}
        </div>
      );
    }
    case "category_carousel": {
      const c = cfg as Partial<CategoryCarouselConfig>;
      const slides: CarouselSlide[] = c.slides ?? [];
      const setSlides = (next: CarouselSlide[]) => set("slides", next);
      const updateSlide = (i: number, patch: Partial<CarouselSlide>) => {
        const next = [...slides];
        next[i] = { ...next[i], ...patch };
        setSlides(next);
      };
      const removeSlide = (i: number) => setSlides(slides.filter((_, idx) => idx !== i));
      const moveSlide = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= slides.length) return;
        const next = [...slides];
        [next[i], next[j]] = [next[j], next[i]];
        setSlides(next);
      };
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            Full-screen carousel — each slide represents a themed collection (Best Sellers, New Drops, etc.) and links to that collection.
          </div>
          {slides.map((slide, i) => (
            <div key={i} className="border border-border rounded p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold tracking-widest text-foreground">SLIDE {i + 1}</div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors">
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-primary hover:text-primary disabled:opacity-25 transition-colors">
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSlide(i)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-border bg-background hover:border-red-500 hover:text-red-500 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <F label="HEADING"><input value={slide.label} onChange={(e) => updateSlide(i, { label: e.target.value })} className="inp" placeholder="BEST SELLERS" /></F>
              <F label="PARAGRAPH (optional)"><textarea rows={2} value={slide.subtitle ?? ""} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} className="inp" placeholder="Short line under the heading…" /></F>
              <MediaField
                label="SLIDE MEDIA"
                value={{ url: slide.src, type: slide.media_type }}
                onChange={(v) => updateSlide(i, { src: v.url, media_type: v.type })}
              />
              <div className="grid grid-cols-2 gap-3">
                <F label="BUTTON LABEL (optional)"><input value={slide.cta_label ?? ""} onChange={(e) => updateSlide(i, { cta_label: e.target.value })} className="inp" placeholder="SHOP NOW" /></F>
                <F label="LINK (collection / shop URL)"><input value={slide.href} onChange={(e) => updateSlide(i, { href: e.target.value })} className="inp" placeholder="/shop?sort=best" /></F>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setSlides([...slides, { media_type: "image", src: "", label: "NEW SLIDE", href: "/shop" }])}
            className="w-full h-10 rounded border border-dashed border-border text-xs font-semibold tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            + ADD SLIDE
          </button>
        </div>
      );
    }
    case "denyspace": {
      const c = cfg as Partial<DenySpaceConfig>;
      const benefits: DenySpaceBenefit[] = c.benefits ?? [];
      return (
        <div className="space-y-4">
          <MediaField
            label="LOGO"
            value={{ url: c.logo_url ?? "", type: c.logo_type ?? "image" }}
            onChange={(v) => onChange({ ...cfg, logo_url: v.url, logo_type: v.type })}
          />
          <F label="DESCRIPTION (use a new line for a line break)"><textarea rows={3} value={c.description ?? ""} onChange={(e) => set("description", e.target.value)} className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="CTA LABEL"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="JOIN DENYSPACE" /></F>
            <F label="CTA LINK"><input value={c.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} className="inp" placeholder="/rewards" /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="BACKGROUND COLOR (used when no background media is set)"><input type="color" value={c.bg_color ?? "#0d0d0d"} onChange={(e) => set("bg_color", e.target.value)} className="inp h-10 p-1" /></F>
            <F label="TEXT COLOR"><input type="color" value={c.text_color ?? "#ffffff"} onChange={(e) => set("text_color", e.target.value)} className="inp h-10 p-1" /></F>
          </div>
          <MediaField
            label="BACKGROUND MEDIA (optional — overrides background color when set)"
            value={{ url: c.bg_media_url ?? "", type: c.bg_media_type ?? "image" }}
            onChange={(v) => onChange({ ...cfg, bg_media_url: v.url, bg_media_type: v.type })}
          />
          {c.bg_media_url && (
            <button
              type="button"
              onClick={() => onChange({ ...cfg, bg_media_url: "" })}
              className="text-mono text-[10px] tracking-widest text-red-500 hover:underline"
            >
              REMOVE BACKGROUND MEDIA
            </button>
          )}
          <div className="text-[11px] font-semibold tracking-widest text-foreground mt-2 mb-1">BENEFIT ICONS (4 items)</div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded p-3 space-y-2 bg-muted/20">
              <div className="text-[10px] font-semibold tracking-widest text-muted-foreground">ICON {i + 1}</div>
              <div className="grid grid-cols-2 gap-3">
                <F label="ICON">
                  <IconPicker
                    value={benefits[i]?.icon ?? "Star"}
                    onChange={(name) => { const next = [...benefits]; next[i] = { ...next[i], icon: name }; set("benefits", next); }}
                  />
                </F>
                <F label="LABEL">
                  <input value={benefits[i]?.label ?? ""} onChange={(e) => { const next = [...benefits]; next[i] = { ...next[i], label: e.target.value }; set("benefits", next); }} className="inp" placeholder="FREE SHIPPING" />
                </F>
              </div>
              <F label="DESCRIPTION">
                <input value={benefits[i]?.desc ?? ""} onChange={(e) => { const next = [...benefits]; next[i] = { ...next[i], desc: e.target.value }; set("benefits", next); }} className="inp" placeholder="On every qualifying order" />
              </F>
            </div>
          ))}
        </div>
      );
    }
    case "influencer_picks": {
      const c = cfg as Partial<InfluencerPicksConfig>;
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            The picks themselves are managed on the <strong className="text-foreground">Influencer Picks</strong> admin page; the heading is managed on <strong className="text-foreground">Headings</strong> (key: influencer_picks). Here you set the link text.
          </div>
          <F label="LINK TEXT"><input value={c.explore_label ?? ""} onChange={(e) => set("explore_label", e.target.value)} className="inp" placeholder="EXPLORE OUR COLLECTION" /></F>
        </div>
      );
    }
    case "contact_support": {
      const c = cfg as Partial<ContactSupportConfig>;
      const cards: ContactCard[] = c.cards ?? [];
      const DEFAULT_CARDS: ContactCard[] = [
        { label: "EMAIL US", desc: "For order issues, returns & general queries" },
        { label: "WHATSAPP", desc: "Quick help via WhatsApp chat" },
        { label: "HOURS", desc: "Response within 24 hours" },
      ];
      const updateCard = (i: number, patch: Partial<ContactCard>) => {
        const base = cards.length === 3 ? cards : DEFAULT_CARDS;
        const next = [...base];
        next[i] = { ...next[i], ...patch };
        set("cards", next);
      };
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            Email/WhatsApp/hours values come from Brand Settings. The heading is managed on <strong className="text-foreground">Headings</strong> (key: contact_support). Here you edit each card's label/description and the button text.
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-border rounded p-3 space-y-2 bg-muted/20">
              <div className="text-[10px] font-semibold tracking-widest text-muted-foreground">CARD {i + 1}</div>
              <F label="LABEL">
                <input value={(cards.length === 3 ? cards : DEFAULT_CARDS)[i]?.label ?? ""} onChange={(e) => updateCard(i, { label: e.target.value })} className="inp" />
              </F>
              <F label="DESCRIPTION">
                <input value={(cards.length === 3 ? cards : DEFAULT_CARDS)[i]?.desc ?? ""} onChange={(e) => updateCard(i, { desc: e.target.value })} className="inp" />
              </F>
            </div>
          ))}
          <F label="BUTTON TEXT"><input value={c.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} className="inp" placeholder="VISIT SUPPORT PAGE" /></F>
        </div>
      );
    }
    case "testimonials": {
      const c = cfg as Partial<TestimonialsConfig>;
      const quotes: TestimonialFallback[] = c.fallback_quotes ?? [];
      const updateQuote = (i: number, patch: Partial<TestimonialFallback>) => {
        const next = [...quotes];
        next[i] = { ...next[i], ...patch };
        set("fallback_quotes", next);
      };
      const removeQuote = (i: number) => set("fallback_quotes", quotes.filter((_, idx) => idx !== i));
      return (
        <div className="space-y-4">
          <div className="p-3 rounded bg-muted/60 text-sm text-muted-foreground">
            Real testimonials are managed on the <strong className="text-foreground">Testimonials</strong> admin page. The quotes below are only shown as a placeholder when no real testimonials exist yet. The heading is managed on <strong className="text-foreground">Headings</strong> (key: testimonials).
          </div>
          {quotes.map((q, i) => (
            <div key={i} className="border border-border rounded p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold tracking-widest text-muted-foreground">FALLBACK QUOTE {i + 1}</div>
                <button type="button" onClick={() => removeQuote(i)} className="text-mono text-[10px] tracking-widest text-red-500 hover:underline">REMOVE</button>
              </div>
              <F label="QUOTE"><textarea rows={2} value={q.quote} onChange={(e) => updateQuote(i, { quote: e.target.value })} className="inp" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="NAME"><input value={q.name} onChange={(e) => updateQuote(i, { name: e.target.value })} className="inp" /></F>
                <F label="CITY"><input value={q.city} onChange={(e) => updateQuote(i, { city: e.target.value })} className="inp" /></F>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set("fallback_quotes", [...quotes, { quote: "", name: "", city: "" }])}
            className="w-full h-10 rounded border border-dashed border-border text-xs font-semibold tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            + ADD FALLBACK QUOTE
          </button>
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

