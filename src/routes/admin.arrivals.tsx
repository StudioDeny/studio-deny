import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSettings, saveSettings, type LoyaltySettings } from "@/lib/settings";
import { listProducts, type Product } from "@/lib/productsStore";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";

export const Route = createFileRoute("/admin/arrivals")({
  component: ArrivalsAdmin,
});

function ArrivalsAdmin() {
  const [s, setS] = useState<LoyaltySettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { setS(getSettings()); listProducts().then(setProducts); }, []);
  if (!s) return <div className="text-mono text-xs">LOADING…</div>;

  const a = s.arrivals;
  const set = <K extends keyof typeof a>(k: K, v: (typeof a)[K]) =>
    setS({ ...s, arrivals: { ...a, [k]: v } });

  const toggle = (slug: string) => {
    const has = a.productSlugs.includes(slug);
    const next = has ? a.productSlugs.filter((x) => x !== slug) : [...a.productSlugs, slug].slice(0, 8);
    set("productSlugs", next);
  };

  const picked = products.filter((p) => a.productSlugs.includes(p.slug));
  const searchResults = q.trim()
    ? products.filter((p) => !a.productSlugs.includes(p.slug) && p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">NEW ARRIVALS.</h1>
      <p className="text-muted-foreground text-sm mb-2">Curate the "New Arrivals" section that appears on the homepage. Toggle visibility, edit the heading, then pick which products to feature.</p>
      <div className="flex items-center gap-4 mb-8">
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-mono text-[11px] tracking-widest text-primary hover:underline">↗ PREVIEW HOMEPAGE</a>
        <span className="text-muted-foreground text-[11px] text-mono">— changes appear after saving</span>
      </div>

      <div className="border border-border bg-surface p-6 mb-6 grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={a.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">SHOW SECTION ON HOME</span>
        </label>
        <Field label="EYEBROW"><input value={a.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className="inp" /></Field>
        <Field label="CTA LABEL"><input value={a.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className="inp" /></Field>
        <Field label="TITLE"><input value={a.title} onChange={(e) => set("title", e.target.value)} className="inp" /></Field>
        <Field label="SUBTITLE"><input value={a.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="inp" /></Field>
      </div>

      <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-3">PICK PRODUCTS ({a.productSlugs.length}/8)</div>

      <div className="relative mb-4 max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products to add…"
          className="bg-background border border-border h-10 pl-9 pr-3 w-full text-sm focus:border-primary outline-none"
        />
        {q.trim() && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg max-h-72 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No matching products.</p>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  disabled={a.productSlugs.length >= 8}
                  onClick={() => { toggle(p.slug); setQ(""); }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-surface text-left disabled:opacity-40"
                >
                  <img src={p.image} alt={p.name} className="size-10 object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{p.name}</div>
                    <div className="text-mono text-[10px] text-muted-foreground">{p.category}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {picked.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-6">No products picked yet — search above to add up to 8.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {picked.map((p) => (
            <button key={p.slug} onClick={() => toggle(p.slug)}
              className="relative border border-primary glow-primary-sm bg-surface text-left transition">
              <img src={p.image} alt={p.name} className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <div className="absolute top-2 right-2 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check className="size-3" /></div>
              <div className="p-2">
                <div className="text-xs font-semibold truncate">{p.name}</div>
                <div className="text-mono text-[10px] text-muted-foreground">{p.category}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => { saveSettings(s); toast.success("Arrivals saved"); }}
        className="mt-6 bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary">
        SAVE
      </button>
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}`}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>{children}</label>;
}
