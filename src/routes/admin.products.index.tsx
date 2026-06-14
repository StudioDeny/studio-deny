import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listProducts, deleteProduct } from "@/lib/productsStore";
import { listCategories } from "@/lib/catalog";
import { formatINR } from "@/context/CartContext";
import { Plus, Pencil, Trash2, Settings2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProducts,
});

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const refresh = () => setProducts(listProducts());
  useEffect(refresh, []);

  const cats = listCategories();
  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: products.length };
    cats.forEach((c) => { m[c.name] = products.filter((p) => p.category === c.name).length; });
    return m;
  }, [products, cats]);

  const filtered = products
    .filter((p) => active === "ALL" || p.category === active)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.slug.includes(q.toLowerCase()));

  const remove = (slug: string) => {
    if (!confirm("Delete this product?")) return;
    deleteProduct(slug); refresh(); toast.success("Product deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">PRODUCTS.</h1>
        <div className="flex gap-2">
          <Link to="/admin/catalog" className="border border-border h-10 px-3 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            <Settings2 className="size-4" /> CATALOG
          </Link>
          <Link to="/admin/products/new" className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary">
            <Plus className="size-4" /> NEW PRODUCT
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["ALL", ...cats.map((c) => c.name)] as string[]).map((tab) => (
          <button key={tab} onClick={() => setActive(tab)}
            className={`text-mono text-[10px] tracking-widest px-3 h-8 inline-flex items-center gap-2 border ${active === tab ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}>
            {tab.toUpperCase()} <span className="opacity-60">({counts[tab] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
          className="bg-background border border-border h-10 pl-9 pr-3 w-full text-sm" />
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">PRODUCT</th>
              <th className="text-left p-3 hidden sm:table-cell">CATEGORY</th>
              <th className="text-left p-3 hidden md:table-cell">BRAND</th>
              <th className="text-left p-3">PRICE</th>
              <th className="text-left p-3">STOCK</th>
              <th className="text-left p-3 hidden sm:table-cell">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr key={p.slug} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-muted overflow-hidden flex-shrink-0"><img src={p.image} alt="" className="w-full h-full object-cover" /></div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-mono text-[10px] text-muted-foreground truncate">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{p.category}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{p.brand ?? "—"}</td>
                <td className="p-3 text-mono">{formatINR(p.price)}</td>
                <td className="p-3 text-mono">{p.stock}</td>
                <td className="p-3 hidden sm:table-cell">
                  <span className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${p.stock > 5 ? "border-secondary text-secondary" : "border-primary text-primary"}`}>
                    {p.stock > 5 ? "ACTIVE" : p.stock > 0 ? "LOW" : "SOLD OUT"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <Link to="/admin/products/$slug" params={{ slug: p.slug }} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></Link>
                    <button onClick={() => remove(p.slug)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Trash2 className="size-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No products in this category. <Link to="/admin/products/new" className="text-primary">Add one →</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
