# Per-size Inventory, Product Delete, White Tags, Customer GST — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One stock count per colour × size shared by website + billing software, online orders moving stock, product delete, pure-white price tags, optional customer GSTIN on bills.

**Architecture:** `product_variants` (one row per colour × size) becomes the only stock source; DB triggers derive `products.stock/sizes`, decrement on online order items, and restore on cancel/return. Admin edits stock in a colour × size grid; the POS always asks colour → size. GSTIN is a new column on `pos_customers` + `pos_bills` passed through `pos_checkout`.

**Tech Stack:** Supabase Postgres (plpgsql triggers/RPCs), React 19 + TanStack Router (website), React 19 + react-router (billing), TypeScript, Tailwind.

**Spec:** `studio-deny/docs/superpowers/specs/2026-10-02-inventory-sizes-delete-gst-design.md`

Paths below are relative to `C:\Users\prave\Downloads\deny\`. `W/` = `studio-deny/`, `B/` = `studio-deny-billing-software/`.

## Global Constraints

- Migrations are additive; never edit an applied migration. The implementer never runs SQL against the live DB — the owner applies them.
- `ONE SIZE` is the literal size label for size-less products.
- GSTIN regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`
- Pure white = `#FFFFFF`, only inside price-tag designs.
- Delete is blocked when the product appears in `pos_bill_items`, `order_items`, or `orders.items`.
- Match each repo's existing style: website uses `text-mono`/`border-border` tokens + `sonner` toasts; billing uses `#111111/#D5D5D8/#E2E2E4` + `store.addToast`.
- No new dependencies. No test framework exists in either repo: verification = `npm run build` (+ lint) and SQL assertions run inside `begin; … rollback;` on a scratch DB, plus the manual checklist in the final task.

## Review Focus

1. Product edited in the grid while a bill is being settled — `pos_checkout` locks the variant row (`for update`); grid save must update by variant id, not delete+reinsert, so bill history keeps its `variant_id`.
2. Clearing a grid cell for a variant that was already sold — delete is refused by the FK/sold check; UI must say "set it to 0 instead", not silently fail.
3. Cancelling an order twice / cancel then return-received — `stock_restored_at` guard must stop double restock (SQL assertion in Task 2).
4. Product with colours but category without sizes — grid shows one `ONE SIZE` column per colour; POS asks colour only.
5. Walk-in guest with GSTIN — saved on the bill only, never creates/updates a customer.

---

### Task 1: Variant stock source-of-truth migration (website DB)

**Files:**
- Create: `W/supabase/migrations/20261002000001_variant_stock_source_of_truth.sql`

**Interfaces:**
- Produces: `recompute_product_stock(p_slug text)`; trigger keeps `products.stock` = Σ variant stock, `products.sizes` = distinct variant sizes ordered by category size position. Backfilled `ONE SIZE` variants.

- [ ] **Step 1: Write the migration**

```sql
-- Stock lives only in product_variants (one row per colour x size).
-- products.stock / products.sizes become derived so legacy readers stay right.
BEGIN;

CREATE OR REPLACE FUNCTION recompute_product_stock(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_slug) THEN
    UPDATE products SET stock = 0 WHERE slug = p_slug;
    RETURN;
  END IF;
  UPDATE products p
  SET stock = (SELECT coalesce(sum(v.stock), 0) FROM product_variants v WHERE v.product_id = p_slug),
      sizes = coalesce((
        SELECT array_agg(s.size ORDER BY s.pos, s.size)
        FROM (
          SELECT v.size, min(coalesce(sz.position, 9999)) AS pos
          FROM product_variants v
          LEFT JOIN sizes sz ON sz.label = v.size AND sz.category_id = p.category_id
          WHERE v.product_id = p_slug AND v.size IS NOT NULL
          GROUP BY v.size
        ) s
      ), '{}')
  WHERE p.slug = p_slug;
END $$;

CREATE OR REPLACE FUNCTION trg_variants_sync_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN PERFORM recompute_product_stock(NEW.product_id); END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id) THEN
    PERFORM recompute_product_stock(OLD.product_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS variants_sync_product ON product_variants;
CREATE TRIGGER variants_sync_product
  AFTER INSERT OR DELETE OR UPDATE OF stock, size, product_id ON product_variants
  FOR EACH ROW EXECUTE FUNCTION trg_variants_sync_product();

-- Backfill: size-less products with no variants get one exact ONE SIZE row.
-- Products with sizes but no variants are left alone ("needs size counts").
INSERT INTO product_variants (product_id, size, color, color_hex, stock, price, compare_price)
SELECT p.slug, 'ONE SIZE', NULL, NULL, greatest(p.stock, 0), p.price, p.compare_at
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.slug)
  AND (p.sizes IS NULL OR cardinality(p.sizes) = 0);

-- Products that already have variants: realign the derived columns once.
SELECT recompute_product_stock(slug) FROM products
WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = products.slug);

COMMIT;
```

- [ ] **Step 2: Assert on a scratch DB** (`begin; \i file-without-BEGIN/COMMIT; …; rollback;`)

```sql
insert into products (slug,name,category,price,image,sizes,stock) values ('t-x','T','Tees',100,'x','{}',0);
insert into product_variants (product_id,size,color,stock,price) values ('t-x','M','Black',3,100),('t-x','S','Black',2,100);
select stock, sizes from products where slug='t-x';   -- expect 5, {S,M} or {M,S} per sizes.position
delete from product_variants where product_id='t-x' and size='M';
select stock from products where slug='t-x';          -- expect 2
```

- [ ] **Step 3: Commit**

```bash
git -C studio-deny add supabase/migrations/20261002000001_variant_stock_source_of_truth.sql
git -C studio-deny commit -m "feat(db): product_variants is the single stock source"
```

---

### Task 2: Online order stock + pre-payment check + delete RPC (website DB)

**Files:**
- Create: `W/supabase/migrations/20261002000002_online_order_stock.sql`
- Create: `W/supabase/migrations/20261002000003_admin_delete_product.sql`

**Interfaces:**
- Produces: `check_cart_stock(p_items jsonb) returns table(variant_id uuid, size text, color text, available int, requested int)`; `admin_delete_product(p_slug text) returns void` raising `PRODUCT_SOLD:<n>`; `orders.stock_restored_at`.

- [ ] **Step 1: Write `20261002000002_online_order_stock.sql`**

```sql
-- Online orders move the same per-size stock the POS uses.
BEGIN;

ALTER TABLE pos_inventory_logs DROP CONSTRAINT IF EXISTS pos_inventory_logs_reason_check;
ALTER TABLE pos_inventory_logs ADD CONSTRAINT pos_inventory_logs_reason_check
  CHECK (reason IN ('SALE','RESTOCK','ADJUSTMENT','RETURN_RESTOCK','DAMAGED','VOID','EDIT','ONLINE_SALE','ONLINE_RESTOCK'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz;

-- Payment is already captured when items are inserted, so never fail here:
-- clamp at 0 and flag the oversell in the log.
CREATE OR REPLACE FUNCTION trg_order_item_take_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old integer; v_new integer;
BEGIN
  IF NEW.variant_id IS NULL THEN RETURN NULL; END IF;
  SELECT stock INTO v_old FROM product_variants WHERE id = NEW.variant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_new := greatest(0, v_old - NEW.qty);
  UPDATE product_variants SET stock = v_new WHERE id = NEW.variant_id;
  INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
  VALUES (NEW.variant_id, NEW.product_slug, -NEW.qty, v_new, 'ONLINE_SALE',
          'Order ' || NEW.order_id || CASE WHEN v_old < NEW.qty THEN ' - OVERSOLD (had ' || v_old || ')' ELSE '' END);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS order_item_take_stock ON order_items;
CREATE TRIGGER order_item_take_stock AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_order_item_take_stock();

CREATE OR REPLACE FUNCTION trg_order_restore_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_new integer;
BEGIN
  IF NEW.stock_restored_at IS NOT NULL THEN RETURN NULL; END IF;
  IF NOT (
    (NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED')
    OR (NEW.return_status = 'RECEIVED' AND OLD.return_status IS DISTINCT FROM 'RECEIVED')
  ) THEN RETURN NULL; END IF;

  FOR r IN SELECT * FROM order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL LOOP
    UPDATE product_variants SET stock = stock + r.qty WHERE id = r.variant_id RETURNING stock INTO v_new;
    IF FOUND THEN
      INSERT INTO pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, note)
      VALUES (r.variant_id, r.product_slug, r.qty, v_new, 'ONLINE_RESTOCK', 'Order ' || NEW.id || ' ' ||
              CASE WHEN NEW.status = 'CANCELLED' THEN 'cancelled' ELSE 'return received' END);
    END IF;
  END LOOP;
  UPDATE orders SET stock_restored_at = now() WHERE id = NEW.id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS order_restore_stock ON orders;
CREATE TRIGGER order_restore_stock AFTER UPDATE OF status, return_status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_order_restore_stock();

-- Checkout asks this before taking payment. Returns only the short lines.
CREATE OR REPLACE FUNCTION check_cart_stock(p_items jsonb)
RETURNS TABLE (variant_id uuid, size text, color text, available integer, requested integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.size, v.color, v.stock, (i->>'qty')::integer
  FROM jsonb_array_elements(p_items) i
  JOIN product_variants v ON v.id = (i->>'variant_id')::uuid
  WHERE v.stock < (i->>'qty')::integer;
$$;
GRANT EXECUTE ON FUNCTION check_cart_stock(jsonb) TO anon, authenticated;

COMMIT;
```

- [ ] **Step 2: Write `20261002000003_admin_delete_product.sql`**

```sql
-- Permanent delete for products that were never sold (test products).
BEGIN;

CREATE OR REPLACE FUNCTION admin_delete_product(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sold integer;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT (SELECT count(*) FROM order_items WHERE product_slug = p_slug)
       + (SELECT count(*) FROM pos_bill_items WHERE product_slug = p_slug)
       + (SELECT count(*) FROM orders WHERE items @> jsonb_build_array(jsonb_build_object('slug', p_slug)))
  INTO v_sold;
  IF v_sold > 0 THEN RAISE EXCEPTION 'PRODUCT_SOLD:%', v_sold; END IF;

  -- Tables that reference the slug without a cascading FK.
  DELETE FROM wishlist_items WHERE product_slug = p_slug;
  DELETE FROM influencer_pick_products WHERE product_slug = p_slug;
  UPDATE lookbook_slides SET product_slug = NULL WHERE product_slug = p_slug;
  DELETE FROM product_variants WHERE product_id = p_slug;   -- cart_items cascade
  DELETE FROM products WHERE slug = p_slug;                 -- product_categories, mega menu, notifications, inventory logs cascade
END $$;
GRANT EXECUTE ON FUNCTION admin_delete_product(text) TO authenticated;

COMMIT;
```

- [ ] **Step 3: Assert on a scratch DB** (inside `begin; … rollback;`, after Task 1 SQL)

```sql
-- sale + double restore guard
insert into orders (id,user_email,items,subtotal,shipping,total,status,address) values ('SDT1','a@b.c','[]',100,0,100,'PLACED','{}');
insert into order_items (order_id,product_slug,product_name,variant_id,size,qty,unit_price)
  select 'SDT1','t-x','T',id,'S',1,100 from product_variants where product_id='t-x' and size='S';
select stock from product_variants where product_id='t-x' and size='S';  -- expect 1
update orders set status='CANCELLED' where id='SDT1';
update orders set return_status='RECEIVED' where id='SDT1';
select stock from product_variants where product_id='t-x' and size='S';  -- expect 2 (restored once)
select * from check_cart_stock('[{"variant_id":"<S id>","qty":5}]');     -- 1 row, available 2
-- delete guard
select admin_delete_product('t-x');  -- expect ERROR PRODUCT_SOLD:2 (order_items + orders.items if populated)
```
(Run as a service role with `is_admin_or_staff()` true, or temporarily `set role` an admin.)

- [ ] **Step 4: Commit**

```bash
git -C studio-deny add supabase/migrations/20261002000002_online_order_stock.sql supabase/migrations/20261002000003_admin_delete_product.sql
git -C studio-deny commit -m "feat(db): online orders move variant stock; admin_delete_product"
```

---

### Task 3: Colour × size stock grid in the website product form

**Files:**
- Create: `W/src/lib/variantGrid.ts`
- Create: `W/src/components/admin/StockGrid.tsx`
- Modify: `W/src/routes/admin.products.new.tsx` (remove STOCK input lines 361-368, AVAILABLE SIZES field 471-499, VARIANTS section 570-650, `VariantModal` 666-781, variant state/handlers 85-182 and staged-insert 240-248; relabel COLORS field)

**Interfaces:**
- Produces:
  - `type GridVariant = { id?: string; size: string | null; color: string | null; color_hex: string | null; stock: number; price: number | null; compare_price: number | null; sku: string | null }`
  - `type GridKey = string` (``${color ?? ""}|${size}``), `gridKey(color, size)`
  - `type GridState = Record<GridKey, string>` (cell text; `""` = not made)
  - `planVariantSave(existing: GridVariant[], grid: GridState, colors: {name:string;hex:string}[], sizes: string[], price: number, compareAt?: number): { inserts: Omit<GridVariant,"id">[]; updates: {id:string; stock:number; color_hex:string|null}[]; deletes: GridVariant[] }`
  - `saveVariantGrid(slug: string, plan): Promise<{ blocked: GridVariant[] }>` — deletes that hit FK/sold errors are returned as `blocked` and set to 0 instead.
  - `<StockGrid colors sizes grid onChange extraVariants onExtraStock onExtraDelete />`

- [ ] **Step 1: Write `variantGrid.ts`**

```ts
// Colour x size stock grid <-> product_variants rows. A blank cell means the
// colour is not made in that size (no row); "0" means made but sold out.
import { supabase } from "./supabase";

export const ONE_SIZE = "ONE SIZE";

export type GridVariant = {
  id?: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  stock: number;
  price: number | null;
  compare_price: number | null;
  sku: string | null;
};
export type GridState = Record<string, string>;

export const gridKey = (color: string | null, size: string) => `${color ?? ""}|${size}`;

export function gridFromVariants(variants: GridVariant[]): GridState {
  const g: GridState = {};
  for (const v of variants) if (v.size) g[gridKey(v.color, v.size)] = String(v.stock);
  return g;
}

export function planVariantSave(
  existing: GridVariant[],
  grid: GridState,
  colors: { name: string; hex: string }[],
  sizes: string[],
  price: number,
  compareAt?: number,
) {
  const rowColors: { name: string | null; hex: string | null }[] =
    colors.length > 0 ? colors.map((c) => ({ name: c.name.trim(), hex: c.hex || null })) : [{ name: null, hex: null }];
  const inserts: Omit<GridVariant, "id">[] = [];
  const updates: { id: string; stock: number; color_hex: string | null }[] = [];
  const deletes: GridVariant[] = [];
  const seen = new Set<string>();

  for (const c of rowColors) {
    for (const size of sizes) {
      const key = gridKey(c.name, size);
      seen.add(key);
      const raw = (grid[key] ?? "").trim();
      const match = existing.find((v) => (v.color ?? null) === c.name && v.size === size);
      if (raw === "") {
        if (match) deletes.push(match);
        continue;
      }
      const stock = Math.max(0, Math.floor(Number(raw)) || 0);
      if (match?.id) {
        if (match.stock !== stock || (match.color_hex ?? null) !== c.hex) updates.push({ id: match.id, stock, color_hex: c.hex });
      } else {
        inserts.push({ size, color: c.name, color_hex: c.hex, stock, price, compare_price: compareAt ?? null, sku: null });
      }
    }
  }
  // Rows outside the grid (old sizes/colours) are untouched here; the form
  // lists them separately so nothing is hidden.
  return { inserts, updates, deletes, outside: existing.filter((v) => !v.size || !seen.has(gridKey(v.color, v.size))) };
}

export async function saveVariantGrid(slug: string, plan: ReturnType<typeof planVariantSave>): Promise<{ blocked: GridVariant[] }> {
  if (plan.inserts.length > 0) {
    const { error } = await supabase.from("product_variants").insert(plan.inserts.map((v) => ({ ...v, product_id: slug })));
    if (error) throw new Error(error.message);
  }
  for (const u of plan.updates) {
    const { error } = await supabase.from("product_variants").update({ stock: u.stock, color_hex: u.color_hex }).eq("id", u.id);
    if (error) throw new Error(error.message);
  }
  const blocked: GridVariant[] = [];
  for (const d of plan.deletes) {
    if (!d.id) continue;
    if (await variantWasSold(d.id)) {
      await supabase.from("product_variants").update({ stock: 0 }).eq("id", d.id);
      blocked.push(d);
      continue;
    }
    const { error } = await supabase.from("product_variants").delete().eq("id", d.id);
    if (error) throw new Error(error.message);
  }
  return { blocked };
}

async function variantWasSold(id: string): Promise<boolean> {
  const [{ count: online }, { count: pos }] = await Promise.all([
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("variant_id", id),
    supabase.from("pos_bill_items").select("id", { count: "exact", head: true }).eq("variant_id", id),
  ]);
  return (online ?? 0) + (pos ?? 0) > 0;
}

export async function listVariants(slug: string): Promise<GridVariant[]> {
  const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", slug);
  if (error) throw new Error(error.message);
  return (data ?? []) as GridVariant[];
}
```
(If `pos_bill_items` is not in `W/src/types/database.ts`, cast: `supabase.from("pos_bill_items" as any)`.)

- [ ] **Step 2: Write `StockGrid.tsx`**

```tsx
import { gridKey, type GridState, type GridVariant } from "@/lib/variantGrid";

export function StockGrid({
  colors, sizes, grid, onChange, outside, onOutsideStock, onOutsideDelete,
}: {
  colors: { name: string; hex: string }[];
  sizes: string[];
  grid: GridState;
  onChange: (g: GridState) => void;
  outside: GridVariant[];
  onOutsideStock: (v: GridVariant, stock: number) => void;
  onOutsideDelete: (v: GridVariant) => void;
}) {
  const rows = colors.length > 0 ? colors.map((c) => ({ name: c.name.trim() || null, hex: c.hex })) : [{ name: null, hex: "" }];
  return (
    <div className="space-y-3">
      <p className="text-mono text-[10px] text-muted-foreground leading-relaxed">
        ENTER HOW MANY PIECES YOU HAVE FOR EACH COLOUR + SIZE. LEAVE BLANK IF THAT COLOUR IS NOT MADE IN THAT SIZE. 0 = SOLD OUT.
      </p>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-2">COLOUR</th>
              {sizes.map((s) => <th key={s} className="p-2 text-center">{s}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.name ?? "_"}>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {r.hex && <span className="size-4 rounded-full border border-border inline-block" style={{ background: r.hex }} />}
                    <span className="text-mono text-xs">{r.name ?? "NO COLOUR"}</span>
                  </div>
                </td>
                {sizes.map((s) => {
                  const k = gridKey(r.name, s);
                  return (
                    <td key={s} className="p-1 text-center">
                      <input
                        type="number" min={0} inputMode="numeric"
                        value={grid[k] ?? ""}
                        onChange={(e) => onChange({ ...grid, [k]: e.target.value })}
                        className="inp !w-16 text-center"
                        placeholder="—"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {outside.length > 0 && (
        <div className="border border-dashed border-border p-3 space-y-2">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">OTHER VARIANTS (SIZE OR COLOUR NO LONGER IN THE GRID)</div>
          {outside.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-mono text-xs">
              <span className="flex-1">{[v.color, v.size].filter(Boolean).join(" / ") || "—"}</span>
              <input type="number" min={0} defaultValue={v.stock} className="inp !w-20"
                onBlur={(e) => { const n = Math.max(0, Number(e.target.value) || 0); if (n !== v.stock) onOutsideStock(v, n); }} />
              <button type="button" onClick={() => onOutsideDelete(v)} className="text-red-500 text-[10px] tracking-widest hover:underline">DEL</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into `admin.products.new.tsx`**

Replace the variant state/handlers (lines 85-182) with:

```tsx
  const [variants, setVariants] = useState<GridVariant[]>([]);
  const [grid, setGrid] = useState<GridState>({});

  const loadVariants = async () => {
    if (!initial) return;
    const vs = await listVariants(initial.slug);
    setVariants(vs);
    setGrid(gridFromVariants(vs));
  };
  useEffect(() => { loadVariants(); }, [initial?.slug]);

  const gridSizes = sizesForCategory.length > 0 ? sizesForCategory.map((s) => s.label) : [ONE_SIZE];
```

In `onSubmit`, after `setProductCategories(...)` replace the staged-variant insert block with:

```tsx
            const plan = planVariantSave(variants, grid, final.colors, gridSizes, final.price, final.compareAt);
            const willHaveRows = plan.inserts.length + plan.updates.length + (variants.length - plan.deletes.length) > 0;
            if (!willHaveRows && (final.is_active ?? true)) {
              toast.error("Enter stock for at least one colour + size");
            }
            const { blocked } = await saveVariantGrid(final.slug, plan);
            if (blocked.length > 0) {
              toast.warning(`${blocked.length} variant(s) were already sold, so they were set to 0 instead of removed`);
            }
            await loadVariants();
```
Also move the `!willHaveRows` check *before* `onSave(final)` so nothing is written, returning early with `setSaving(false)`.

Remove the `STOCK` `<Field>` and change the price grid to `sm:grid-cols-2`. Replace the `AVAILABLE SIZES` field with:

```tsx
        <Field label="STOCK BY COLOUR × SIZE">
          {!p.categoryId ? (
            <p className="text-mono text-[11px] text-muted-foreground">Select a category first.</p>
          ) : (
            <>
              {sizesForCategory.length === 0 && (
                <p className="text-mono text-[11px] text-muted-foreground mb-2">
                  No sizes for this category, so stock is tracked as ONE SIZE. Add sizes in <Link to="/admin/sizes" className="text-primary hover:underline">Admin → Sizes</Link>.
                </p>
              )}
              <StockGrid
                colors={p.colors.filter((c) => c.name.trim())}
                sizes={gridSizes}
                grid={grid}
                onChange={setGrid}
                outside={planVariantSave(variants, grid, p.colors.filter((c) => c.name.trim()), gridSizes, p.price).outside}
                onOutsideStock={async (v, n) => { await supabase.from("product_variants").update({ stock: n }).eq("id", v.id!); loadVariants(); }}
                onOutsideDelete={async (v) => {
                  if (!confirm("Delete this variant?")) return;
                  const { blocked } = await saveVariantGrid(p.slug, { inserts: [], updates: [], deletes: [v], outside: [] });
                  if (blocked.length) toast.warning("Already sold — set to 0 instead");
                  loadVariants();
                }}
              />
            </>
          )}
        </Field>
```
Move it below the COLORS field (so colours are entered first) and relabel COLORS to `COLORS (each colour gets its own row in the stock grid)`. Delete the VARIANTS section, `VariantModal`, the `Variant` export, and now-unused imports (`Size` stays for `sizesForCategory`). Default `sizes: []`, `stock: 0` in the new-product initial state.

Imports to add:
```tsx
import { StockGrid } from "@/components/admin/StockGrid";
import { ONE_SIZE, gridFromVariants, listVariants, planVariantSave, saveVariantGrid, type GridState, type GridVariant } from "@/lib/variantGrid";
```

- [ ] **Step 4: Check nothing else imports `Variant` from this route**

Run: `grep -rn "admin.products.new\"" W/src | grep -v routeTree`
Expected: only `admin.products.$slug.tsx` importing `ProductForm`.

- [ ] **Step 5: Build**

Run: `cd W && npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 6: Commit**

```bash
git -C studio-deny add src/lib/variantGrid.ts src/components/admin/StockGrid.tsx src/routes/admin.products.new.tsx
git -C studio-deny commit -m "feat(admin): colour x size stock grid replaces single stock + sizes"
```

---

### Task 4: Website admin list — Delete + NEEDS SIZE COUNTS; checkout stock check

**Files:**
- Modify: `W/src/lib/productsStore.ts:150-156` (`deleteProduct`), add `getVariantCounts`
- Modify: `W/src/routes/admin.products.index.tsx`
- Modify: `W/src/routes/admin.inventory.tsx:73` (legacy row label)
- Modify: `W/src/routes/checkout.tsx` (`onSubmit`, before both `openRazorpay` calls)

**Interfaces:**
- Consumes: `admin_delete_product`, `check_cart_stock` (Task 2).
- Produces: `deleteProduct(slug): Promise<void>` (throws `Error("Sold N times — hide it instead")`); `getVariantStockTotals()` unchanged — a slug missing from it means no variants.

- [ ] **Step 1: `productsStore.ts`**

```ts
// Permanent delete — the DB refuses products that were ever billed or ordered.
export async function deleteProduct(slug: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_product" as any, { p_slug: slug });
  if (error) {
    const sold = /PRODUCT_SOLD:(\d+)/.exec(error.message);
    if (sold) throw new Error(`Sold ${sold[1]} time(s) — hide it instead`);
    throw new Error(error.message);
  }
}
```

- [ ] **Step 2: `admin.products.index.tsx`** — import `deleteProduct`, `Trash2`; add handler + button + badge:

```tsx
  const remove = async (p: Product) => {
    if (!confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.slug);
      toast.success("Product deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
```
Button after the eye toggle:
```tsx
                    <button onClick={() => remove(p)} title="Delete permanently"
                      className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-red-500 hover:text-red-500">
                      <Trash2 className="size-3" />
                    </button>
```
In the STATUS cell, before the stock badge:
```tsx
                    {stockTotals[p.slug] === undefined && (
                      <span className="text-mono text-[10px] tracking-widest px-2 py-1 font-semibold bg-amber-100 text-amber-800">NEEDS SIZE COUNTS</span>
                    )}
```

- [ ] **Step 3: `admin.inventory.tsx:73`** — change the legacy row `label: "—"` to `label: "NEEDS SIZE COUNTS — edit product"` and make its stock read-only (render the number instead of the input when `!r.variantId`), so legacy single-number stock can no longer be edited around the grid.

- [ ] **Step 4: `checkout.tsx`** — add helper above `onSubmit` and call it right after `setPaying(true)`:

```tsx
  const stockProblem = async (): Promise<string | null> => {
    const lines = items.filter((i) => i.variantId).map((i) => ({ variant_id: i.variantId, qty: i.qty }));
    if (lines.length === 0) return null;
    const { data, error } = await supabase.rpc("check_cart_stock" as any, { p_items: lines });
    if (error) return null; // never block payment on a check failure; the DB trigger still records it
    const short = (data ?? []) as { size: string | null; color: string | null; available: number }[];
    if (short.length === 0) return null;
    return short.map((s) => `Only ${s.available} left in ${[s.color, s.size].filter(Boolean).join(" / ")}`).join(". ");
  };
```
```tsx
    const problem = await stockProblem();
    if (problem) { setPaying(false); return toast.error(problem); }
```
(Import `supabase` from `@/lib/supabase` if not already imported.)

- [ ] **Step 5: Build + lint**

Run: `cd W && npm run build && npx eslint src/routes/admin.products.index.tsx src/routes/checkout.tsx src/lib/productsStore.ts src/lib/variantGrid.ts src/components/admin/StockGrid.tsx`
Expected: build OK, no new lint errors.

- [ ] **Step 6: Commit**

```bash
git -C studio-deny add src/lib/productsStore.ts src/routes/admin.products.index.tsx src/routes/admin.inventory.tsx src/routes/checkout.tsx
git -C studio-deny commit -m "feat(admin): delete product, needs-size-counts flag, pre-payment stock check"
```

---

### Task 5: Customer GSTIN migration (billing DB)

**Files:**
- Create: `B/db/migrations/0009_customer_gstin.sql`

**Interfaces:**
- Produces: `pos_customers.gstin`, `pos_bills.customer_gstin`; `pos_checkout(..., p_custom_tax_rate, p_tax_amount, p_customer_gstin text default null)`.

- [ ] **Step 1: Write the migration** — copy `pos_checkout` verbatim from `0008_checkout_accepts_legacy_clients.sql:17-140`, then apply exactly these changes:

```sql
-- db/migrations/0009_customer_gstin.sql
-- Optional customer GSTIN (B2B bills). Saved on the customer for reuse and
-- copied onto the bill so old invoices never change.
begin;

alter table public.pos_customers add column if not exists gstin text
  check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');
alter table public.pos_bills add column if not exists customer_gstin text
  check (customer_gstin is null or customer_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');

drop function if exists public.pos_checkout(jsonb, uuid, uuid, numeric, text, numeric, jsonb, text, numeric, numeric);

create or replace function public.pos_checkout(
  p_items jsonb,
  p_customer_id uuid,
  p_staff_id uuid,
  p_discount numeric,
  p_discount_reason text,
  p_shipping_fee numeric,
  p_payments jsonb,
  p_notes text,
  p_custom_tax_rate numeric default null,
  p_tax_amount numeric default null,
  p_customer_gstin text default null
)
-- … body identical to 0008 except:
--   the pos_bills insert column list gains customer_gstin and values gain nullif(upper(trim(p_customer_gstin)), '')
--   the final customer update becomes:
  if p_customer_id is not null then
    update public.pos_customers
    set orders_count = orders_count + 1,
        total_spend = total_spend + v_grand_total,
        gstin = coalesce(nullif(upper(trim(p_customer_gstin)), ''), gstin)
    where id = p_customer_id;
  end if;
commit;
```
(The engineer writes out the full function body — no `…` in the real file.)

- [ ] **Step 2: Assert on a scratch DB**

```sql
update pos_customers set gstin = 'BAD' where false; -- compiles
select 'x' where '37AABCU9603R1ZM' ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'; -- 1 row
insert into pos_customers (name, phone, gstin) values ('t','000','BAD'); -- expect check violation
```

- [ ] **Step 3: Commit**

```bash
git -C studio-deny-billing-software add db/migrations/0009_customer_gstin.sql
git -C studio-deny-billing-software commit -m "feat(db): customer GSTIN on customers and bills"
```

---

### Task 6: Billing — real variants only, colour → size picker, product creation via website

**Files:**
- Modify: `B/src/types/index.ts` (`Product.needsSizeCounts?: boolean`)
- Modify: `B/src/api/pos.ts:46-80` (`mapProduct`)
- Modify: `B/src/services/store.ts:197-209` (`createOrder` item mapping)
- Modify: `B/src/pages/billing/PosBillingPage.tsx` (tap handler ~231-238, grid card 742-795, modal 1458-1510)
- Modify: `B/src/pages/products/ProductsPage.tsx`, `B/src/components/common/QuickNewModal.tsx` (create-product → website link)
- Create: `B/src/constants/website.ts`

**Interfaces:**
- Produces: `Product.variants` contains only real `product_variants`; `Product.needsSizeCounts`; `WEBSITE_ADMIN_NEW_PRODUCT_URL`.

- [ ] **Step 1: `mapProduct`** — replace the synthetic fallback:

```ts
  const ownVariants = variants.filter((v) => v.product_id === p.slug);
  const mappedVariants: ProductVariant[] = ownVariants.map(mapVariant);
```
…and in the returned object: `totalStock: ownVariants.reduce((s, v) => s + v.stock, 0),` and `needsSizeCounts: ownVariants.length === 0,`.
Also in `createProduct` remove nothing (it becomes unused; delete it and `store.addProduct` in Step 5).

- [ ] **Step 2: `store.createOrder`** — every cart item now has a real variant:

```ts
    const items = orderData.items.map((item) => ({
      variantId: item.variantId,
      productSlug: item.productId,
      productName: item.name,
      size: item.size || null,
      color: item.color || null,
      qty: item.quantity,
      unitPrice: item.unitPrice,
      itemDiscount: item.itemDiscount || 0,
    }));
```

- [ ] **Step 3: POS tap + picker** in `PosBillingPage.tsx`

Add state next to `activeVariantProduct`: `const [pickerColor, setPickerColor] = useState<string | null>(null);`

Tap handler:
```tsx
  // Always ask colour/size, except a single ONE SIZE row.
  const handleProductTap = (product: Product) => {
    if (product.needsSizeCounts) {
      store.addToast('Size counts missing', 'Add stock per colour and size in the website admin before billing this product.', 'warning');
      return;
    }
    if (product.variants.length === 1 && product.variants[0].size === 'ONE SIZE') {
      handleAddVariantToCart(product, product.variants[0]);
      return;
    }
    const colors = [...new Set(product.variants.map((v) => v.color))];
    setPickerColor(colors.length === 1 ? colors[0] : null);
    setActiveVariantProduct(product);
  };
```
(Keep the existing function name used by the grid `onClick`.)

Card: replace the `{prod.variants.length} sizes` chip text with `prod.needsSizeCounts ? 'NEEDS SIZE COUNTS' : \`${prod.variants.length} options\``, and only render the quick-tap chips when `new Set(prod.variants.map((v) => v.color)).size === 1 && prod.variants.length > 1`.

Modal body: before the size grid insert a colour step, and filter sizes by colour:
```tsx
            {(() => {
              const colors = [...new Set(activeVariantProduct.variants.map((v) => v.color))];
              if (colors.length <= 1) return null;
              return (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#4A4844] block mb-2 font-bold">1. SELECT COLOUR:</span>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button key={c || 'none'} onClick={() => setPickerColor(c)}
                        className={`px-3 py-2 border text-xs font-bold ${pickerColor === c ? 'bg-[#111111] text-[#E2E2E4] border-[#111111]' : 'border-[rgba(0,0,0,0.18)] hover:border-[#111111]'}`}>
                        {c || 'NO COLOUR'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
```
Change the size grid source to `activeVariantProduct.variants.filter((v) => pickerColor === null ? new Set(activeVariantProduct.variants.map((x) => x.color)).size <= 1 : v.color === pickerColor)` and its heading to `SELECT SIZE:`. Change modal title to `CHOOSE COLOUR & SIZE — ${name}`. On close also `setPickerColor(null)`.

- [ ] **Step 4: Website link constant** `B/src/constants/website.ts`:

```ts
// Products (and their colour x size stock) are created only in the website
// admin, so the billing app links there instead of keeping its own form.
export const WEBSITE_ADMIN_NEW_PRODUCT_URL =
  (import.meta.env.VITE_WEBSITE_URL || 'https://studiodeny.com') + '/admin/products/new';
```

- [ ] **Step 5: Replace billing product-create forms** — in `ProductsPage.tsx` replace the "new product" button's `onClick` (opening the modal) with `window.open(WEBSITE_ADMIN_NEW_PRODUCT_URL, '_blank')`, delete `handleCreate`, the modal JSX, and its now-unused state. In `QuickNewModal.tsx` replace the product form action with the same `window.open` + `handleClose()`. Delete `store.addProduct` and `posApi.createProduct`.

- [ ] **Step 6: Build**

Run: `cd B && npm run build`
Expected: succeeds; no references to `addProduct`/`createProduct` remain (`grep -rn "addProduct\|createProduct" B/src` → none).

- [ ] **Step 7: Commit**

```bash
git -C studio-deny-billing-software add -A src
git -C studio-deny-billing-software commit -m "feat(pos): always pick colour + size; products created in website admin"
```

---

### Task 7: Billing — customer GST toggle, receipts, customer page

**Files:**
- Modify: `B/src/types/supabase.ts` (`DbPosCustomer.gstin: string | null`, `DbPosBill.customer_gstin: string | null`)
- Modify: `B/src/types/index.ts` (`Customer.gstin?: string`, `Order.customerGstin?: string`)
- Create: `B/src/utils/gstin.ts`
- Modify: `B/src/api/pos.ts` (`mapCustomer`, `updateCustomer`, `mapBillToOrder`, `checkout`)
- Modify: `B/src/services/store.ts` (`createOrder` passes `customerGstin`; `updateCustomer` type)
- Modify: `B/src/pages/billing/PosBillingPage.tsx` (customer block, submit, receipt preview, both print payloads)
- Modify: `B/src/utils/receiptPrinter.ts` (`PrintableReceiptData.customerGstin?`, thermal ~364, invoice ~705)
- Modify: `B/src/pages/bills/BillDetailPage.tsx` (~57, ~200, ~321)
- Modify: `B/src/pages/customers/CustomerDetailPage.tsx` (edit + display)

**Interfaces:**
- Produces: `isValidGstin(s: string): boolean`, `normalizeGstin(s: string): string`; `checkout({..., customerGstin: string | null})`.

- [ ] **Step 1: `gstin.ts`**

```ts
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const normalizeGstin = (s: string) => s.replace(/\s+/g, '').toUpperCase();
export const isValidGstin = (s: string) => GSTIN_RE.test(normalizeGstin(s));
```

- [ ] **Step 2: API + types** — `mapCustomer` adds `gstin: c.gstin || undefined`; `updateCustomer` accepts `gstin?: string` and sends `gstin: updates.gstin === undefined ? undefined : (updates.gstin ? normalizeGstin(updates.gstin) : null)`; `mapBillToOrder` adds `customerGstin: bill.customer_gstin || undefined`; `checkout` input gains `customerGstin: string | null` sent as `p_customer_gstin: input.customerGstin`. `store.createOrder` passes `customerGstin: orderData.customerGstin ? normalizeGstin(orderData.customerGstin) : null`.

- [ ] **Step 3: POS customer block** — state:
```tsx
  const [gstEnabled, setGstEnabled] = useState(false);
  const [customerGstin, setCustomerGstin] = useState('');
  useEffect(() => {
    setCustomerGstin(!isGuest && selectedCustomer?.gstin ? selectedCustomer.gstin : '');
    setGstEnabled(!isGuest && !!selectedCustomer?.gstin);
  }, [selectedCustomerId, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps
```
UI after the guest inputs / customer `<select>`:
```tsx
            <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#4A4844] cursor-pointer">
              <input type="checkbox" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} />
              ADD CUSTOMER GST
            </label>
            {gstEnabled && (
              <input
                type="text" maxLength={15} placeholder="Customer GSTIN (15 chars)"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(normalizeGstin(e.target.value))}
                className={`w-full p-2 bg-[#D5D5D8] border text-xs font-mono uppercase focus:outline-none ${customerGstin && !isValidGstin(customerGstin) ? 'border-red-600' : 'border-[rgba(0,0,0,0.18)]'}`}
              />
            )}
```
Also reset both in `resetBill()`. In `handleCompletePayment`, before `setIsProcessingPayment(true)`:
```tsx
    if (gstEnabled && !isValidGstin(customerGstin)) {
      store.addToast('Invalid GSTIN', 'Enter a valid 15-character customer GSTIN, or turn off ADD CUSTOMER GST.', 'error');
      return;
    }
```
and add `customerGstin: gstEnabled ? customerGstin : undefined,` to the `store.createOrder({...})` payload.

- [ ] **Step 4: Show it** — add `customerGstin: orderToPrint.customerGstin` to both `printThermalReceipt` and `printTaxInvoice` payloads and `customerGstin: bill.customerGstin` in `BillDetailPage.handlePrint`. In the receipt preview (after PHONE row ~1580) and `BillDetailPage` ~200:
```tsx
                {receiptOrder.customerGstin && (
                  <div className="flex justify-between">
                    <span className="text-[#4A4844]">CUSTOMER GSTIN:</span>
                    <span className="font-semibold">{receiptOrder.customerGstin}</span>
                  </div>
                )}
```
(`bill.` instead of `receiptOrder.` on BillDetailPage; in its invoice view ~321 add `{bill.customerGstin && <div className="text-[#4A4844]">GSTIN: {bill.customerGstin}</div>}`.)
In `receiptPrinter.ts` add `customerGstin?: string;` to `PrintableReceiptData`; thermal after the PHONE block:
```ts
            ${data.customerGstin ? `
            <div class="meta-line flex justify-between">
              <span class="label">CUSTOMER GSTIN:</span>
              <span>${data.customerGstin}</span>
            </div>` : ''}
```
invoice after the Email line (~705): `${data.customerGstin ? `<div class="card-detail">GSTIN: ${data.customerGstin}</div>` : ''}`.

- [ ] **Step 5: Customer page** — add `editGstin` state, set in `startEditing` from `customer.gstin ?? ''`, an input in the edit form (same classes as City) labelled `GSTIN (optional)`, validate on save (`if (editGstin && !isValidGstin(editGstin)) { store.addToast('Invalid GSTIN', '15-character GSTIN required.', 'error'); return; }`), pass `gstin: editGstin` to `store.updateCustomer`, and show `GSTIN: {customer.gstin}` in the info row when present. Update `store.updateCustomer`'s `updates` type to include `gstin?: string`.

- [ ] **Step 6: Build**

Run: `cd B && npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git -C studio-deny-billing-software add -A src
git -C studio-deny-billing-software commit -m "feat(pos): optional customer GSTIN on bills, receipts and invoices"
```

---

### Task 8: Pure-white price tags

**Files:**
- Modify: `B/src/pages/tags/PriceTagGeneratorPage.tsx` (only the live-preview tags from the `LIVE RENDER OF SELECTED TAG FORMAT` block, ~line 670, and the print container, ~850 to end)

- [ ] **Step 1: Replace tag backgrounds** inside those two regions only: `bg-[#D5D5D8]` → `bg-[#FFFFFF]`, `bg-[#E2E2E4]` → `bg-[#FFFFFF]`, `background: '#E2E2E4'` / `background: '#D5D5D8'` → `background: '#FFFFFF'`. Leave `bg-neutral-100` (the preview stage), black bands (`bg-[#111111]`) and their `text-[#E2E2E4]` unchanged. Do not touch lines before ~670 (controls/table).

Run to verify: `grep -n "D5D5D8\|E2E2E4" B/src/pages/tags/PriceTagGeneratorPage.tsx` — remaining hits must be only in the controls region (< ~670) or `text-[#E2E2E4]` on black.

- [ ] **Step 2: Build + commit**

```bash
cd studio-deny-billing-software && npm run build
git add src/pages/tags/PriceTagGeneratorPage.tsx
git commit -m "style(tags): pure white price tag backgrounds"
```

---

### Task 9: Final verification

- [ ] `npm run build` in both repos — both pass.
- [ ] `grep -rn "variants.length === 1" B/src/pages/billing` — no leftover auto-add-on-single-variant logic.
- [ ] Hand the owner the apply order: website `20261002000001` → `…0002` → `…0003`, then billing `0009`.
- [ ] Manual checklist (owner, after applying): add product with 2 colours × 3 sizes in admin → POS asks colour then size, sells the right row; ONE SIZE product adds directly; flagged product blocked in POS + badge in admin; online order reduces stock, cancel restores once; unsold test product deletes, billed product refuses; tags print white; GSTIN appears on receipt + tax invoice + bill detail and pre-fills next time for that customer.
