import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listAllAdminProducts, type Product } from "@/lib/productsStore";
import { Search, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/inventory")({
  component: Inventory,
});

type VariantRow = { id: string; product_id: string; size: string | null; color: string | null; stock: number };
type Row = {
  key: string;
  productSlug: string;
  productName: string;
  productImage: string;
  variantId?: string; // present = editing product_variants.stock; absent = editing products.stock
  label: string; // size/color, or "—" for a no-variant product
  stock: number;
};

const FILTERS = ["ALL", "LOW STOCK", "OUT OF STOCK"] as const;

function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<typeof FILTERS[number]>("ALL");
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const [productsData, { data: variantData }] = await Promise.all([
      listAllAdminProducts(),
      supabase.from("product_variants").select("id, product_id, size, color, stock").order("size"),
    ]);
    setProducts(productsData);
    setVariants((variantData as VariantRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rows: Row[] = useMemo(() => {
    const byProduct = new Map<string, VariantRow[]>();
    for (const v of variants) {
      if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
      byProduct.get(v.product_id)!.push(v);
    }
    const out: Row[] = [];
    for (const p of products) {
      const vs = byProduct.get(p.slug);
      if (vs && vs.length > 0) {
        for (const v of vs) {
          out.push({
            key: v.id,
            productSlug: p.slug,
            productName: p.name,
            productImage: p.image,
            variantId: v.id,
            label: [v.size, v.color].filter(Boolean).join(" / ") || "—",
            stock: v.stock,
          });
        }
      } else {
        out.push({ key: p.slug, productSlug: p.slug, productName: p.name, productImage: p.image, label: "—", stock: p.stock });
      }
    }
    return out.sort((a, b) => a.stock - b.stock);
  }, [products, variants]);

  const filtered = rows
    .filter((r) => !q || r.productName.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => filter === "ALL" || (filter === "LOW STOCK" ? r.stock > 0 && r.stock <= 5 : r.stock === 0));

  const counts = useMemo(() => ({
    ALL: rows.length,
    "LOW STOCK": rows.filter((r) => r.stock > 0 && r.stock <= 5).length,
    "OUT OF STOCK": rows.filter((r) => r.stock === 0).length,
  }), [rows]);

  const saveStock = async (row: Row, next: number) => {
    const value = Math.max(0, next);
    setSaving(row.key);
    const { error } = row.variantId
      ? await supabase.from("product_variants").update({ stock: value }).eq("id", row.variantId)
      : await supabase.from("products").update({ stock: value }).eq("slug", row.productSlug);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    if (row.variantId) {
      setVariants((v) => v.map((x) => (x.id === row.variantId ? { ...x, stock: value } : x)));
    } else {
      setProducts((p) => p.map((x) => (x.slug === row.productSlug ? { ...x, stock: value } : x)));
    }
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">INVENTORY.</h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Every product/size/color across the store in one place, sorted lowest stock first. Edit a number and press Enter or click away to save.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-mono text-[10px] tracking-widest px-3 h-8 inline-flex items-center gap-2 border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}>
            {f} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
          className="bg-background border border-border h-10 pl-9 pr-3 w-full text-sm" />
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">PRODUCT</th>
              <th className="text-left p-3">SIZE / COLOR</th>
              <th className="text-left p-3">STOCK</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">EDIT PRODUCT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.key} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-muted overflow-hidden flex-shrink-0"><img src={r.productImage} alt="" className="w-full h-full object-cover" /></div>
                    <div className="font-semibold">{r.productName}</div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-mono text-xs">{r.label}</td>
                <td className="p-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={r.stock}
                    disabled={saving === r.key}
                    onBlur={(e) => { const n = Number(e.target.value); if (n !== r.stock) saveStock(r, n); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="w-20 bg-background border border-border h-9 px-2 text-mono text-sm disabled:opacity-50"
                  />
                </td>
                <td className="p-3">
                  <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${
                    r.stock > 5 ? "bg-emerald-100 text-emerald-800" : r.stock > 0 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
                  }`}>
                    {r.stock > 5 ? "IN STOCK" : r.stock > 0 ? "LOW STOCK" : "SOLD OUT"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link to="/admin/products/$slug" params={{ slug: r.productSlug }} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary ml-auto"><Pencil className="size-3" /></Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No matching products.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
