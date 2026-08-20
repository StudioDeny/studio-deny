import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  upsertBrand, upsertCategory, deleteBrand, deleteCategory,
  listBrands, listCategories,
  type Brand, type Category,
} from "@/lib/catalog";
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
  const [newCatParent, setNewCatParent] = useState<string>("");

  // Load from Supabase on mount (client-only)
  useEffect(() => {
    listCategories().then(setCats);
    listBrands().then(setBrands);
  }, []);

  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    await upsertCategory({ name, parentId: newCatParent || null });
    setCats(await listCategories());
    setNewCat("");
    setNewCatParent("");
    toast.success(`"${name}" added`);
  };

  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    await upsertBrand({ name });
    setBrands(await listBrands());
    setNewBrand("");
    toast.success(`"${name}" added`);
  };

  const removeCat = async (slug: string) => {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(slug);
    setCats(await listCategories());
  };

  const removeBrand = async (slug: string) => {
    if (!confirm("Delete this brand?")) return;
    await deleteBrand(slug);
    setBrands(await listBrands());
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.kind === "cat") {
      // Preserve the existing parentId so editing a child's name doesn't silently un-parent it.
      const existing = cats.find((c) => c.slug === editing.slug);
      await upsertCategory({ slug: editing.slug, name: editing.name, parentId: existing?.parentId ?? null });
      setCats(await listCategories());
    } else {
      await upsertBrand({ slug: editing.slug, name: editing.name });
      setBrands(await listBrands());
    }
    setEditing(null);
    toast.success("Updated");
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">CATALOG.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage categories and brands surfaced across the storefront and admin.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="CATEGORIES">
          <AddRow value={newCat} onChange={setNewCat} onAdd={addCat} placeholder="New category name" />
          <select value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}
            className="bg-background border border-border h-9 px-2 text-xs mb-1 w-full">
            <option value="">— Top level —</option>
            {cats.filter((c) => c.parentId === null).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mb-2">
            Filters the list below to that parent's children, and is where a new category you add gets nested.
          </p>
          <List
            items={cats
              .filter((c) => (newCatParent ? c.parentId === newCatParent : c.parentId === null))
              .map((c) => ({
                slug: c.slug,
                name: c.name,
                meta: c.parentId ? `under ${cats.find((p) => p.id === c.parentId)?.name ?? "?"}` : undefined,
              }))}
            onEdit={(it) => setEditing({ kind: "cat", slug: it.slug, name: it.name })}
            onDelete={(slug) => removeCat(slug)}
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
            onDelete={(slug) => removeBrand(slug)}
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

function AddRow({ value, onChange, onAdd, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2 mb-4">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        className="flex-1 bg-background border border-border h-10 px-3 text-sm"
      />
      <button
        type="button"
        onClick={onAdd}
        className="bg-foreground text-background px-3 h-10 inline-flex items-center gap-1 text-mono text-xs tracking-widest hover:opacity-80 transition-opacity shrink-0"
      >
        <Plus className="size-3" /> ADD
      </button>
    </div>
  );
}

type Item = { slug: string; name: string; meta?: string };
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
                <input
                  value={editing!.name}
                  onChange={(e) => setEditing({ slug: editing!.slug, name: e.target.value })}
                  className="flex-1 bg-background border border-border h-8 px-2 text-sm"
                />
                <button type="button" onClick={onSaveEdit} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Check className="size-3" /></button>
                <button type="button" onClick={() => setEditing(null)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><X className="size-3" /></button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {it.name}
                    {it.meta && <span className="font-normal text-muted-foreground"> ({it.meta})</span>}
                  </div>
                  <div className="text-mono text-[10px] text-muted-foreground">{it.slug}</div>
                </div>
                <button type="button" onClick={() => onEdit(it)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></button>
                <button type="button" onClick={() => onDelete(it.slug)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Trash2 className="size-3" /></button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
