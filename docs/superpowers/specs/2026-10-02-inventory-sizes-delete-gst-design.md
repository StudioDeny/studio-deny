# Per-size inventory, product delete, white price tags, customer GST — Design

Date: 2026-10-02
Repos: `studio-deny` (website + shared Supabase DB), `studio-deny-billing-software` (POS)

## Goal

One true stock count per product size, shared by the website storefront, the website
admin and the billing software, with no drift between them. Plus three smaller asks:
delete test products from the website admin, pure-white price tags, and an optional
customer GSTIN on bills.

## Decisions (agreed with owner)

| Topic | Decision |
|---|---|
| Delete product | Permanent delete. Blocked if the product appears on any POS bill or online order. |
| Existing products with sizes but one stock number | Admin is asked for counts per size; nothing is guessed or split. |
| Products with no sizes | Get a single `ONE SIZE` variant; POS adds them without a picker. |
| Online orders | Reduce per-size stock on payment; restore on cancel / return received. |
| Price tag white | Tag designs only (preview + printed/exported tag). |
| Customer GSTIN | Saved on the customer profile and copied onto the bill; shown on receipt, tax invoice and bill detail. |

## 1. Inventory model — `product_variants` is the only stock source

### Current state (the bug)
A product tracks stock either as `products.stock` + `products.sizes[]` (no variants) or as
per-size `product_variants` rows. For the first kind, the POS builds a single synthetic
variant with empty size (`studio-deny-billing-software/src/api/pos.ts` `mapProduct`), so no
size is asked and sales cannot be attributed to a size.

### New rules
- Every sellable product has ≥ 1 `product_variants` row. Size label comes from the
  product's category size list (`sizes` table, Admin → Sizes), or the literal `ONE SIZE`
  when the category has no sizes.
- `products.stock` and `products.sizes` become derived values, maintained by a trigger on
  `product_variants` (INSERT / UPDATE OF stock, size / DELETE):
  - `products.stock = coalesce(sum(variant.stock), 0)`
  - `products.sizes = distinct variant sizes, ordered by the category size position, then label`
  Legacy readers (`seo.ts`, `effectiveStock`, storefront fallbacks) stay correct without edits.

### Website migration (`studio-deny/supabase/migrations/20261002000001_variant_stock_source_of_truth.sql`)
1. Create the derive trigger above.
2. Backfill: for every product with zero variants **and** empty/null `sizes`, insert one
   variant `{size: 'ONE SIZE', stock: products.stock, price: products.price,
   compare_price: products.compare_at}`.
3. Products with zero variants but non-empty `sizes` are left untouched — they are the
   "needs size counts" set. No stock is split or invented.

### Website admin product form (`src/routes/admin.products.new.tsx`)
- Remove the `STOCK` input and the `AVAILABLE SIZES` chip picker.
- Add a **STOCK BY COLOUR × SIZE** grid. Rows = the product's colours (`products.colors`;
  a single "no colour" row when it has none). Columns = category sizes (from
  `listSizesForCategory`), or a single `ONE SIZE` column when the category has no sizes.
  Each cell is a numeric count. Each colour can stock a different subset of sizes: a blank
  cell means "this colour is not made in this size" (no variant row); `0` means "made, but
  sold out" (variant row with stock 0).
- Saving reconciles `product_variants` for the product, matched on (color, size):
  filled cell → insert/update stock; cell cleared that had a variant → delete that variant
  (blocked with a message if the variant appears on any bill/order; set it to 0 instead).
  `color_hex` is copied from the product colour. Variant price defaults to the product price.
- Variants whose (color, size) is not in the grid (e.g. a size later removed from the
  category) are listed under the grid as "other variants" with stock edit + delete, so
  nothing is hidden.
- The old VARIANTS table + modal is removed; the grid replaces it.
- Product cannot be saved as active with zero variant rows (validation message).

### "Needs size counts" flag
`needsSizeCounts(product, variantTotals) = no variants for this product`. Shown as a
`NEEDS SIZE COUNTS` badge in the website admin product list and inventory page.

## 2. Billing software — always ask for size

- `mapProduct` (`src/api/pos.ts`): no synthetic variant any more. Products with no
  variants get `variants: []` and a `needsSizeCounts: true` flag.
- `PosBillingPage.tsx` product tap:
  - `needsSizeCounts` → toast "Add size counts in the website admin before billing this
    product"; product card shows the flag and is not addable.
  - exactly one variant, size `ONE SIZE` → add directly.
  - otherwise → always open the picker (even with a single sized variant). If the product
    has more than one colour, the picker first shows colour swatches, then the sizes
    available in that colour; with one colour it shows sizes directly. Each size shows its
    stock; sold-out sizes disabled. Inline quick-tap chips on product cards are shown only
    for single-colour products.
- `pos_checkout` already decrements `product_variants.stock` for the chosen variant;
  no change to its stock logic.

## 3. Online orders move stock

### Website migration (`20261002000002_online_order_stock.sql`)
- `pos_inventory_logs.reason` check constraint extended with `ONLINE_SALE`,
  `ONLINE_RESTOCK`.
- `orders.stock_restored_at timestamptz` added.
- Trigger `AFTER INSERT ON order_items`: if `variant_id` is not null, set
  `stock = greatest(0, stock - qty)` on that variant and write a `pos_inventory_logs` row
  (reason `ONLINE_SALE`). If stock was lower than `qty`, the log note says `OVERSOLD`
  (payment is already captured, so the insert must not fail). Replacement orders insert
  `order_items` too and are therefore decremented — correct, a new item ships.
- Trigger `AFTER UPDATE ON orders`: when `status` becomes `CANCELLED`, or `return_status`
  becomes `RECEIVED`, and `stock_restored_at is null` → add each `order_items.qty` back to
  its variant, log `ONLINE_RESTOCK`, set `stock_restored_at = now()`.
- Both functions `security definer`, `set search_path = public`.

### Pre-payment check
RPC `check_cart_stock(p_items jsonb)` (`[{variant_id, qty}]`) returns the rows whose stock
is lower than the requested qty. `src/routes/checkout.tsx` calls it before opening
Razorpay (both prepaid and COD-advance paths) and shows "Only N left in <size>" instead of
taking payment. (`razorpay-create-order` only receives an amount, so the check lives in the
DB; no edge-function redeploy needed.)

### Known limitation
A signed-in customer can insert extra `order_items` rows on their own paid order (existing
RLS), which would now also reduce stock. Price-integrity checks still apply; this is
recorded, not fixed, here.

### Billing-software product creation
The billing app's own "new product" forms (`ProductsPage.tsx`, `QuickNewModal.tsx`) create
products with invented S/M/L/XL stock splits that are never saved as variants. They are
replaced by a link that opens the website admin's new-product page, so products and their
colour × size stock are only ever created in one place.

## 4. Delete product (website admin)

- Website migration (`20261002000003_admin_delete_product.sql`): RPC
  `admin_delete_product(p_slug text) returns void`, `security definer`, requires
  `is_admin_or_staff()`.
  - Counts `pos_bill_items` and `order_items` rows with `product_slug = p_slug`. If > 0 →
    `raise exception 'PRODUCT_SOLD:%', count`.
  - Otherwise, in one transaction, deletes the product's `product_variants` (cart rows
    cascade), `product_categories` rows, wishlist rows, other rows that reference the slug
    (found during implementation by checking FKs), then the `products` row.
- `src/lib/productsStore.ts`: `deleteProduct` (currently an unused soft-hide; hiding is
  done by `setProductActive`) is rewritten to call the RPC, mapping `PRODUCT_SOLD:n` to
  "Sold n times — hide it instead".
- `src/routes/admin.products.index.tsx`: trash button per row next to the eye toggle,
  with `confirm()` naming the product, then refresh + toast.
- Cloudinary images are not deleted.

## 5. Price tags pure white (billing software)

`src/pages/tags/PriceTagGeneratorPage.tsx`: in the three tag designs (preview markup and
the print/export styles), backgrounds `#D5D5D8` / `#E2E2E4` become `#FFFFFF`. Controls,
panels and the table on that page are unchanged. Black bands on tags stay black.

## 6. Customer GSTIN (billing software)

### Billing migration (`db/migrations/0009_customer_gstin.sql`)
- `pos_customers.gstin text`, `pos_bills.customer_gstin text`, both with check
  `~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'` when not null.
- `pos_checkout` recreated from its latest definition (0008) with one extra trailing
  parameter `p_customer_gstin text default null`, stored on the bill; when a registered
  customer is billed and the GSTIN is given, it is also saved to `pos_customers.gstin`.

### UI
- `PosBillingPage.tsx` customer block: `ADD CUSTOMER GST` toggle, default off. On → GSTIN
  input (uppercased, validated live with the same regex), pre-filled from the selected
  customer's saved GSTIN. Off → nothing sent. Invalid GSTIN blocks checkout with a message.
- Types/API: `Customer.gstin`, bill `customerGstin` through `src/api/pos.ts`
  (checkout payload, bill fetch mapping).
- Shown as `Customer GSTIN: …` under customer details on: the on-screen receipt in
  `PosBillingPage.tsx`, `utils/receiptPrinter.ts` (thermal + full invoice),
  `pages/bills/BillDetailPage.tsx` (both views). Hidden when absent.
- Customer detail page shows and lets staff edit the saved GSTIN.

## Rollout

1. Apply website migrations 20261002000001–3 and billing migration 0009 to Supabase
   (owner runs them; nothing is run against the live DB by the implementer).
2. Deploy both frontends.
3. In website admin, filter `NEEDS SIZE COUNTS` and enter per-size counts.

## Verification (no test framework in either repo)

- `npm run build` in both repos (type-check + build), `npm run lint`.
- Each migration executed inside `begin; … rollback;` against a scratch/branch database,
  with SQL assertions: derive trigger sums correctly; backfill creates ONE SIZE rows only
  for size-less products; order_items insert decrements and logs; cancel restores once;
  delete RPC blocks sold products and removes unsold ones; GSTIN check rejects bad values.
- Manual checklist: bill a sized product (picker opens, right size decremented), bill a
  ONE SIZE product (no picker), flagged product blocked, online order decrements, cancel
  restores, delete unsold test product, delete blocked for billed product, tags print
  white, GSTIN shows on receipt / invoice and pre-fills next time.

## Out of scope

Cloudinary asset cleanup on delete; reworking colour variants; stock reservations during
checkout (the pre-payment check plus oversell logging is the guard).
