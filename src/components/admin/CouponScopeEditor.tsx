// "Where can it be used?" for a coupon: the whole store, or chosen
// categories (subcategories included) with every product in them ticked —
// untick a product to leave it out. Only categories and left-out products
// are saved, so products added to those categories later are covered too.
import { useMemo, useState } from "react";
import type { Category } from "@/lib/catalog";
import type { Product } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";

export type CouponScope = { scope: "all" | "categories"; categoryIds: string[]; excluded: string[] };

// Categories a choice covers: each chosen one plus its subcategories.
export function coveredCategoryIds(categoryIds: string[], cats: Category[]): Set<string> {
  return new Set(categoryIds.flatMap((id) => [id, ...cats.filter((c) => c.parentId === id).map((c) => c.id)]));
}

export function productsInScope(categoryIds: string[], cats: Category[], products: Product[], memberships: Map<string, Set<string>>): Product[] {
  const covered = coveredCategoryIds(categoryIds, cats);
  return products
    .filter((p) => (p.categoryId && covered.has(p.categoryId)) || [...(memberships.get(p.slug) ?? [])].some((id) => covered.has(id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function CouponScopeEditor({ value, onChange, cats, products, memberships }: {
  value: CouponScope;
  onChange: (v: CouponScope) => void;
  cats: Category[];
  products: Product[];
  memberships: Map<string, Set<string>>;
}) {
  const [search, setSearch] = useState("");
  const roots = useMemo(
    () => cats.filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId)).sort((a, b) => a.name.localeCompare(b.name)),
    [cats],
  );
  const inScope = useMemo(
    () => productsInScope(value.categoryIds, cats, products, memberships),
    [value.categoryIds, cats, products, memberships],
  );
  const shown = search.trim() ? inScope.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())) : inScope;
  const ticked = inScope.filter((p) => !value.excluded.includes(p.slug)).length;

  const toggleCategory = (c: Category) => {
    const on = value.categoryIds.includes(c.id);
    // Ticking a main category covers its subcategories, so drop them as separate picks.
    const kids = cats.filter((k) => k.parentId === c.id).map((k) => k.id);
    const categoryIds = on ? value.categoryIds.filter((id) => id !== c.id) : [...value.categoryIds.filter((id) => !kids.includes(id)), c.id];
    onChange({ ...value, categoryIds });
  };
  const setExcluded = (slugs: string[], exclude: boolean) => {
    const rest = value.excluded.filter((s) => !slugs.includes(s));
    onChange({ ...value, excluded: exclude ? [...rest, ...slugs] : rest });
  };

  return (
    <div>
      <div className="lbl">WHERE CAN IT BE USED?</div>
      <div className="flex flex-wrap gap-5 mb-3">
        {(["all", "categories"] as const).map((s) => (
          <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="coupon-scope" checked={value.scope === s} onChange={() => onChange({ ...value, scope: s })} className="size-4" />
            {s === "all" ? "Whole store" : "Only some categories"}
          </label>
        ))}
      </div>

      {value.scope === "categories" && (
        <div className="grid md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4">
          <div>
            <div className="lbl">CATEGORIES (SUBCATEGORIES INCLUDED)</div>
            <ul className="border border-border bg-background max-h-72 overflow-y-auto divide-y divide-border" data-lenis-prevent>
              {roots.map((root) => {
                const rootOn = value.categoryIds.includes(root.id);
                return (
                  <li key={root.id}>
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm font-semibold">
                      <input type="checkbox" checked={rootOn} onChange={() => toggleCategory(root)} className="size-4" />
                      {root.name}
                    </label>
                    {cats.filter((c) => c.parentId === root.id).sort((a, b) => a.name.localeCompare(b.name)).map((child) => (
                      <label key={child.id} className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm ${rootOn ? "text-muted-foreground" : "cursor-pointer"}`}>
                        <input type="checkbox" checked={rootOn || value.categoryIds.includes(child.id)} disabled={rootOn} onChange={() => toggleCategory(child)} className="size-4" />
                        {child.name}
                        {rootOn && <span className="text-[10px] text-mono tracking-widest">INCLUDED</span>}
                      </label>
                    ))}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="lbl">PRODUCTS · {ticked} OF {inScope.length} TICKED — UNTICK TO LEAVE OUT</div>
              {inScope.length > 0 && (
                <div className="flex gap-3 text-mono text-[10px] tracking-widest mb-1">
                  <button type="button" onClick={() => setExcluded(shown.map((p) => p.slug), false)} className="underline underline-offset-4 hover:text-primary">TICK ALL</button>
                  <button type="button" onClick={() => setExcluded(shown.map((p) => p.slug), true)} className="underline underline-offset-4 hover:text-primary">UNTICK ALL</button>
                </div>
              )}
            </div>
            {value.categoryIds.length === 0 ? (
              <p className="border border-dashed border-border p-4 text-xs text-muted-foreground">Tick a category to see its products.</p>
            ) : inScope.length === 0 ? (
              <p className="border border-dashed border-border p-4 text-xs text-muted-foreground">No products in these categories yet — ones you add later will be covered.</p>
            ) : (
              <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="inp mb-2" />
                <ul className="border border-border bg-background max-h-72 overflow-y-auto divide-y divide-border" data-lenis-prevent>
                  {shown.map((p) => {
                    const on = !value.excluded.includes(p.slug);
                    return (
                      <li key={p.slug}>
                        <label className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${on ? "" : "opacity-50"}`}>
                          <input type="checkbox" checked={on} onChange={() => setExcluded([p.slug], on)} className="size-4 shrink-0" />
                          {p.image && <img src={p.image} alt="" className="w-8 h-10 object-cover shrink-0 bg-surface" />}
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm truncate">{p.name}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {p.category} · {formatINR(p.price)}{p.is_active === false ? " · hidden" : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Products added to these categories later are included automatically. The discount and min order count only these products.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
