import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Star, X, Plus } from "lucide-react";
import { upsertCategory, listCategories, type Category } from "@/lib/catalog";

// Search-driven multi-select: type to find categories (matched by name and
// by "Parent / Child" for subcategories), click a result to add it to the
// product. One selected category is the "primary" (star icon) — it's what
// drives the breadcrumb, badge, and size-guide lookup elsewhere; the rest
// are just extra listings the product also shows up in.
export function MultiCategoryPicker({
  categories,
  selectedIds,
  primaryId,
  onChange,
  onCategoriesChange,
}: {
  categories: Category[];
  selectedIds: string[];
  primaryId: string | undefined;
  onChange: (selectedIds: string[], primaryId: string | undefined) => void;
  onCategoriesChange: (cats: Category[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const labelFor = (c: Category) => {
    const parent = c.parentId ? categories.find((p) => p.id === c.parentId) : undefined;
    return parent ? `${parent.name} / ${c.name}` : c.name;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? categories.filter((c) => labelFor(c).toLowerCase().includes(q)) : categories;
    return pool.filter((c) => !selectedIds.includes(c.id)).slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categories, selectedIds]);

  const selected = selectedIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c);

  const add = (c: Category) => {
    const nextIds = [...selectedIds, c.id];
    onChange(nextIds, primaryId ?? c.id);
    setQuery("");
  };

  const remove = (id: string) => {
    const nextIds = selectedIds.filter((x) => x !== id);
    const nextPrimary = primaryId === id ? nextIds[0] : primaryId;
    onChange(nextIds, nextPrimary);
  };

  const makePrimary = (id: string) => onChange(selectedIds, id);

  const submitAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await upsertCategory({ name });
    const fresh = await listCategories();
    onCategoriesChange(fresh);
    const created = fresh.find((c) => c.name === name && c.parentId === null);
    setNewName("");
    setAdding(false);
    if (created) add(created);
  };

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs border ${
                c.id === primaryId ? "border-primary text-primary bg-primary/10" : "border-border text-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => makePrimary(c.id)}
                aria-label={c.id === primaryId ? "Primary category" : "Set as primary category"}
                title={c.id === primaryId ? "Primary category" : "Set as primary category"}
              >
                <Star className={`size-3 ${c.id === primaryId ? "fill-primary" : "opacity-40"}`} />
              </button>
              {labelFor(c)}
              <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} className="opacity-60 hover:opacity-100">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search categories…"
          className="inp pl-8"
        />
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-full bg-background border border-border shadow-lg max-h-64 overflow-y-auto">
          <ul className="py-1">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => add(c)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface hover:text-primary transition-colors"
                >
                  {labelFor(c)}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No matching categories</li>
            )}
          </ul>
          <div className="border-t border-border p-2">
            {adding ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitAdd(); } }}
                  placeholder="Category name"
                  className="flex-1 bg-background border border-border h-8 px-2 text-xs min-w-0"
                />
                <button
                  type="button"
                  onClick={submitAdd}
                  className="border border-border h-8 w-8 shrink-0 flex items-center justify-center hover:border-primary hover:text-primary"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-1.5 px-1 py-1.5 text-mono text-[10px] tracking-widest text-primary hover:underline"
              >
                <Plus className="size-3" /> ADD NEW CATEGORY
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
