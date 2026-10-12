import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import {
  upsertBrand, upsertCategory, deleteBrand, deleteCategory,
  listBrands, listCategories, slugify,
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
  // Inline "add subcategory" row, opened with + on a main category.
  const [subFor, setSubFor] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  // Main categories, plus any whose main category was deleted (they'd
  // otherwise be listed nowhere and could never be removed), A → Z.
  const roots = cats
    .filter((c) => c.parentId === null || !cats.some((p) => p.id === c.parentId))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Load from Supabase on mount (client-only)
  useEffect(() => {
    listCategories().then(setCats);
    listBrands().then(setBrands);
  }, []);

  // Saving upserts by slug, so a name that's already taken would silently
  // move that existing category instead of creating a new one.
  const nameTaken = (name: string) => {
    const existing = cats.find((c) => c.slug === slugify(name));
    if (!existing) return false;
    const parent = cats.find((c) => c.id === existing.parentId);
    toast.error(`"${existing.name}" already exists${parent ? ` under ${parent.name}` : ""} — pick another name.`);
    return true;
  };

  const addCat = async () => {
    const name = newCat.trim();
    if (!name || nameTaken(name)) return;
    try {
      await upsertCategory({ name, parentId: newCatParent || null });
      setCats(await listCategories());
      setNewCat("");
      setNewCatParent("");
      toast.success(`"${name}" added`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add category";
      toast.error(message);
    }
  };

  const addSub = async (parentSlug: string) => {
    const name = subName.trim();
    const parent = cats.find((c) => c.slug === parentSlug);
    if (!name || !parent || nameTaken(name)) return;
    try {
      await upsertCategory({ name, parentId: parent.id });
      setCats(await listCategories());
      setSubName("");
      setSubFor(null);
      toast.success(`"${name}" added under ${parent.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add subcategory");
    }
  };

  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    try {
      await upsertBrand({ name });
      setBrands(await listBrands());
      setNewBrand("");
      toast.success(`"${name}" added`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add brand";
      toast.error(message);
    }
  };

  const removeCat = async (slug: string) => {
    const cat = cats.find((c) => c.slug === slug);
    const children = cat ? cats.filter((c) => c.parentId === cat.id) : [];
    const msg = children.length > 0
      ? `Delete "${cat?.name}" and its ${children.length} subcategor${children.length === 1 ? "y" : "ies"} (${children.map((c) => c.name).join(", ")})?`
      : `Delete "${cat?.name ?? slug}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteCategory(slug);
      setCats(await listCategories());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(message);
    }
  };

  const removeBrand = async (slug: string) => {
    if (!confirm("Delete this brand?")) return;
    try {
      await deleteBrand(slug);
      setBrands(await listBrands());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete brand";
      toast.error(message);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    }
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">CATALOG.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage categories and brands surfaced across the storefront and admin.</p>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Panel title="CATEGORIES">
          <AddRow
            value={newCat}
            onChange={setNewCat}
            onAdd={addCat}
            placeholder={newCatParent ? `New subcategory under ${cats.find((c) => c.id === newCatParent)?.name ?? "…"}` : "New main category name"}
          />
          <label className="block mb-2">
            <span className="text-mono text-[10px] tracking-widest text-muted-foreground">ADD IT UNDER</span>
            <select value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}
              className="mt-1 bg-background border border-border h-9 px-2 text-xs w-full">
              <option value="">Nothing — make it a main category</option>
              {roots.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-muted-foreground mb-4">
            Or tap <Plus className="size-3 inline -mt-0.5" /> next to a category to add a subcategory under it.
          </p>
          <List
            items={roots.flatMap((root) => [
              {
                slug: root.slug,
                name: root.name,
                meta: root.parentId ? "its main category was deleted" : undefined,
                canHaveChildren: !root.parentId,
              },
              ...cats
                .filter((c) => c.parentId === root.id)
                .map((c) => ({ slug: c.slug, name: c.name, depth: 1 })),
            ])}
            onEdit={(it) => setEditing({ kind: "cat", slug: it.slug, name: it.name })}
            onDelete={(slug) => removeCat(slug)}
            editing={editing?.kind === "cat" ? editing : null}
            setEditing={(p) => setEditing(p ? { kind: "cat", ...p } : null)}
            onSaveEdit={saveEdit}
            onAddChild={(it) => { setSubFor(subFor === it.slug ? null : it.slug); setSubName(""); }}
            renderAfter={(it) =>
              subFor === it.slug && (
                <li className="flex items-center gap-2 p-2 pl-8 bg-background/40">
                  <span className="text-muted-foreground">↳</span>
                  <input
                    autoFocus
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addSub(it.slug); }
                      if (e.key === "Escape") setSubFor(null);
                    }}
                    placeholder={`New subcategory under ${it.name}`}
                    className="flex-1 min-w-0 bg-background border border-border h-8 px-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addSub(it.slug)}
                    className="bg-foreground text-background px-3 h-8 inline-flex items-center gap-1 text-mono text-[10px] tracking-widest hover:opacity-80 transition-opacity shrink-0"
                  >
                    <Plus className="size-3" /> ADD
                  </button>
                  <button type="button" aria-label="Cancel" onClick={() => setSubFor(null)} className="border border-border h-8 w-8 shrink-0 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                    <X className="size-3" />
                  </button>
                </li>
              )
            }
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

type Item = { slug: string; name: string; meta?: string; depth?: number; canHaveChildren?: boolean };
function List({ items, onEdit, onDelete, editing, setEditing, onSaveEdit, onAddChild, renderAfter }: {
  items: Item[];
  onEdit: (it: Item) => void;
  onDelete: (slug: string) => void;
  editing: { slug: string; name: string } | null;
  setEditing: (p: { slug: string; name: string } | null) => void;
  onSaveEdit: () => void;
  onAddChild?: (it: Item) => void;
  renderAfter?: (it: Item) => React.ReactNode;
}) {
  if (items.length === 0) return <p className="text-muted-foreground text-xs">Nothing yet.</p>;
  return (
    <ul className="divide-y divide-border border border-border">
      {items.map((it) => {
        const isEdit = editing?.slug === it.slug;
        return (
          <Fragment key={it.slug}>
            <li className={`flex items-center gap-2 p-2 ${it.depth ? "pl-8 bg-background/40" : ""}`}>
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
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${it.depth ? "" : "font-semibold"}`}>
                      {!!it.depth && <span className="text-muted-foreground mr-1.5">↳</span>}
                      {it.name}
                      {it.meta && <span className="font-normal text-muted-foreground"> ({it.meta})</span>}
                    </div>
                    <div className="text-mono text-[10px] text-muted-foreground">{it.slug}</div>
                  </div>
                  {it.canHaveChildren && onAddChild && (
                    <button type="button" title="Add subcategory" aria-label={`Add subcategory under ${it.name}`} onClick={() => onAddChild(it)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Plus className="size-3.5" /></button>
                  )}
                  <button type="button" title="Rename" aria-label={`Rename ${it.name}`} onClick={() => onEdit(it)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></button>
                  <button type="button" title="Delete" aria-label={`Delete ${it.name}`} onClick={() => onDelete(it.slug)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500"><Trash2 className="size-3" /></button>
                </>
              )}
            </li>
            {renderAfter?.(it)}
          </Fragment>
        );
      })}
    </ul>
  );
}
