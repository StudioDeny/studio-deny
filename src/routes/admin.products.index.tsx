import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listAllAdminProducts, setProductActive, getVariantStockTotals, effectiveStock, type Product } from "@/lib/productsStore";
import { listCategories, type Category } from "@/lib/catalog";
import { formatINR } from "@/context/CartContext";
import { Plus, Pencil, Eye, EyeOff, Settings2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProducts,
});

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const refresh = async () => {
    const [data, totals] = await Promise.all([listAllAdminProducts(), getVariantStockTotals()]);
    setProducts(data);
    setStockTotals(totals);
  };
  useEffect(() => { refresh(); }, []);

  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => { listCategories().then(setCats); }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: products.length };
    cats.forEach((c) => { m[c.name] = products.filter((p) => p.category === c.name).length; });
    return m;
  }, [products, cats]);

  const filtered = products
    .filter((p) => active === "ALL" || p.category === active)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.slug.includes(q.toLowerCase()));

  const toggleActive = async (p: Product) => {
    const next = !(p.is_active ?? true);
    if (!next && !confirm(`Deactivate "${p.name}"? It will disappear from the storefront (shop, collections, homepage) until reactivated here.`)) return;
    await setProductActive(p.slug, next);
    await refresh();
    toast.success(next ? "Product reactivated — visible on storefront again" : "Product deactivated");
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
            {filtered.map((p) => {
              const stock = effectiveStock(p, stockTotals);
              return (
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
                <td className="p-3 text-mono">{stock}</td>
                <td className="p-3 hidden sm:table-cell">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${(p.is_active ?? true) ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                      {(p.is_active ?? true) ? "LIVE ON SITE" : "HIDDEN"}
                    </span>
                    <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${
                      stock > 5
                        ? "bg-emerald-100 text-emerald-800"
                        : stock > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {stock > 5 ? "IN STOCK" : stock > 0 ? "LOW STOCK" : "SOLD OUT"}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <Link to="/admin/products/$slug" params={{ slug: p.slug }} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></Link>
                    <button
                      onClick={() => toggleActive(p)}
                      title={(p.is_active ?? true) ? "Deactivate (hide from storefront)" : "Reactivate (show on storefront)"}
                      className={`border h-8 w-8 inline-flex items-center justify-center ${(p.is_active ?? true) ? "border-border hover:border-red-500 hover:text-red-500" : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"}`}
                    >
                      {(p.is_active ?? true) ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No products in this category. <Link to="/admin/products/new" className="text-primary">Add one →</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
