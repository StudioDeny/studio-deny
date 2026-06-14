import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getStoredProduct, upsertProduct } from "@/lib/productsStore";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { ProductForm } from "./admin.products.new";
import { supabase } from "@/lib/supabase";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/products/$slug")({
  component: EditProduct,
});

type Variant = {
  id?: string;
  product_id: string;
  size: string;
  color?: string;
  color_hex?: string;
  stock: number;
  price?: number;
  compare_price?: number;
  sku?: string;
  is_active?: boolean;
};

function EditProduct() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);

  useEffect(() => {
    setP(getStoredProduct(slug) ?? null);
    fetchVariants();
  }, [slug]);

  const fetchVariants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", slug)
      .eq("is_active", true)
      .order("size");
    setVariants(data ?? []);
    setLoading(false);
  };

  const saveVariant = async (v: Variant) => {
    if (v.id) {
      const { error } = await supabase
        .from("product_variants")
        .update({
          size: v.size, color: v.color ?? null, color_hex: v.color_hex ?? null,
          stock: v.stock, price: v.price ?? null, compare_price: v.compare_price ?? null,
          sku: v.sku ?? null,
        })
        .eq("id", v.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("product_variants").insert({
        product_id: slug, size: v.size, color: v.color ?? null,
        color_hex: v.color_hex ?? null, stock: v.stock,
        price: v.price ?? null, compare_price: v.compare_price ?? null, sku: v.sku ?? null,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Variant saved");
    setShowModal(false);
    setEditing(null);
    fetchVariants();
  };

  const deleteVariant = async (id: string) => {
    if (!confirm("Delete this variant?")) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    fetchVariants();
  };

  if (!p) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <ProductForm
        initial={p}
        onSave={(np) => { upsertProduct(np); toast.success("Saved"); nav({ to: "/admin/products" }); }}
      />

      <div className="max-w-2xl mt-14 pt-10 border-t border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-display text-3xl">VARIANTS.</h2>
          <button
            onClick={() => { setEditing({ product_id: slug, size: "", stock: 10 }); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-mono text-xs tracking-widest px-4 h-9 hover:glow-primary"
          >
            <Plus className="size-3.5" /> ADD VARIANT
          </button>
        </div>
        <p className="text-muted-foreground text-xs mb-5" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
          VARIANTS OVERRIDE SIZES FROM THE PRODUCT FORM. IF VARIANTS EXIST, THE STOREFRONT USES THEM FOR SIZE/STOCK.
        </p>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : variants.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No variants. Add size + stock combinations to track inventory per size/color.</p>
          </div>
        ) : (
          <div className="border border-border bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-3">SIZE</th>
                  <th className="text-left p-3">COLOR</th>
                  <th className="text-left p-3">STOCK</th>
                  <th className="text-left p-3">PRICE</th>
                  <th className="text-left p-3">SKU</th>
                  <th className="text-right p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td className="p-3 text-mono font-bold">{v.size}</td>
                    <td className="p-3">
                      {v.color ? (
                        <div className="flex items-center gap-2">
                          {v.color_hex && (
                            <span className="size-4 rounded-full border border-border inline-block" style={{ background: v.color_hex }} />
                          )}
                          <span className="text-mono text-xs">{v.color}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={`text-mono text-xs font-semibold ${v.stock === 0 ? "text-secondary" : v.stock <= 5 ? "text-primary" : ""}`}>
                        {v.stock === 0 ? "OUT" : v.stock}
                      </span>
                    </td>
                    <td className="p-3 text-mono text-xs">{v.price ? `₹${v.price}` : <span className="text-muted-foreground">default</span>}</td>
                    <td className="p-3 text-muted-foreground text-xs">{v.sku || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-3">
                        <button
                          onClick={() => { setEditing(v); setShowModal(true); }}
                          className="text-mono text-[10px] tracking-widest text-primary hover:underline"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => deleteVariant(v.id!)}
                          className="text-mono text-[10px] tracking-widest text-secondary hover:underline"
                        >
                          DEL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && editing && (
        <VariantModal
          initial={editing}
          onSave={saveVariant}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function VariantModal({
  initial, onSave, onClose,
}: {
  initial: Variant;
  onSave: (v: Variant) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<Variant>(initial);
  const set = <K extends keyof Variant>(k: K, val: Variant[K]) => setV((prev) => ({ ...prev, [k]: val }));

  const submit = () => {
    if (!v.size.trim()) { toast.error("Size is required"); return; }
    onSave(v);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-border w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-display text-2xl">{initial.id ? "EDIT" : "ADD"} VARIANT.</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SIZE *</div>
              <input value={v.size} onChange={(e) => set("size", e.target.value)} className="inp" placeholder="S, M, L, XL…" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">STOCK *</div>
              <input type="number" value={v.stock} min={0} onChange={(e) => set("stock", Number(e.target.value))} className="inp" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COLOR NAME</div>
              <input value={v.color ?? ""} onChange={(e) => set("color", e.target.value || undefined)} className="inp" placeholder="Black" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COLOR HEX</div>
              <input value={v.color_hex ?? ""} onChange={(e) => set("color_hex", e.target.value || undefined)} className="inp" placeholder="#0a0a0a" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">PRICE ₹ (blank = product default)</div>
              <input
                type="number" value={v.price ?? ""}
                onChange={(e) => set("price", e.target.value ? Number(e.target.value) : undefined)}
                className="inp"
              />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COMPARE AT ₹</div>
              <input
                type="number" value={v.compare_price ?? ""}
                onChange={(e) => set("compare_price", e.target.value ? Number(e.target.value) : undefined)}
                className="inp"
              />
            </label>
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SKU</div>
            <input value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value || undefined)} className="inp" placeholder="SD-TEE-BLK-M" />
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={submit} className="flex-1 bg-primary text-primary-foreground text-mono text-xs tracking-widest h-10 hover:glow-primary">
            SAVE VARIANT
          </button>
          <button onClick={onClose} className="border border-border px-6 text-mono text-xs tracking-widest h-10 hover:border-primary">
            CANCEL
          </button>
        </div>
      </div>
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}`}</style>
    </div>
  );
}
