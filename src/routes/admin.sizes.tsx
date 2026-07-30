import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listCategories, type Category } from "@/lib/catalog";
import { listSizesForCategory, addSize, deleteSize, reorderSize, type Size } from "@/lib/sizes";
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sizes")({
  component: AdminSizes,
});

function AdminSizes() {
  const [cats, setCats] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    listCategories().then((c) => {
      setCats(c);
      setCategoryId((id) => id || c[0]?.id || "");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!categoryId) { setSizes([]); return; }
    listSizesForCategory(categoryId).then(setSizes);
  }, [categoryId]);

  const categoryLabel = (c: Category) => {
    const parent = c.parentId ? cats.find((p) => p.id === c.parentId) : undefined;
    return parent ? `${parent.name} / ${c.name}` : c.name;
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || !categoryId) return;
    if (sizes.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      toast.error(`"${label}" already exists for this category`);
      return;
    }
    await addSize(categoryId, label);
    setSizes(await listSizesForCategory(categoryId));
    setNewLabel("");
    toast.success(`"${label}" added`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this size?")) return;
    await deleteSize(id);
    setSizes(await listSizesForCategory(categoryId));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sizes.length) return;
    const next = [...sizes];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSizes(next.map((s, i) => ({ ...s, position: i })));
    await Promise.all(next.map((s, i) => reorderSize(s.id, i)));
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">SIZES.</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
        Define the size list per category — the product form and variant editor let admins pick from whatever sizes are defined here for that product's category, instead of typing sizes by hand.
      </p>

      <div className="max-w-lg">
        <label className="block mb-5">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">CATEGORY</div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-background border border-border px-3 h-11 text-sm font-mono"
          >
            {cats.length === 0 && <option value="">No categories yet</option>}
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{categoryLabel(c)}</option>
            ))}
          </select>
        </label>

        {categoryId && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                placeholder="New size (e.g. S, M, L, XL, or 6, 7, 8)"
                className="flex-1 bg-background border border-border h-10 px-3 text-sm"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="bg-foreground text-background px-3 h-10 inline-flex items-center gap-1 text-mono text-xs tracking-widest hover:opacity-80 transition-opacity shrink-0"
              >
                <Plus className="size-3" /> ADD
              </button>
            </div>

            {sizes.length === 0 ? (
              <p className="text-muted-foreground text-xs">No sizes defined for this category yet.</p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {sizes.map((s, idx) => (
                  <li key={s.id} className="flex items-center gap-2 p-2">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                        className="h-7 w-7 inline-flex items-center justify-center border border-border hover:border-primary hover:text-primary disabled:opacity-25">
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => move(idx, 1)} disabled={idx === sizes.length - 1}
                        className="h-7 w-7 inline-flex items-center justify-center border border-border hover:border-primary hover:text-primary disabled:opacity-25">
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 text-sm font-semibold">{s.label}</div>
                    <button type="button" onClick={() => handleDelete(s.id)}
                      className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500">
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
