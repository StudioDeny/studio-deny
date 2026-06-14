import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listBrands, listCategories, upsertBrand, upsertCategory, deleteBrand, deleteCategory, slugify, type Brand, type Category } from "@/lib/catalog";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/catalog")({
  component: AdminCatalog,
});

function AdminCatalog() {
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [editing, setEditing] = useState<{ kind: "cat" | "brand"; slug: string; name: string } | null>(null);

  const refresh = () => { setCats(listCategories()); setBrands(listBrands()); };
  useEffect(refresh, []);

  const addCat = () => {
    if (!newCat.trim()) return;
    upsertCategory({ slug: slugify(newCat), name: newCat.trim() });
    setNewCat(""); refresh(); toast.success("Category added");
  };
  const addBrand = () => {
    if (!newBrand.trim()) return;
    upsertBrand({ slug: slugify(newBrand), name: newBrand.trim() });
    setNewBrand(""); refresh(); toast.success("Brand added");
  };

  const saveEdit = () => {
    if (!editing) return;
    if (editing.kind === "cat") upsertCategory({ slug: editing.slug, name: editing.name });
    else upsertBrand({ slug: editing.slug, name: editing.name });
    setEditing(null); refresh(); toast.success("Updated");
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">CATALOG.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage categories and brands surfaced across the storefront and admin.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="CATEGORIES">
          <AddRow value={newCat} onChange={setNewCat} onAdd={addCat} placeholder="New category name" />
          <List
            items={cats.map((c) => ({ slug: c.slug, name: c.name }))}
            onEdit={(it) => setEditing({ kind: "cat", slug: it.slug, name: it.name })}
            onDelete={(slug) => { if (confirm("Delete category?")) { deleteCategory(slug); refresh(); } }}
            editing={editing?.kind === "cat" ? editing : null}
            setEditing={(p) => setEditing(p ? { kind: "cat", ...p } : null)}
            onSaveEdit={saveEdit}
          />
        </Panel>
        <Panel title="BRANDS">
          <AddRow value={newBrand} onChange={setNewBrand} onAdd={addBrand} placeholder="New brand name" />
          <List
            items={brands.map((b) => ({ slug: b.slug, name: b.name }))}
            onEdit={(it) => setEditing({ kind: "brand", slug: it.slug, name: it.name })}
            onDelete={(slug) => { if (confirm("Delete brand?")) { deleteBrand(slug); refresh(); } }}
            editing={editing?.kind === "brand" ? editing : null}
            setEditing={(p) => setEditing(p ? { kind: "brand", ...p } : null)}
            onSaveEdit={saveEdit}
          />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-4">{title}</div>
      {children}
    </section>
  );
}

function AddRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2 mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-background border border-border h-10 px-3 text-sm" />
      <button onClick={onAdd} className="bg-primary text-primary-foreground px-3 h-10 inline-flex items-center gap-1 text-mono text-xs tracking-widest hover:glow-primary">
        <Plus className="size-3" /> ADD
      </button>
    </div>
  );
}

type Item = { slug: string; name: string };
function List({ items, onEdit, onDelete, editing, setEditing, onSaveEdit }: {
  items: Item[];
  onEdit: (it: Item) => void;
  onDelete: (slug: string) => void;
  editing: { slug: string; name: string } | null;
  setEditing: (p: { slug: string; name: string } | null) => void;
  onSaveEdit: () => void;
}) {
  if (items.length === 0) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ul className="divide-y divide-border border border-border">
      {items.map((it) => {
        const isEdit = editing?.slug === it.slug;
        return (
          <li key={it.slug} className="flex items-center gap-2 p-2">
            {isEdit ? (
              <>
                <input value={editing!.name} onChange={(e) => setEditing({ slug: editing!.slug, name: e.target.value })}
                  className="flex-1 bg-background border border-border h-8 px-2 text-sm" />
                <button onClick={onSaveEdit} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Check className="size-3" /></button>
                <button onClick={() => setEditing(null)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><X className="size-3" /></button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{it.name}</div>
                  <div className="text-mono text-[10px] text-muted-foreground">{it.slug}</div>
                </div>
                <button onClick={() => onEdit(it)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></button>
                <button onClick={() => onDelete(it.slug)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Trash2 className="size-3" /></button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
