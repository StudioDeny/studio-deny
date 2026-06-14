import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SeoSettings } from "@/types/database";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo")({
  component: AdminSeo,
});

const PAGE_SLUGS = ["home", "shop", "about", "contact", "cart", "checkout"];

function AdminSeo() {
  const [pages, setPages] = useState<SeoSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("home");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<SeoSettings>>({});

  const load = async () => {
    const { data, error } = await supabase.from("seo_settings").select("*");
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows = data ?? [];

    // Ensure all default slugs exist locally
    const map = new Map(rows.map((r) => [r.page_slug, r]));
    const merged = PAGE_SLUGS.map((slug) => map.get(slug) ?? ({
      id: "",
      page_slug: slug,
      title: null,
      description: null,
      og_image: null,
      og_title: null,
      og_description: null,
      canonical_url: null,
      no_index: false,
      created_at: "",
      updated_at: "",
    } as SeoSettings));
    setPages(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const p = pages.find((p) => p.page_slug === active);
    if (p) setDraft({ ...p });
  }, [active, pages]);

  const save = async () => {
    setSaving(true);
    const existing = pages.find((p) => p.page_slug === active);
    const payload = {
      page_slug: active,
      title: draft.title || null,
      description: draft.description || null,
      og_image: draft.og_image || null,
      og_title: draft.og_title || null,
      og_description: draft.og_description || null,
      canonical_url: draft.canonical_url || null,
      no_index: draft.no_index ?? false,
    };

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("seo_settings").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("seo_settings").insert(payload));
    }

    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(`SEO saved for /${active}`);
    setSaving(false);
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-display text-4xl md:text-5xl">SEO SETTINGS.</h1>
        <p className="text-muted-foreground text-sm mt-2">Configure meta tags and Open Graph data per page.</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {PAGE_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => setActive(slug)}
            className={`text-mono text-[10px] tracking-widest px-3 h-8 border ${active === slug ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
          >
            /{slug.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="border border-border bg-surface p-6 space-y-5">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">PAGE: /{active.toUpperCase()}</div>

        <section className="space-y-4">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">META TAGS</div>
          <F label="TITLE TAG">
            <input
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Page title for browser tab + search engines"
              className="inp"
            />
          </F>
          <F label="META DESCRIPTION">
            <textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="160 character summary for search results"
              className="inp"
            />
          </F>
          <F label="CANONICAL URL">
            <input
              value={draft.canonical_url ?? ""}
              onChange={(e) => setDraft({ ...draft, canonical_url: e.target.value })}
              placeholder="https://studiodeny.in/shop"
              className="inp"
            />
          </F>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.no_index ?? false}
              onChange={(e) => setDraft({ ...draft, no_index: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-mono text-[11px] tracking-widest">NO INDEX (hide from search engines)</span>
          </label>
        </section>

        <section className="space-y-4 pt-4 border-t border-border">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">OPEN GRAPH</div>
          <F label="OG TITLE">
            <input
              value={draft.og_title ?? ""}
              onChange={(e) => setDraft({ ...draft, og_title: e.target.value })}
              placeholder="Defaults to title tag if empty"
              className="inp"
            />
          </F>
          <F label="OG DESCRIPTION">
            <textarea
              rows={3}
              value={draft.og_description ?? ""}
              onChange={(e) => setDraft({ ...draft, og_description: e.target.value })}
              placeholder="Defaults to meta description if empty"
              className="inp"
            />
          </F>
          <F label="OG IMAGE URL">
            <input
              value={draft.og_image ?? ""}
              onChange={(e) => setDraft({ ...draft, og_image: e.target.value })}
              placeholder="1200×630 image URL for social sharing"
              className="inp"
            />
          </F>
          {draft.og_image && (
            <div className="border border-border p-2">
              <img src={draft.og_image} alt="OG preview" className="w-full max-h-32 object-cover" />
            </div>
          )}
        </section>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50"
      >
        {saving ? "SAVING…" : "SAVE SEO SETTINGS"}
      </button>

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
