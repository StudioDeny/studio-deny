import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NavigationMenu, NavMenuItem, NavLocation } from "@/types/database";
import { Plus, Trash2, ChevronUp, ChevronDown, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/navigation")({
  component: AdminNavigation,
});

const LOCATIONS: { key: NavLocation; label: string }[] = [
  { key: "header", label: "HEADER" },
  { key: "footer", label: "FOOTER" },
  { key: "mobile", label: "MOBILE" },
];

function AdminNavigation() {
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavLocation>("header");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("navigation_menus").select("*");
    if (error) toast.error(error.message);
    else setMenus(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const current = menus.find((m) => m.location === activeTab);
  const items: NavMenuItem[] = current?.items ?? [];

  const updateItems = (next: NavMenuItem[]) => {
    setMenus((m) =>
      m.map((x) => (x.location === activeTab ? { ...x, items: next } : x))
    );
  };

  const save = async () => {
    if (!current) return toast.error("Menu not found");
    setSaving(true);
    const { error } = await supabase
      .from("navigation_menus")
      .update({ items })
      .eq("id", current.id);
    if (error) toast.error(error.message);
    else toast.success(`${activeTab} navigation saved`);
    setSaving(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    updateItems(next);
  };

  const addItem = () => {
    updateItems([...items, { label: "New Link", href: "/" }]);
  };

  const removeItem = (idx: number) => {
    updateItems(items.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-display text-4xl md:text-5xl">NAVIGATION.</h1>
        <p className="text-muted-foreground text-sm mt-2">Manage header, footer, and mobile navigation menus.</p>
      </div>

      <div className="flex gap-1 mb-6">
        {LOCATIONS.map((l) => (
          <button
            key={l.key}
            onClick={() => setActiveTab(l.key)}
            className={`text-mono text-[10px] tracking-widest px-4 h-9 border ${activeTab === l.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="border border-border bg-surface p-6 text-center text-muted-foreground text-sm">
          No menu found for {activeTab}. Add items to create it.
        </div>
      ) : (
        <div className="border border-border bg-surface">
          {items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No items yet. Add your first link.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item, idx) => (
                <MenuItemRow
                  key={idx}
                  item={item}
                  idx={idx}
                  total={items.length}
                  onMove={move}
                  onRemove={removeItem}
                  onUpdate={(updated) => {
                    const next = [...items];
                    next[idx] = updated;
                    updateItems(next);
                  }}
                />
              ))}
            </ul>
          )}
          <div className="p-4 border-t border-border flex items-center gap-3">
            <button
              onClick={addItem}
              className="border border-border h-9 px-3 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
            >
              <Plus className="size-3" /> ADD ITEM
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-primary text-primary-foreground h-9 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50"
            >
              {saving ? "SAVING…" : "SAVE MENU"}
            </button>
          </div>
        </div>
      )}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:36px;padding:0 10px;font-family:var(--font-mono,monospace);font-size:12px}`}</style>
    </div>
  );
}

function MenuItemRow({
  item, idx, total, onMove, onRemove, onUpdate,
}: {
  item: NavMenuItem;
  idx: number;
  total: number;
  onMove: (i: number, d: -1 | 1) => void;
  onRemove: (i: number) => void;
  onUpdate: (u: NavMenuItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const commit = () => { onUpdate(draft); setEditing(false); };
  const cancel = () => { setDraft(item); setEditing(false); };

  return (
    <li className="flex items-center gap-2 p-3 hover:bg-muted/20">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={() => onMove(idx, -1)} disabled={idx === 0}
          className="border border-border h-5 w-5 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
          <ChevronUp className="size-2.5" />
        </button>
        <button onClick={() => onMove(idx, 1)} disabled={idx === total - 1}
          className="border border-border h-5 w-5 inline-flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-30">
          <ChevronDown className="size-2.5" />
        </button>
      </div>

      {editing ? (
        <>
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Label"
            className="inp w-36"
          />
          <input
            value={draft.href}
            onChange={(e) => setDraft({ ...draft, href: e.target.value })}
            placeholder="/path"
            className="inp flex-1"
          />
          <button onClick={commit} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Check className="size-3" /></button>
          <button onClick={cancel} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><X className="size-3" /></button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{item.label}</div>
            <div className="text-mono text-[10px] text-muted-foreground">{item.href}</div>
          </div>
          <button onClick={() => setEditing(true)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Pencil className="size-3" /></button>
          <button onClick={() => onRemove(idx)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary"><Trash2 className="size-3" /></button>
        </>
      )}
    </li>
  );
}
