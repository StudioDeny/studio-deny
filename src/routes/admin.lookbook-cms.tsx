import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LookbookSlide } from "@/types/database";
import { MediaField } from "@/components/admin/MediaField";
import { listAllAdminProducts, type Product } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/lookbook-cms")({
  component: LookbookCmsAdmin,
  head: () => ({ meta: [{ title: "Look Book — STUDIO DENY" }] }),
});

const EMPTY: Omit<LookbookSlide, "id" | "created_at"> = {
  image_url: "",
  media_type: "image",
  caption: null,
  link_href: null,
  product_slug: null,
  is_active: true,
  position: 0,
};

function ProductPicker({
  value,
  products,
  onChange,
}: {
  value: string | null;
  products: Product[];
  onChange: (slug: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const picked = value ? products.find((p) => p.slug === value) : null;

  if (picked) {
    return (
      <div className="flex items-center gap-3 border border-border p-2">
        <img src={picked.image} alt="" className="size-10 object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{picked.name}</div>
          <div className="text-mono text-[10px] text-muted-foreground">{formatINR(picked.price)}</div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="border border-border h-8 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary">
          CHANGE
        </button>
      </div>
    );
  }

  const matches = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="inp pl-9"
          placeholder="Search products by name…"
        />
      </div>
      {matches.length > 0 && (
        <div className="border border-border mt-2 divide-y divide-border max-h-48 overflow-y-auto">
          {matches.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => { onChange(p.slug); setQuery(""); }}
              className="w-full flex items-center gap-3 p-2 hover:bg-muted/40 text-left"
            >
              <img src={p.image} alt="" className="size-8 object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{p.name}</div>
                <div className="text-mono text-[10px] text-muted-foreground">{formatINR(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LookbookCmsAdmin() {
  const [rows, setRows] = useState<LookbookSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<LookbookSlide> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("lookbook_slides").select("*").order("position");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    listAllAdminProducts().then(setProducts);
  }, []);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("lookbook_slides").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, is_active: val } : x)));
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRows(next.map((r, i) => ({ ...r, position: i })));
    await Promise.all(next.map((r, i) => supabase.from("lookbook_slides").update({ position: i }).eq("id", r.id)));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("lookbook_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.image_url?.trim()) return toast.error("Photo/video is required");
    if (!modal.product_slug) return toast.error("Pick a product");
    setSaving(true);
    const payload = {
      image_url: modal.image_url,
      media_type: modal.media_type ?? "image",
      product_slug: modal.product_slug,
      caption: modal.caption ?? null,
      link_href: modal.link_href ?? null,
      is_active: modal.is_active ?? true,
      position: modal.position ?? 0,
    };
    if (modal.id) {
      const { error } = await supabase.from("lookbook_slides").update(payload).eq("id", modal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("lookbook_slides").insert({ ...payload, position: rows.length });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success(modal.id ? "Updated" : "Created");
    setSaving(false);
    setModal(null);
    load();
  };

  const productName = (slug: string | null) => (slug ? products.find((p) => p.slug === slug)?.name : null);

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-display text-4xl md:text-5xl">LOOK BOOK.</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the homepage lookbook — each card is a photo/video linked to one product.</p>
        </div>
        <button onClick={() => setModal({ ...EMPTY })} className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary">
          <Plus className="size-4" /> NEW CARD
        </button>
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">ORDER</th>
              <th className="text-left p-3">CARD</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder(r.id, -1)} disabled={idx === 0} className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronUp className="size-3" />
                    </button>
                    <button onClick={() => reorder(r.id, 1)} disabled={idx === rows.length - 1} className="border border-border h-6 w-6 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.media_type === "video" ? (
                      <video src={r.image_url} muted playsInline className="w-14 h-16 object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <img src={r.image_url} alt="" className="w-14 h-16 object-cover flex-shrink-0 border border-border" />
                    )}
                    <div>
                      <div className="font-semibold">{productName(r.product_slug) || "— no product picked —"}</div>
                      {r.product_slug && <div className="text-muted-foreground text-xs">{r.product_slug}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <button onClick={() => toggle(r.id, !r.is_active)} className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${r.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setModal(r)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                      <Pencil className="size-3" />
                    </button>
                    <button onClick={() => remove(r.id)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">No lookbook cards yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{modal.id ? "EDIT" : "NEW"} CARD</div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground text-lg"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <MediaField
                label="PHOTO / VIDEO *"
                value={{ url: modal.image_url ?? "", type: modal.media_type ?? "image" }}
                onChange={(v) => setModal({ ...modal, image_url: v.url, media_type: v.type })}
              />
              <F label="PRODUCT * (the card's button links here)">
                <ProductPicker
                  value={modal.product_slug ?? null}
                  products={products}
                  onChange={(slug) => setModal({ ...modal, product_slug: slug })}
                />
              </F>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={modal.is_active ?? true} onChange={(e) => setModal({ ...modal, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-mono text-[11px] tracking-widest">ACTIVE</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setModal(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CANCEL</button>
            </div>
          </div>
        </div>
      )}

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
