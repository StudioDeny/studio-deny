import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { listCategories, type Category } from "@/lib/catalog";
import { resolveMegaMenuHref, type MegaMenuCategory as ResolvedMegaMenuCategory } from "@/lib/megaMenu";
import { MegaMenuPanel } from "@/components/layout/MegaMenuPanel";
import { MediaField } from "@/components/admin/MediaField";
import type { MegaMenuCategoryRow, MegaMenuLinkRow, MegaMenuTileRow } from "@/types/database";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mega-menu")({
  component: AdminMegaMenu,
});

function categoryLabel(c: Category, all: Category[]): string {
  const parent = c.parentId ? all.find((p) => p.id === c.parentId) : undefined;
  return parent ? `${parent.name} / ${c.name}` : c.name;
}

function AdminMegaMenu() {
  const [categories, setCategories] = useState<MegaMenuCategoryRow[]>([]);
  const [links, setLinks] = useState<MegaMenuLinkRow[]>([]);
  const [tiles, setTiles] = useState<MegaMenuTileRow[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const load = async () => {
    const [{ data: cats }, { data: lks }, { data: tls }, cats2] = await Promise.all([
      supabase.from("mega_menu_categories").select("*").order("position"),
      supabase.from("mega_menu_links").select("*").order("position"),
      supabase.from("mega_menu_tiles").select("*").order("position"),
      listCategories(),
    ]);
    setCategories(cats ?? []);
    setLinks(lks ?? []);
    setTiles(tls ?? []);
    setAllCategories(cats2);
    setSelectedId((id) => id ?? cats?.[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selected = categories.find((c) => c.id === selectedId) ?? null;
  const selectedLinks = links.filter((l) => l.menu_category_id === selectedId);
  const selectedTiles = tiles.filter((t) => t.menu_category_id === selectedId);

  // ── Categories ──────────────────────────────────────────────
  const addCategory = async () => {
    const { data, error } = await supabase
      .from("mega_menu_categories")
      .insert({ label: "NEW CATEGORY", href: null, category_id: null, position: categories.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setCategories((c) => [...c, data]);
    setSelectedId(data.id);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its links/tiles?")) return;
    const { error } = await supabase.from("mega_menu_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setCategories((c) => c.filter((x) => x.id !== id));
    setLinks((l) => l.filter((x) => x.menu_category_id !== id));
    setTiles((t) => t.filter((x) => x.menu_category_id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    toast.success("Deleted");
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
    toast.success("Categories saved");
  };

  // ── Links ───────────────────────────────────────────────────
  const addLink = async () => {
    if (!selectedId) return;
    const { data, error } = await supabase
      .from("mega_menu_links")
      .insert({ menu_category_id: selectedId, label: "NEW LINK", href: null, category_id: null, position: selectedLinks.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setLinks((l) => [...l, data]);
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("mega_menu_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLinks((l) => l.filter((x) => x.id !== id));
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

  // ── Tiles ───────────────────────────────────────────────────
  const addTile = async () => {
    if (!selectedId) return;
    const { data, error } = await supabase
      .from("mega_menu_tiles")
      .insert({ menu_category_id: selectedId, label: "NEW TILE", href: null, category_id: null, image_url: "", position: selectedTiles.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setTiles((t) => [...t, data]);
  };

  const deleteTile = async (id: string) => {
    if (!confirm("Delete this tile?")) return;
    const { error } = await supabase.from("mega_menu_tiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTiles((t) => t.filter((x) => x.id !== id));
  };

  const reorderTiles = async (next: MegaMenuTileRow[]) => {
    setTiles((all) => [...all.filter((t) => t.menu_category_id !== selectedId), ...next]);
    await Promise.all(next.map((t, i) => supabase.from("mega_menu_tiles").update({ position: i }).eq("id", t.id)));
  };

  const saveTiles = async () => {
    setSavingSection("tiles");
    const { error } = await supabase.from("mega_menu_tiles").upsert(selectedTiles);
    setSavingSection(null);
    if (error) return toast.error(error.message);
    toast.success("Tiles saved");
  };

  // ── Live preview ────────────────────────────────────────────
  const slugById = new Map(allCategories.map((c) => [c.id, c.slug]));
  const previewCategory: ResolvedMegaMenuCategory | null = selected
    ? {
        id: selected.id,
        label: selected.label,
        href: resolveMegaMenuHref(selected.category_id, selected.href, slugById),
        position: selected.position,
        links: selectedLinks.map((l) => ({ id: l.id, label: l.label, href: resolveMegaMenuHref(l.category_id, l.href, slugById), position: l.position })),
        tiles: selectedTiles.map((t) => ({ id: t.id, label: t.label, href: resolveMegaMenuHref(t.category_id, t.href, slugById), imageUrl: t.image_url, imageType: t.image_type, position: t.position })),
      }
    : null;

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">MEGA MENU.</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
        This builds the dropdown that opens when a shopper hovers WOMEN, MEN, etc. in the navbar. Three levels: the tabs themselves, the text links on the left of the dropdown, and the photo tiles on the right. Drag the <span className="inline-flex items-center justify-center size-4 border border-border rounded align-middle"><GripVertical className="size-2.5" /></span> handle to reorder anything.
      </p>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-8 min-w-0">
          {/* CATEGORIES */}
          <Panel
            title="STEP 1 — TOP-LEVEL CATEGORIES"
            description={'These are the tabs in the navbar itself (e.g. "WOMEN"). Click MANAGE on one below to edit what appears inside its dropdown.'}
          >
            <Reorder.Group axis="y" values={categories} onReorder={reorderCategories} className="space-y-2">
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  selected={cat.id === selectedId}
                  allCategories={allCategories}
                  onSelect={() => setSelectedId(cat.id)}
                  onChange={(patch) => setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, ...patch } : c)))}
                  onDelete={() => deleteCategory(cat.id)}
                />
              ))}
            </Reorder.Group>
            <RowActions onAdd={addCategory} addLabel="ADD CATEGORY" onSave={saveCategories} saving={savingSection === "categories"} />
          </Panel>

          {/* LINKS */}
          {selected && (
            <Panel
              title={`STEP 2 — TEXT LINKS INSIDE "${selected.label}"`}
              description="The plain text links stacked down the left side of this category's dropdown (e.g. NEW ARRIVALS, SHOP ALL)."
            >
              <Reorder.Group axis="y" values={selectedLinks} onReorder={reorderLinks} className="space-y-2">
                {selectedLinks.map((link) => (
                  <LinkRow
                    key={link.id}
                    item={link}
                    allCategories={allCategories}
                    onChange={(patch) => setLinks((ls) => ls.map((l) => (l.id === link.id ? { ...l, ...patch } : l)))}
                    onDelete={() => deleteLink(link.id)}
                  />
                ))}
              </Reorder.Group>
              <RowActions onAdd={addLink} addLabel="ADD LINK" onSave={saveLinks} saving={savingSection === "links"} />
            </Panel>
          )}

          {/* TILES */}
          {selected && (
            <Panel
              title={`STEP 3 — PHOTO TILES INSIDE "${selected.label}"`}
              description="The row of photo cards next to the links, e.g. DRESSES / SHORTS / ACCESSORIES. Shoppers can scroll through these if there are more than fit on screen."
            >
              <Reorder.Group axis="y" values={selectedTiles} onReorder={reorderTiles} className="space-y-3">
                {selectedTiles.map((tile) => (
                  <TileRow
                    key={tile.id}
                    item={tile}
                    allCategories={allCategories}
                    onChange={(patch) => setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, ...patch } : t)))}
                    onDelete={() => deleteTile(tile.id)}
                  />
                ))}
              </Reorder.Group>
              <RowActions onAdd={addTile} addLabel="ADD TILE" onSave={saveTiles} saving={savingSection === "tiles"} />
            </Panel>
          )}
        </div>

        {/* LIVE PREVIEW */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-1">LIVE PREVIEW</div>
          <p className="text-xs text-muted-foreground mb-3">This is exactly what shoppers see for the category you're managing below.</p>
          <div className="border border-border bg-background">
            <div className="flex items-center gap-5 px-5 h-14 border-b border-border overflow-x-auto no-scrollbar">
              {categories.map((c) => (
                <span key={c.id} className={`text-sm tracking-wide shrink-0 ${c.id === selectedId ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {c.label}
                </span>
              ))}
            </div>
            {previewCategory ? (
              <MegaMenuPanel category={previewCategory} onNavigate={() => {}} variant="desktop" />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Select a category to preview it.</p>
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
    <div className="flex items-center gap-3 mt-3">
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

function LinkTargetPicker({
  href, categoryId, allCategories, onChange,
}: {
  href: string | null;
  categoryId: string | null;
  allCategories: Category[];
  onChange: (patch: { href: string | null; category_id: string | null }) => void;
}) {
  // Mode is its own state, not just derived from categoryId — otherwise
  // switching to "shop category" and not having picked one yet (categoryId
  // still null) would immediately flip back to "custom link" on re-render.
  const [mode, setMode] = useState<"url" | "category">(categoryId ? "category" : "url");

  return (
    <div>
      <div className="text-mono text-[9px] tracking-widest text-muted-foreground/70 mb-1">WHEN CLICKED, GO TO:</div>
      <div className="flex items-center gap-2 w-full flex-wrap sm:flex-nowrap">
        <div className="inline-flex border border-border rounded overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => { setMode("url"); onChange({ href: href ?? "", category_id: null }); }}
            className={`px-2.5 h-9 text-[9px] font-semibold tracking-widest whitespace-nowrap ${mode === "url" ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}
          >
            CUSTOM LINK
          </button>
          <button
            type="button"
            onClick={() => setMode("category")}
            className={`px-2.5 h-9 text-[9px] font-semibold tracking-widest whitespace-nowrap ${mode === "category" ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}
          >
            SHOP CATEGORY
          </button>
        </div>
        {mode === "url" ? (
          <input
            value={href ?? ""}
            onChange={(e) => onChange({ href: e.target.value, category_id: null })}
            placeholder="e.g. /collections/men or a full https:// URL"
            className="inp flex-1 min-w-[160px]"
          />
        ) : (
          <select
            value={categoryId ?? ""}
            onChange={(e) => onChange({ href: null, category_id: e.target.value || null })}
            className="inp flex-1 min-w-[160px]"
          >
            <option value="">— choose a category —</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>{categoryLabel(c, allCategories)}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  cat, selected, allCategories, onSelect, onChange, onDelete,
}: {
  cat: MegaMenuCategoryRow;
  selected: boolean;
  allCategories: Category[];
  onSelect: () => void;
  onChange: (patch: Partial<MegaMenuCategoryRow>) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={cat} dragListener={false} dragControls={dragControls}>
      <div className={`flex flex-col gap-2 p-2.5 border ${selected ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
        <div className="flex items-center gap-2">
          <DragHandle dragControls={dragControls} />
          <input value={cat.label} onChange={(e) => onChange({ label: e.target.value })} className="inp flex-1 min-w-0" placeholder="Label" />
          <label title="Uncheck to hide this tab from the navbar without deleting it" className="flex items-center gap-1.5 shrink-0 text-mono text-[10px] tracking-widest text-muted-foreground">
            <input type="checkbox" checked={cat.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
            SHOWN
          </label>
          <button
            type="button"
            onClick={onSelect}
            title="Edit this category's links and photo tiles"
            className={`shrink-0 border h-9 px-3 text-mono text-[10px] tracking-widest whitespace-nowrap transition-colors ${
              selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            MANAGE →
          </button>
          <button type="button" onClick={onDelete} title="Delete this category" className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500">
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <LinkTargetPicker
          href={cat.href}
          categoryId={cat.category_id}
          allCategories={allCategories}
          onChange={(patch) => onChange(patch)}
        />
      </div>
    </Reorder.Item>
  );
}

function LinkRow({
  item, allCategories, onChange, onDelete,
}: {
  item: MegaMenuLinkRow;
  allCategories: Category[];
  onChange: (patch: Partial<MegaMenuLinkRow>) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <div className="flex flex-col gap-2 p-2.5 border border-border bg-background">
        <div className="flex items-center gap-2">
          <DragHandle dragControls={dragControls} />
          <input value={item.label} onChange={(e) => onChange({ label: e.target.value })} className="inp flex-1 min-w-0" placeholder="Label" />
          <label title="Uncheck to hide this link without deleting it" className="flex items-center gap-1.5 shrink-0 text-mono text-[10px] tracking-widest text-muted-foreground">
            <input type="checkbox" checked={item.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
            SHOWN
          </label>
          <button type="button" onClick={onDelete} title="Delete this link" className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500">
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <LinkTargetPicker href={item.href} categoryId={item.category_id} allCategories={allCategories} onChange={(patch) => onChange(patch)} />
      </div>
    </Reorder.Item>
  );
}

function TileRow({
  item, allCategories, onChange, onDelete,
}: {
  item: MegaMenuTileRow;
  allCategories: Category[];
  onChange: (patch: Partial<MegaMenuTileRow>) => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <div className="flex items-start gap-2 p-3 border border-border bg-background">
        <div className="pt-2.5"><DragHandle dragControls={dragControls} /></div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <input value={item.label} onChange={(e) => onChange({ label: e.target.value })} className="inp flex-1 min-w-0" placeholder="Label" />
            <button type="button" onClick={onDelete} className="shrink-0 border border-border h-9 w-9 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <LinkTargetPicker href={item.href} categoryId={item.category_id} allCategories={allCategories} onChange={(patch) => onChange(patch)} />
          <MediaField
            label="TILE PHOTO"
            value={{ url: item.image_url, type: item.image_type }}
            onChange={(v) => onChange({ image_url: v.url, image_type: v.type })}
          />
        </div>
      </div>
    </Reorder.Item>
  );
}
