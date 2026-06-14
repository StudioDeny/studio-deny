import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { upsertProduct } from "@/lib/productsStore";
import { listCategories, listBrands } from "@/lib/catalog";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const nav = useNavigate();
  return <ProductForm onSave={(p) => { upsertProduct(p); toast.success("Product created"); nav({ to: "/admin/products" }); }} />;
}

export function ProductForm({ initial, onSave }: { initial?: Product; onSave: (p: Product) => void }) {
  const cats = listCategories();
  const brands = listBrands();
  const [p, setP] = useState<Product>(
    initial ?? {
      slug: "",
      name: "",
      category: cats[0]?.name ?? "Tops",
      brand: brands[0]?.name,
      price: 0,
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
      hoverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
      sizes: ["S", "M", "L", "XL"],
      colors: [{ name: "Black", hex: "#0a0a0a" }],
      description: "",
      material: "",
      stock: 10,
    }
  );
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="max-w-2xl">
      <Link to="/admin/products" className="text-mono text-[11px] tracking-widest text-muted-foreground hover:text-primary">← BACK</Link>
      <h1 className="text-display text-4xl md:text-5xl mt-3 mb-6">{initial ? "EDIT" : "NEW"} PRODUCT.</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const final = { ...p, slug: p.slug || slugify(p.name) };
          if (!final.name) return toast.error("Name required");
          if (!final.slug) return toast.error("Slug required");
          onSave(final);
        }}
        className="space-y-4"
      >
        <Field label="NAME"><input value={p.name} onChange={(e) => set("name", e.target.value)} className="inp" /></Field>
        <Field label="SLUG (auto from name if empty)"><input value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} disabled={!!initial} className="inp" placeholder={slugify(p.name)} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="CATEGORY">
            <select value={p.category} onChange={(e) => set("category", e.target.value)} className="inp">
              {cats.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="BRAND">
            <select value={p.brand ?? ""} onChange={(e) => set("brand", e.target.value || undefined)} className="inp">
              <option value="">— NONE —</option>
              {brands.map((b) => <option key={b.slug} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="BADGE">
            <select value={p.badge ?? ""} onChange={(e) => set("badge", (e.target.value || undefined) as Product["badge"])} className="inp">
              <option value="">— NONE —</option><option>NEW DROP</option><option>LAST PIECE</option><option>SALE</option><option>SOLD OUT</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="PRICE (₹)"><input type="number" value={p.price} onChange={(e) => set("price", Number(e.target.value))} className="inp" /></Field>
          <Field label="COMPARE AT"><input type="number" value={p.compareAt ?? 0} onChange={(e) => set("compareAt", Number(e.target.value) || undefined)} className="inp" /></Field>
          <Field label="STOCK"><input type="number" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} className="inp" /></Field>
        </div>
        <Field label="IMAGE URL"><input value={p.image} onChange={(e) => set("image", e.target.value)} className="inp" placeholder="/src/assets/... or https://" /></Field>
        <Field label="HOVER IMAGE URL"><input value={p.hoverImage} onChange={(e) => set("hoverImage", e.target.value)} className="inp" /></Field>
        <Field label="SIZES (comma)"><input value={p.sizes.join(", ")} onChange={(e) => set("sizes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="inp" /></Field>
        <Field label="DESCRIPTION"><textarea value={p.description} onChange={(e) => set("description", e.target.value)} rows={3} className="inp" /></Field>
        <Field label="MATERIAL"><input value={p.material} onChange={(e) => set("material", e.target.value)} className="inp" /></Field>
        <button type="submit" className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary">SAVE</button>
      </form>
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
