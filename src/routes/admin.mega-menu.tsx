import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { listCategories, type Category } from "@/lib/catalog";
import { listProducts, type Product } from "@/lib/productsStore";
import { MegaMenuPanel } from "@/components/layout/MegaMenuPanel";
import type { MegaMenuCategoryRow, MegaMenuLinkRow, MegaMenuProductRow } from "@/types/database";
import { GripVertical, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mega-menu")({
  component: AdminMegaMenu,
});

const MAX_PRODUCTS = 2;

function categoryLabel(c: Category, all: Category[]): string {
  const parent = c.parentId ? all.find((p) => p.id === c.parentId) : undefined;
  return parent ? `${parent.name} / ${c.name}` : c.name;
}

function AdminMegaMenu() {
  const [categories, setCategories] = useState<MegaMenuCategoryRow[]>([]);
  const [links, setLinks] = useState<MegaMenuLinkRow[]>([]);
  const [products, setProducts] = useState<MegaMenuProductRow[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const load = async () => {
    const [{ data: cats }, { data: lks }, { data: prods }, cats2, prods2] = await Promise.all([
      supabase.from("mega_menu_categories").select("*").order("position"),
      supabase.from("mega_menu_links").select("*").order("position"),
      supabase.from("mega_menu_products").select("*").order("position"),
      listCategories(),
      listProducts(),
    ]);
    setCategories(cats ?? []);
    setLinks(lks ?? []);
    setProducts(prods ?? []);
    setAllCategories(cats2);
    setAllProducts(prods2);
    setSelectedId((id) => id ?? cats?.[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const catName = (categoryId: string) => allCategories.find((c) => c.id === categoryId)?.name ?? "—";
  const productBySlug = (slug: string) => allProducts.find((p) => p.slug === slug);

  const selected = categories.find((c) => c.id === selectedId) ?? null;
  const selectedLinks = links.filter((l) => l.menu_category_id === selectedId);
  const selectedProducts = products.filter((p) => p.menu_category_id === selectedId);

  // A category can only be a navbar tab once, and (separately) can't be
  // both the tab itself and a sublink under that same tab.
  const usedAsTab = new Set(categories.filter((c) => c.id !== selectedId).map((c) => c.category_id));
  const availableForTab = allCategories.filter((c) => !usedAsTab.has(c.id) || c.id === selected?.category_id);
  const usedAsLink = new Set(selectedLinks.map((l) => l.category_id));

  // ── Categories (navbar tabs) ────────────────────────────────
  const addCategory = async () => {
    const first = allCategories.find((c) => !usedAsTab.has(c.id));
    if (!first) return toast.error("Every category is already a navbar tab.");
    const { data, error } = await supabase
      .from("mega_menu_categories")
      .insert({ category_id: first.id, position: categories.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setCategories((c) => [...c, data]);
    setSelectedId(data.id);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Remove this tab from the navbar? Its links and featured products go with it.")) return;
    const { error } = await supabase.from("mega_menu_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    const next = categories.filter((x) => x.id !== id);
    setCategories(next);
    setLinks((l) => l.filter((x) => x.menu_category_id !== id));
    setProducts((p) => p.filter((x) => x.menu_category_id !== id));
    // Fall back to the first remaining tab so Step 2/3 and the preview
    // don't go blank until a refresh when the deleted tab was selected.
    setSelectedId((cur) => (cur === id ? (next[0]?.id ?? null) : cur));
    toast.success("Removed");
  };

  const reorderCategories = async (next: MegaMenuCategoryRow[]) => {
    setCategories(next);
    await Promise.all(next.map((c, i) => supabase.from("mega_menu_categories").update({ position: i }).eq("id", c.id)));
  };

  const saveCategories = async () => {
    setSavingSection("categories");
    const { error } = await supabase.from("mega_menu_categories").upsert(categories);
    setSavingSection(null);
    if (error) return toast.error(error.message);
    toast.success("Navbar tabs saved");
  };

  // ── Links (sublinks) ────────────────────────────────────────
  const addLink = async (categoryId: string) => {
    if (!selectedId) return;
    const { data, error } = await supabase
      .from("mega_menu_links")
      .insert({ menu_category_id: selectedId, category_id: categoryId, position: selectedLinks.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setLinks((l) => [...l, data]);
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("mega_menu_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLinks((l) => l.filter((x) => x.id !== id));
  };

  const toggleLinkActive = (id: string, is_active: boolean) => {
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, is_active } : l)));
  };

  const reorderLinks = async (next: MegaMenuLinkRow[]) => {
    setLinks((all) => [...all.filter((l) => l.menu_category_id !== selectedId), ...next]);
    await Promise.all(next.map((l, i) => supabase.from("mega_menu_links").update({ position: i }).eq("id", l.id)));
  };

  const saveLinks = async () => {
    setSavingSection("links");
    const { error } = await supabase.from("mega_menu_links").upsert(selectedLinks);
    setSavingSection(null);
    if (error) return toast.error(error.message);
    toast.success("Links saved");
  };

  // ── Featured products (tiles) ──────────────────────────────
  const addProduct = async (slug: string) => {
    if (!selectedId) return;
    const { data, error } = await supabase
      .from("mega_menu_products")
      .insert({ menu_category_id: selectedId, product_slug: slug, position: selectedProducts.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setProducts((p) => [...p, data]);
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase.from("mega_menu_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const reorderProducts = async (next: MegaMenuProductRow[]) => {
    setProducts((all) => [...all.filter((p) => p.menu_category_id !== selectedId), ...next]);
    await Promise.all(next.map((p, i) => supabase.from("mega_menu_products").update({ position: i }).eq("id", p.id)));
  };

  // ── Live preview ────────────────────────────────────────────
  const previewCategory = selected
    ? {
        id: selected.id,
        label: catName(selected.category_id),
        href: "#",
        position: selected.position,
        links: selectedLinks.filter((l) => l.is_active).map((l) => ({ id: l.id, label: catName(l.category_id), href: "#", position: l.position })),
        products: selectedProducts
          .map((p) => ({ p, prod: productBySlug(p.product_slug) }))
          .filter((x) => x.prod)
          .map(({ p, prod }) => ({
            id: p.id, label: prod!.name, href: "#", imageUrl: prod!.image,
            price: prod!.price, compareAt: prod!.compareAt ?? null, position: p.position,
          })),
      }
    : null;

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">MEGA MENU.</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
        This builds the dropdown that opens when a shopper hovers WOMEN, MEN, etc. in the navbar. Everything here is picked from categories and products you already have — there's nowhere to type a custom link. Drag the <span className="inline-flex items-center justify-center size-4 border border-border rounded align-middle"><GripVertical className="size-2.5" /></span> handle to reorder anything.
      </p>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-8 min-w-0">
          {/* CATEGORIES */}
          <Panel
            title="STEP 1 — NAVBAR TABS"
            description='Each tab is one of your existing categories (e.g. "Men"). Click MANAGE on one to set up what appears inside its dropdown.'
          >
            <Reorder.Group axis="y" values={categories} onReorder={reorderCategories} className="space-y-2">
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  label={catName(cat.category_id)}
                  selected={cat.id === selectedId}
                  options={allCategories.filter((c) => !usedAsTab.has(c.id) || c.id === cat.category_id)}
                  onSelect={() => setSelectedId(cat.id)}
                  onChange={(patch) => setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, ...patch } : c)))}
                  onDelete={() => deleteCategory(cat.id)}
                />
              ))}
            </Reorder.Group>
            {categories.length === 0 && <p className="text-sm text-muted-foreground mb-3">No navbar tabs yet.</p>}
            <RowActions onAdd={addCategory} addLabel="ADD TAB" onSave={saveCategories} saving={savingSection === "categories"} />
          </Panel>

          {/* LINKS */}
          {selected && (
            <Panel
              title={`STEP 2 — LINKS INSIDE "${catName(selected.category_id).toUpperCase()}"`}
              description="The plain text links stacked down the left side of this tab's dropdown. Pick any existing category — it doesn't have to be a child of this tab."
            >
              <Reorder.Group axis="y" values={selectedLinks} onReorder={reorderLinks} className="space-y-2">
                {selectedLinks.map((link) => (
                  <LinkRow
                    key={link.id}
                    item={link}
                    label={catName(link.category_id)}
                    onToggleActive={(v) => toggleLinkActive(link.id, v)}
                    onDelete={() => deleteLink(link.id)}
                  />
                ))}
              </Reorder.Group>
              {selectedLinks.length > 0 && (
                <button
                  type="button"
                  onClick={saveLinks}
                  disabled={savingSection === "links"}
                  className="bg-primary text-primary-foreground h-9 px-5 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50 mb-3"
                >
                  {savingSection === "links" ? "SAVING…" : "SAVE VISIBILITY"}
                </button>
              )}
              <CategoryAdder
                options={allCategories.filter((c) => !usedAsLink.has(c.id))}
                allCategories={allCategories}
                onAdd={addLink}
              />
            </Panel>
          )}

          {/* PRODUCTS */}
          {selected && (
            <Panel
              title={`STEP 3 — FEATURED PRODUCTS IN "${catName(selected.category_id).toUpperCase()}"`}
              description={`${MAX_PRODUCTS} products shown side by side next to the links (image + name come straight from the product).`}
            >
              <Reorder.Group axis="y" values={selectedProducts} onReorder={reorderProducts} className="space-y-2">
                {selectedProducts.map((p) => (
                  <ProductRow key={p.id} item={p} product={productBySlug(p.product_slug)} onRemove={() => removeProduct(p.id)} />
                ))}
              </Reorder.Group>
              {selectedProducts.length === 0 && <p className="text-sm text-muted-foreground mb-3">No featured products yet.</p>}
              {selectedProducts.length < MAX_PRODUCTS && (
                <ProductAdder
                  allProducts={allProducts}
                  excludeSlugs={selectedProducts.map((p) => p.product_slug)}
                  onAdd={addProduct}
                />
              )}
            </Panel>
          )}
        </div>

        {/* LIVE PREVIEW */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-1">LIVE PREVIEW</div>
          <p className="text-xs text-muted-foreground mb-3">This is exactly what shoppers see for the tab you're managing below.</p>
          <div className="border border-border bg-background">
            <div className="flex items-center gap-5 px-5 h-14 border-b border-border overflow-x-auto no-scrollbar">
              {categories.map((c) => (
                <span key={c.id} className={`text-sm tracking-wide shrink-0 ${c.id === selectedId ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {catName(c.category_id)}
                </span>
              ))}
            </div>
            {previewCategory ? (
              <div className="h-[420px] overflow-hidden">
                <MegaMenuPanel category={previewCategory} onNavigate={() => {}} variant="desktop" />
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Add a tab to preview it.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);border-radius:6px;height:36px;padding:0 10px;width:100%;font-size:13px;color:var(--foreground);outline:none}.inp:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-1">{title}</div>
      <p className="text-xs text-muted-foreground mb-4 max-w-lg">{description}</p>
      {children}
    </section>
  );
}

function RowActions({ onAdd, addLabel, onSave, saving }: { onAdd: () => void; addLabel: string; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 border border-dashed border-border h-9 px-3 text-mono text-[11px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="size-3.5" /> {addLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-primary text-primary-foreground h-9 px-5 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50"
      >
        {saving ? "SAVING…" : "SAVE"}
      </button>
    </div>
  );
}

function DragHandle({ dragControls }: { dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => dragControls.start(e)}
      className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary touch-none"
      aria-label="Drag to reorder"
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function CategoryRow({
  cat, label, selected, options, onSelect, onChange, onDelete,
}: {
  cat: MegaMenuCategoryRow;
  label: string;
  selected: boolean;
  options: Category[];
  onSelect: () => void;
  onChange: (patch: Partial<MegaMenuCategoryRow>) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={cat} dragListener={false} dragControls={dragControls}>
      <div className={`flex items-center gap-2 p-2.5 border ${selected ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
        <DragHandle dragControls={dragControls} />
        <select value={cat.category_id} onChange={(e) => onChange({ category_id: e.target.value })} className="inp flex-1 min-w-0">
          {options.map((c) => (
            <option key={c.id} value={c.id}>{categoryLabel(c, options)}</option>
          ))}
        </select>
        <label title="Uncheck to hide this tab from the navbar without deleting it" className="flex items-center gap-1.5 shrink-0 text-mono text-[10px] tracking-widest text-muted-foreground">
          <input type="checkbox" checked={cat.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
          SHOWN
        </label>
        <button
          type="button"
          onClick={onSelect}
          title="Edit this tab's links and featured products"
          className={`shrink-0 border h-9 px-3 text-mono text-[10px] tracking-widest whitespace-nowrap transition-all hover:scale-[1.03] ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {label.toUpperCase()} {selected ? "✓" : "→"}
        </button>
        <button type="button" onClick={onDelete} title="Remove this tab" className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all hover:scale-110">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

function LinkRow({
  item, label, onToggleActive, onDelete,
}: {
  item: MegaMenuLinkRow;
  label: string;
  onToggleActive: (v: boolean) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <div className="flex items-center gap-2 p-2.5 border border-border bg-background">
        <DragHandle dragControls={dragControls} />
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <label title="Uncheck to hide this link without deleting it" className="flex items-center gap-1.5 shrink-0 text-mono text-[10px] tracking-widest text-muted-foreground">
          <input type="checkbox" checked={item.is_active} onChange={(e) => onToggleActive(e.target.checked)} />
          SHOWN
        </label>
        <button type="button" onClick={onDelete} title="Remove this link" className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all hover:scale-110">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

function CategoryAdder({ options, allCategories, onAdd }: { options: Category[]; allCategories: Category[]; onAdd: (categoryId: string) => void }) {
  const [value, setValue] = useState("");
  if (options.length === 0) return <p className="text-xs text-muted-foreground">Every category is already linked here.</p>;
  return (
    <div className="flex gap-2">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="inp flex-1">
        <option value="">— choose a category to add —</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>{categoryLabel(c, allCategories)}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => { if (value) { onAdd(value); setValue(""); } }}
        disabled={!value}
        className="flex items-center gap-1.5 border border-border h-9 px-3 text-mono text-[11px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-all hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 shrink-0"
      >
        <Plus className="size-3.5" /> ADD LINK
      </button>
    </div>
  );
}

function ProductRow({ item, product, onRemove }: { item: MegaMenuProductRow; product?: Product; onRemove: () => void }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <div className="flex items-center gap-2 p-2 border border-border bg-background">
        <DragHandle dragControls={dragControls} />
        <div className="size-10 shrink-0 overflow-hidden bg-surface">
          {product && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}
        </div>
        <span className="flex-1 text-sm font-semibold truncate">{product?.name ?? item.product_slug}</span>
        <button type="button" onClick={onRemove} title="Remove this product" className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all hover:scale-110">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

function ProductAdder({ allProducts, excludeSlugs, onAdd }: { allProducts: Product[]; excludeSlugs: string[]; onAdd: (slug: string) => void }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const results = q ? allProducts.filter((p) => !excludeSlugs.includes(p.slug) && p.name.toLowerCase().includes(q)) : [];
  return (
    <div className="relative">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products to feature…" className="inp" style={{ paddingLeft: "2.25rem" }} />
      {q && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matching products.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => { onAdd(p.slug); setSearch(""); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/40 text-left transition-colors"
              >
                <img src={p.image} alt="" className="size-8 object-cover shrink-0 bg-surface" />
                <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
