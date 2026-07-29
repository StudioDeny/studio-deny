import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Check, Plus } from "lucide-react";
import { upsertCategory, listCategories, type Category } from "@/lib/catalog";

// Nested-hover category picker: top-level categories on the left, and hovering
// one that has children flies out a submenu to the right (same interaction as
// the storefront navbar's Accessories dropdown) instead of a flat native
// <select> that can't express parent/child structure. Also lets admins add a
// brand-new category inline without leaving the product form.
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCategoriesChange,
}: {
  categories: Category[];
  value?: string;
  onChange: (cat: Category) => void;
  onCategoriesChange: (cats: Category[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ parentId: string | null } | null>(null);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const topLevel = categories.filter((c) => c.parentId === null);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const selected = categories.find((c) => c.id === value);
  const selectedParent = selected?.parentId ? categories.find((c) => c.id === selected.parentId) : undefined;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(null);
        setHoveredParent(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const submitAdd = async (parentId: string | null) => {
    const name = newName.trim();
    if (!name) return;
    await upsertCategory({ name, parentId });
    const fresh = await listCategories();
    onCategoriesChange(fresh);
    const created = fresh.find((c) => c.name === name && c.parentId === parentId);
    setNewName("");
    setAdding(null);
    if (created) {
      onChange(created);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inp flex items-center justify-between text-left"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? (selectedParent ? `${selectedParent.name} / ${selected.name}` : selected.name) : "— Select category —"}
        </span>
        <ChevronDown className={`size-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-background border border-border shadow-lg min-w-[240px]">
          <ul className="py-1">
            {topLevel.map((c) => {
              const kids = childrenOf(c.id);
              const isHovered = hoveredParent === c.id;
              return (
                <li key={c.id} className="relative" onMouseEnter={() => setHoveredParent(c.id)}>
                  <button
                    type="button"
                    onClick={() => { onChange(c); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface hover:text-primary transition-colors ${
                      value === c.id ? "text-primary font-semibold" : ""
                    }`}
                  >
                    {c.name}
                    {kids.length > 0 && <ChevronRight className="size-3 opacity-50 shrink-0" />}
                  </button>

                  {kids.length > 0 && isHovered && (
                    <div className="absolute left-full top-0 bg-background border border-border shadow-lg min-w-[200px] py-1">
                      {kids.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => { onChange(k); setOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-surface hover:text-primary transition-colors ${
                            value === k.id ? "text-primary font-semibold" : ""
                          }`}
                        >
                          {k.name}
                        </button>
                      ))}
                      <div className="border-t border-border p-1.5">
                        {adding?.parentId === c.id ? (
                          <AddInline
                            value={newName}
                            onChange={setNewName}
                            onSubmit={() => submitAdd(c.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAdding({ parentId: c.id })}
                            className="w-full flex items-center gap-1.5 px-1.5 py-1.5 text-mono text-[10px] tracking-widest text-primary hover:underline"
                          >
                            <Plus className="size-3" /> ADD SUBCATEGORY
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-2">
            {adding?.parentId === null ? (
              <AddInline value={newName} onChange={setNewName} onSubmit={() => submitAdd(null)} />
            ) : (
              <button
                type="button"
                onClick={() => setAdding({ parentId: null })}
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

function AddInline({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <div className="flex gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
        placeholder="Category name"
        className="flex-1 bg-background border border-border h-8 px-2 text-xs min-w-0"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="border border-border h-8 w-8 shrink-0 flex items-center justify-center hover:border-primary hover:text-primary"
      >
        <Check className="size-3" />
      </button>
    </div>
  );
}
