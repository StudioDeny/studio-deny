# 03 — Admin Panel Reference

Every route under `/admin`, what it reads, what an admin can do on it, and the non-obvious business logic behind each. All 42 `admin.*.tsx` files are covered — this is exhaustive, not a summary. All admin pages are plain client components: `useEffect` fetch on mount → local state → optimistic mutate + Supabase write → `toast`. No SSR loaders, no React Query — despite `@tanstack/react-query` being a dependency (see 01-ARCHITECTURE.md), the admin panel doesn't use it.

---

## 1. `admin.tsx` — layout shell

**Auth/role gating**: `useAuth()` on mount — if `!user`, redirect to `/login`; if `user.role !== "admin"`, redirect to `/account`. While `loading`, shows a centered "LOADING…" placeholder; if the guard fails, renders `null` (a blank flash before the redirect effect fires — not a broken page, just a half-beat of nothing). `user.role` is only ever `"user"` or `"admin"` client-side — the DB's `staff` role is coerced up to `"admin"` by `AuthContext.resolveRole()`, so staff get identical, full access to everything in this document.

**Sidebar — `coreLinks`** (in order): DASHBOARD (`/admin`, exact-match) → ANALYTICS → PRODUCTS → INVENTORY → CATALOG → SIZES → ORDERS (carries a live unseen-order-count badge) → INVOICES → INVOICE TEMPLATE → REFUNDS → RETURNS → CUSTOMERS → LOYALTY → EXPORT → SETTINGS.

**Sidebar — `cmsLinks`** (under a "CMS" divider): ANNOUNCEMENTS → SECTIONS → MEGA MENU → FOOTER LINKS → FAQ → TESTIMONIALS → INFLUENCERS → LOOK BOOK → COMMUNITY → HEADINGS → PRELOADER → POPUP → MEDIA → SEO → WHATSAPP → USERS.

**Notification bell**: polls `listOrders()` (the **entire** orders table, refetched fresh — not incremental) every 5 seconds via `setInterval`, plus a `window "storage"` listener so a second open tab marking-seen also updates this one. "Unseen" = `order.createdAt > getLastSeen()`, and `getLastSeen()`/`markSeen()` (`src/lib/notifications.ts`) are pure `localStorage` (key `sd_admin_last_seen`) — **per-browser, not per-admin-user, not server-synced**. First-ever visit auto-seeds "last seen" to now so pre-existing orders don't all show as unseen on day one. The dropdown is a `position: fixed` overlay (not nested in the sidebar's own scroll container, to avoid clipping), positioned via `getBoundingClientRect()` of whichever bell (mobile top bar or desktop sidebar) was clicked. Shows up to 12 unseen orders, each linking to `/admin/orders`; "MARK ALL SEEN" clears the badge.

**Mobile vs desktop**: desktop shows a persistent 220px-fixed-width left sidebar with its own scroll; mobile shows a slim sticky top bar (logo + bell + hamburger) — **no storefront navbar renders on any admin route at all** (handled in `__root.tsx`, see 01-ARCHITECTURE.md §3). The hamburger opens a full-screen overlay nav listing every core + CMS link, closing on any link tap.

## 2. Admin auth model — how someone actually becomes an admin

1. Every signup auto-creates a `user_roles` row defaulting to `role: 'customer'` (via the `handle_new_user()` trigger, see 02-DATABASE-SCHEMA.md §3).
2. The client resolves role via `supabase.rpc("get_my_role")` — a `SECURITY DEFINER` function that bypasses RLS.
3. **There is a real self-service UI for role changes**: `/admin/users` lists every `profiles` row joined to `user_roles`, with a `<select>` per user (`admin | staff | customer`) that writes directly to `user_roles`.
4. **The bootstrapping problem**: reaching `/admin/users` requires already being an admin (per `admin.tsx`'s gate) — so **the very first admin account cannot be created through the UI**. It must be set directly in the Supabase SQL Editor:
   ```sql
   -- if the user already signed up (has a default 'customer' row):
   update user_roles set role = 'admin' where user_id = '<their auth.users uuid>';
   -- if not:
   insert into user_roles (user_id, role) values ('<uuid>', 'admin');
   ```
   After that one manual step, every further promotion/demotion (including granting `staff`, which behaves identically to `admin`) can go entirely through `/admin/users`.
5. **No confirmation dialog on role changes** — flipping someone to `admin` (or demoting yourself) is instant, with no "are you sure," and no audit trail of who changed what. An admin can demote their own account and lock themselves out of the panel with nothing preventing it except redoing the SQL step above.

## 3. Cross-cutting UI conventions

Knowing these up front makes every route below faster to read, since almost none of them deviate from these patterns.

- **Reordering is up/down chevrons, not drag-and-drop** — everywhere **except** Mega Menu (§5.3), which is the sole page using `framer-motion`'s `<Reorder.Group>`/`<Reorder.Item>` with a real drag handle. Everywhere else: swap array positions, write `position: i` for every row back to Supabase via `Promise.all`, first/last item's respective button disabled.
- **Singleton-row settings, but split across three different persistence mechanisms** — and this split is a real inconsistency, not a deliberate design: `brand_settings`, `theme_settings`, and `settings` (COD) are genuine Supabase tables with exactly one row, fetched via `.limit(1).single()` or `.maybeSingle()`. `LoyaltySettings`/`InvoiceTemplate`/shop filter colors and `Brand`s (in Catalog) are **`localStorage`-only** (`sd_settings_v1`, `sd_brands_v1`) — meaning they don't sync across browsers or between admins at all. If recreating this from scratch, putting all of these in Supabase from the start would remove a real, live inconsistency.
- **Two coexisting confirm-dialog patterns**: native `window.confirm(...)` for most destructive deletes (categories, brands, sizes, announcements, FAQ, testimonials, influencer picks, lookbook slides, community photos, website sections, mega-menu tabs, media assets, variants); the shared `<ConfirmDialog>` component (`src/components/ui/confirm-dialog.tsx`, wraps Radix `AlertDialog`) reserved for the two money-sensitive actions — **refund** and **send-replacement** — both on Orders/Refunds/Returns.
- **Cloudinary upload pattern**: `uploadToCloudinary`/`uploadVideoToCloudinary` (raw XHR, real progress via `xhr.upload.onprogress` since `fetch()` can't report upload progress reliably). The reusable `MediaField` component (image/video type toggle + URL-paste-or-file-upload toggle + live thumbnail) is used almost everywhere; a few older screens (`preloader_settings`' image field, `popup_promo`'s logo) use a bespoke inline `ImageField`/`LogoField` instead — minor duplication, not a bug. **Only `/admin/media` writes an upload into a persistent `media_assets` row** — every other `MediaField`/`ImageField`/`LogoField` upload across the rest of the CMS stores just the resulting URL on the owning row, with **no** corresponding `media_assets` entry. This means `/admin/media`'s library is not a comprehensive index of every image on the site — only of what was uploaded through that page specifically.
- **Table + action-button list pages** all share one shape: `text-display text-4xl md:text-5xl` title → filter chips/search → `border border-border bg-surface overflow-x-auto` table, `text-mono text-[10px] tracking-widest` header row, right-aligned square icon-button "ACTIONS" column.
- **Status pill convention**: `text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold`, semantic color pairs — emerald=active/live/in-stock/paid, amber=low-stock/pending, red=hidden/sold-out/failed, muted=inactive/draft, purple=admin/refunded, blue=staff/placed.
- Most pages inject their own scoped `<style>{...}</style>` block defining a local `.inp` class rather than importing one shared input component — copy-pasted per file, a minor duplication rather than a functional issue.

## 4. Core commerce routes

### `/admin` — Dashboard (`admin.index.tsx`)
Read-only KPIs: revenue/AOV (excludes `CANCELLED`/`REFUNDED`), distinct-email customer count, 8 most recent orders with a status-color badge. No mutations.

### `/admin/analytics` (`admin.analytics.tsx`)
Read-only: net revenue (gross − total refunded), top-5 products by revenue, a client-bucketed 7-day bar chart, low-stock/sold-out counts. **Uses `effectiveStock()`** (variant-aware, see 02-DATABASE-SCHEMA.md) rather than the raw `products.stock` column — this was the fix for the stale-badge bug documented there. All computation runs client-side over the *entire* orders table every load — no pagination or date-range picker, won't scale gracefully with a large order history.

### `/admin/products` (`admin.products.tsx`)
Pure layout passthrough (`<Outlet/>`) — no logic of its own, exists only so the three product sub-routes share a URL prefix.

### `/admin/products` list (`admin.products.index.tsx`)
Category tabs (with live counts) + text search over `listAllAdminProducts()` (includes inactive). Per row: Pencil → edit, Eye/EyeOff → `setProductActive()` (confirm only on *deactivate*, none on reactivate). Stock column/badge uses `effectiveStock()`. No pagination, no bulk actions.

### `/admin/products/new` + shared `ProductForm` (`admin.products.new.tsx`)
This file also exports `ProductForm`, reused unmodified by the edit route.

Fields: name, slug (auto-derived, **locked once editing** an existing product), category (via a one-level `CategoryPicker`), brand (from localStorage brands), badge enum, "Best Seller" checkbox, price/compare-at/stock, product image + hover image (each independently image-or-video), gallery (up to 8 items, each with its own media-type toggle **and** a layout choice — `standalone` (full width) vs `half`, which pairs with the next `half` item to render side-by-side, H&M-style — reordered via chevrons), available sizes (checkbox toggles from `listSizesForCategory`, **fallback-only**: once the product has any real `product_variants` rows, the storefront ignores this list entirely), description, material composition, care instructions. Below: a variants table (size/color/stock/price/SKU) with an add-variant modal.

**Non-obvious logic**:
- **New-product variant staging**: when creating a brand-new product, variants typed in the modal are held in local state (synthetic `tempId`) and inserted in one batch **after** the product itself saves. If that batch insert fails, the toast reads "Product saved, but variants failed" — the product now silently has zero variants until someone re-adds them manually.
- **Multi-size stamping**: the add-variant modal lets you multi-select several sizes at once (new-variant flow only) to create one row per size with identical color/stock/price/SKU in a single save. Editing an existing variant always locks to a single size.
- Deleting a variant on an unsaved product just drops it from local state; on a saved product it hits `product_variants` directly, independent of the "Save Product" button.

**Limitations**: gallery cap of 8 is client-enforced only (a toast, not a hard block); no SKU uniqueness validation beyond the DB's own `UNIQUE` constraint; the "available sizes" checkboxes silently do nothing once real variants exist (not hidden, just inert).

### `/admin/products/$slug` — Edit Product (`admin.products.$slug.tsx`)
Thin wrapper: `getStoredProduct(slug)` → the same `ProductForm`, slug field disabled, `onSave` → `upsertProduct()` → navigate back with a toast. Variants are loaded live from `product_variants` and refreshed after every variant CRUD op.

### `/admin/inventory` (`admin.inventory.tsx`)
See 02-DATABASE-SCHEMA.md and the earlier build notes in this session — one flattened row per variant (or one bare row per non-variant product), sorted lowest-stock-first, inline stock editing (saves on blur/Enter), category dropdown + search + ALL/LOW STOCK/OUT OF STOCK filter chips. No optimistic-lock handling if two admins edit the same row at once; no bulk "+N to all" adjustment.

### `/admin/catalog` (`admin.catalog.tsx`)
Two independent systems on one page: **Categories** (hierarchical, Supabase-backed, one level of nesting only) and **Brands** (flat, `localStorage`-only, `sd_brands_v1` — never syncs across browsers). Add/inline-rename/delete both; a category delete is a **soft delete** (`is_active = false`) — existing products keep their now-stale `category_id` FK, they just stop appearing in pickers. Renaming a category explicitly preserves its existing `parentId` (a code comment calls this out) so a rename never accidentally un-parents it.

### `/admin/sizes` (`admin.sizes.tsx`)
Per-category ordered size lists (`sizes` table), consumed by the product form and variant modal instead of free-text size entry. Duplicate labels rejected case-insensitively **within** a category (same label freely reusable across different categories). New size's `position` is computed **server-side** (query current max + 1) to avoid cross-tab collision — reorder itself still writes positions optimistically. No global uniqueness, no bulk copy-from-another-category helper.

### `/admin/orders` (`admin.orders.tsx`)
Subscribes to Supabase **Realtime** (`postgres_changes` on `public.orders`, any event) — this is what makes a Shiprocket webhook update show up on this page live, no manual refresh needed. Per row: status dropdown (`updateOrderStatus()` — a bare setter, no side effects); "CREATE SHIPMENT" button (shown only once `PACKED` with no AWB yet) → `createShipment()` → `shiprocket-sync` edge function; once shipped, that cell instead shows AWB + courier read-only. Refund button (hidden once already `REFUNDED`) → the shared `<ConfirmDialog>` → `refundOrder()`.

**Important interaction with 02-DATABASE-SCHEMA.md's order trigger**: manually picking `SHIPPED`/`DELIVERED` from the dropdown instead of using the dedicated buttons is exactly the path the `queue_order_lifecycle_notification()` DB trigger treats as "no real shipment exists" — it still queues the matching WhatsApp message and stamps the timestamp, but no actual Shiprocket action happens. There's no manual AWB/tracking-number entry field for anything shipped outside Shiprocket.

### `/admin/invoices` (`admin.invoices.tsx`)
Pure re-projection of orders as invoice rows. No create/delete — an invoice is 1:1 with an order, auto-created at order time (`invoiceNo` defaults to `"INV-" + order_number`).

### `/admin/invoice/$id` (`admin.invoice.$id.tsx`)
Edits invoice number, status, shipping, tax %, discount, freeform extra lines (label+amount), notes — every keystroke recomputes `tax`/`total` live client-side, nothing persists until SAVE. Order line items (products/sizes/qty) are **read-only** here. **Note**: this screen's status edit goes through `updateInvoice()`'s generic patch, not the same `updateOrderStatus()` call the Orders page uses — same column, same effect, but two separate code paths for one mutation.

### `/admin/invoice-template` (`admin.invoice-template.tsx`)
A **single shared template** (brand name, tagline, GSTIN, contact, address, accent color, terms, signatory, footer) — `localStorage` only (`sd_settings_v1.invoice`), not Supabase, same caveat as everywhere else this session flagged localStorage settings: **if the actual invoice/PDF rendering ever happens server-side, this template has zero effect there** — worth verifying directly against wherever invoices are actually generated before assuming this page controls production output.

### `/admin/refunds` (`admin.refunds.tsx`)
Three buckets from `listOrders()`: eligible, cancelled, refunded — refund action on the first two via the shared `<ConfirmDialog>`. **No cancel action exists on this page** — cancellation isn't reachable from anywhere in the admin panel at all; it's customer-initiated only (`cancelOrder()` in `lib/orders.ts`, called from the storefront).

### `/admin/returns` (`admin.returns.tsx`)
Buckets: ready-to-refund-or-replace (`RECEIVED`), in-progress-with-courier, replaced, refunded. "SEND REPLACEMENT" → `createReplacementOrder()` then immediately `createShipment()` on the new order — one click creates a ₹0 replacement and books its courier pickup. "REFUND" → shared `<ConfirmDialog>` → `refundOrder()`. Full mechanics in 05-SHIPPING-SHIPROCKET.md §8. **No admin-initiated "start a return" action** — `requestReturn()` is customer-only, same asymmetry as cancellation above. Nothing prevents both REFUND and SEND REPLACEMENT being clicked on the same row across two page loads (no server-side mutual-exclusion guard beyond the button being hidden after one succeeds and the page refreshing).

### `/admin/customers` (`admin.customers.tsx`)
Read-only, derived entirely from `listOrders()` grouped by email — order count, valid spend, loyalty points/tier (client-computed), last order date. **Does not cross-reference `profiles`/`user_roles` at all** — a "customer" here is just "an email that placed ≥1 order," so name/phone/account role are invisible here (contrast with `/admin/users`, which has profile data but zero order/spend context — the two pages were never unified into one real CRM view).

### `/admin/loyalty` (`admin.loyalty.tsx`)
Prefers live `loyalty_balances` data (enriched with `profiles` emails), falling back to a fully client-computed calculation from `listOrders()` + `localStorage` settings if `loyalty_balances` is empty — shows a "LIVE DATA" badge when the Supabase path is active. **This is the same dual-system mismatch documented in 02-DATABASE-SCHEMA.md's `loyalty_balances` entry** — before `20260812000005`, `loyalty_balances` was always empty (nothing had ever fed it), so this page would have always shown the client-computed fallback; now that the DB trigger populates it on delivered orders, this page can show genuinely different numbers than what `/rewards` (customer-facing, still 100% client-computed) shows for the same customer.

### `/admin/export` (`admin.export.tsx`)
Client-side-only CSV/JSON export across 16 named tables (row counts via `count: "exact", head: true`, full data fetched only on export click). Composite exports for Orders (+items), Products (+variants), Customers (+roles); "EXPORT EVERYTHING" bundles all 16 into one timestamped JSON backup. Hand-rolled CSV serializer, no library. **No `.range()` override on the fetch-all calls** — Supabase's default row cap (commonly 1000) is not explicitly raised, so a genuinely large table could silently export truncated with no warning. No date-range filtering anywhere.

### `/admin/settings` (`admin.settings.tsx`)
Five independent tabs, each its own load/save cycle — and each hitting a **different persistence layer**, which is the single most confusing thing about this page if you don't already know it:
| Tab | Storage |
|---|---|
| LOYALTY | `localStorage` (`sd_settings_v1`) — per-tier discount %, entry threshold, ₹-per-point rates |
| BRAND | `brand_settings` (Supabase singleton) — name, tagline, logo/favicon, OG image, socials, contact info, homepage support-section toggle |
| THEME | `theme_settings` (Supabase singleton) — accent color, font family *strings* (free text, no validation they're actually loaded anywhere), border-radius preset, animations toggle, raw custom-CSS textarea |
| SHOP | `localStorage` (`sd_settings_v1`) — free-shipping threshold (the actual value checkout enforces, per an inline code comment), curated shop-filter color swatches |
| COD | `settings` (Supabase singleton) — `cod_enabled`, `cod_advance_percent`, `cod_min_order` |

Nothing cross-validates between tabs (e.g. nothing stops `cod_min_order` disagreeing with the free-shipping threshold). The custom-CSS textarea has no syntax highlighting or validation.

### `/admin/users` (`admin.users.tsx`)
`profiles` joined client-side to `user_roles`. Per-user role `<select>` upserts `user_roles` (update if a role row exists, else insert) — see §2 for the bootstrap caveat. No confirmation on role changes, no audit trail.

## 5. CMS routes

### `/admin/announcements` (`admin.announcements.tsx`)
`announcement_bars` — message, CTA label/href, bg/text color, active toggle, `starts_at`/`ends_at` schedule window. **This page does not itself enforce the schedule window** (no "currently active per schedule" indicator) — that filtering, if it exists, lives in the storefront-facing component, not here. Reorder chevrons, active-toggle pill, delete with confirm.

### `/admin/website-sections` (`admin.website-sections.tsx`)
The largest, most complex CMS page — the homepage section builder (`website_sections`, `page_slug = 'home'`). Reorder via chevrons; "RESET ORDER TO DEFAULT" restores the canonical position order **without touching content/visibility/headings** (explicit confirm warns of this scope); visibility toggle blocked with a toast if `is_locked`; delete blocked if `is_locked`.

Edit opens a type-specific config form (`SectionConfigForm`, a `switch` over `section_type`) — every section type documented in 02-DATABASE-SCHEMA.md §1 has its own field set here (hero's multi-slide editor with a mobile-media-override-with-clear-button, denyspace's 4 fixed benefit slots with a 12-icon `IconPicker`, gender_split's up-to-3 cards, etc.). Several section types (`new_arrivals`, `popular_now`, `fabric_tabs`, `motion_picture`, `faq`, `why_us`, `newsletter`, `influencer_picks`, `testimonials`, `contact_support`) **deliberately defer their heading text to the separate Headings page** — this editor's copy explicitly cross-references that page by key rather than duplicating a heading field.

**Two real gaps found**:
- **`community` has no case in the `SectionConfigForm` switch** despite being a valid `section_type` — editing a "community" section here falls through to the generic "No config fields for this section type" message. This is likely intentional (its real content lives on the dedicated `/admin/community-cms` page, matching the same "config here is position/visibility only" pattern as `influencer_picks`), but it's worth explicitly confirming rather than assuming, since nothing in the code states this outright.
- **The `lookbook` section-type's own config (a plain title + newline-delimited image-URL list) appears superseded by the dedicated `lookbook_slides` table and its own admin page (`/admin/lookbook-cms`)** — likely dead/legacy config surface from before the dedicated table existed. Don't build new lookbook logic against this section-config path; use `lookbook_slides` instead.

### `/admin/mega-menu` (`admin.mega-menu.tsx`)
The one page with real drag-and-drop (`framer-motion`'s `Reorder`, not chevrons). Three steps: navbar tabs (each **must** reference a real category — a category already used as a tab is excluded from other tabs' picker options), sublinks per tab (also must reference a real category, but doesn't have to be a *child* of that tab's category), and up to 2 featured products per tab. **Deliberately no free-text links or URLs anywhere in this entire page** — every level resolves through something that already exists in the catalog. The live preview panel renders the actual production `MegaMenuPanel` component fed synthetic data, so what you see here is pixel-identical to what ships.

**Partially-manual save model**: add/delete/reorder write to Supabase immediately, but `is_active`/category-selection edits on existing rows are held in local state until that section's own "SAVE" button is clicked — a genuine mixed optimistic/manual pattern that could leave an admin unsure what's actually persisted at any given moment.

### `/admin/navigation` — Footer Links (`admin.navigation.tsx`)
Manages only the `footer` rows of `navigation_menus` — `header`/`mobile` locations are still valid per the underlying type but **unreachable from any admin UI**, since the navbar has its own dedicated Mega Menu page and the mobile nav was never wired to read from here (per an in-code comment). Items grouped into footer columns purely by a free-text "group" string match, not a relational structure. Single "SAVE MENU" overwrites the entire `items` JSON array on the one `footer` row.

### `/admin/faq` (`admin.faq.tsx`)
Category filter chips (`general|orders|shipping|returns|sizing`) + modal CRUD. **Reorder chevrons operate only within the currently-filtered category view** — `position` values are meaningful within a category grouping, not globally continuous across all FAQ items.

### `/admin/testimonials` (`admin.testimonials.tsx`)
Straightforward CRUD, 5-star clickable rating picker, avatar via `MediaField` (image or video) with an initials-circle fallback.

### `/admin/influencer-picks` (`admin.influencer-picks.tsx`)
Video source toggle: `upload` (dedicated video uploader, hover-autoplay in the live grid) vs `link` (paste a reel URL, opens externally on click instead) — mutually exclusive, validated. **Product tagging requires the pick to already be saved** (has a real `id`) — a brand-new pick's SAVE deliberately keeps the modal open afterward (the one CMS modal in the whole admin panel that doesn't close on save) specifically so the admin can immediately tag products without a second round trip.

### `/admin/lookbook-cms` (`admin.lookbook-cms.tsx`)
Every card **must** link to exactly one real product — save is blocked with a toast if either the media or the product picker is empty. **`caption`/`link_href` exist on the underlying type but have no form inputs anywhere in this modal** — they can only ever end up `null` from this UI; if the storefront actually reads/displays a caption anywhere, there's currently no admin path to set one.

### `/admin/community-cms` (`admin.community-cms.tsx`)
The simplest, most consistent CMS page in the panel — explicitly **no click-through/product link** (contrast with Lookbook's mandatory product link). Grid-of-cards UI (not a table); every field (handle text, bento size, media type, position) saves **individually and immediately** on blur/change — there is no page-level SAVE button at all, unlike almost every other CMS page here.

### `/admin/headings` (`admin.headings.tsx`)
A centralized registry (`section_headings`) for renaming/recoloring section headings site-wide without a code change — cross-referenced from many of Website Sections' config forms (§5.2). A `<select>` picks which key to edit (not a list/table); fields are eyebrow/heading/subtitle text + a color picker with a "RESET TO THEME" button. **Rows are not creatable/deletable here** — only pre-seeded keys (via migrations) ever appear in the picker. Adding a brand-new headed section to the site requires a migration to seed its row before this page can edit it.

### `/admin/preloader` (`admin.preloader.tsx`)
Controls only the backdrop (image/video via `MediaField`) and glitch content (image via a bespoke `ImageField`, or free text + color) — the glitch animation itself is fixed in code. **Cannot create a `preloader_settings` row from this UI** — if none exists yet (`row === null`), the page just says "run the migration first" instead of offering to insert one. Given this table's create→drop→recreate history (02-DATABASE-SCHEMA.md), make sure the *current* migration (`20260731000006`) has actually been run before assuming this page will load anything.

### `/admin/popup` (`admin.popup.tsx`)
Controls the copy/icons/CTA around the loyalty popup — enabled toggle, delay seconds, background (none/image/video), logo, badge/headline/body text, a 3-icon rule row (unlock/earn/redeem, each with a 14-icon `IconPicker` + label + free-text value string like "1 PT"), 4 tier-name labels, primary/secondary CTA. **The actual ₹ amounts are deliberately not editable here** — on-page copy explicitly says those come from Settings → Loyalty, keeping "copy" and "math" in two separate places on purpose. Same "cannot bootstrap a missing row" limitation as Preloader.

### `/admin/media` (`admin.media.tsx`)
The one persistent, searchable asset library (`media_assets`) — everywhere else's uploads bypass this table entirely (§3). Multi-file upload with per-file sequential progress, auto image/video detection by MIME type. Search by public_id/alt text, folder filter, a detail panel with editable alt text + copy-URL + delete. **Deleting a row here does not delete the underlying Cloudinary asset** — no Cloudinary destroy API call exists in this code, so a "deleted" asset just becomes an orphaned file in Cloudinary storage forever. Because most CMS uploads never touch this table, it cannot be used to reliably answer "where else is this image used" before deleting.

### `/admin/seo` (`admin.seo.tsx`)
`seo_settings`, one row per page slug, but **the slug list itself is a hardcoded 16-entry array in the component** — any new storefront page (a new collection, an individual product page, anything not in that literal list) has no way to get an SEO row through this UI without first adding it to that array in code. OG title/description fall back to the base title/description when left blank — implemented wherever `<head>` tags are actually rendered, not in this admin page.

### `/admin/notifications` — WhatsApp (`admin.notifications.tsx`)
Five tabs — Templates/Queue/Logs/Campaigns/Usage — fully covered in 06-WHATSAPP-META.md. The one thing worth restating here in admin-workflow terms: **the Campaigns tab lets you fully define a campaign (name, template, target segment, schedule) but there is no "send" or "activate" button anywhere in this admin UI** — campaign execution, if it ever gets built, would have to be a separate server-side job reading `marketing_campaigns` rows, which doesn't exist today (see 02-DATABASE-SCHEMA.md's note that this table is fully decorative).

## 6. Summary of the biggest cross-cutting gaps

If asked to "finish" or "productionize" this admin panel, these are the highest-leverage real gaps, in the order they'd probably matter most:

1. **Loyalty has two independently-computed sources of truth** that can now genuinely disagree (`/admin/loyalty`'s live-vs-fallback split, `/rewards`' pure-client calculation, and the DB's own `recalc_loyalty_tier()`) — see 02-DATABASE-SCHEMA.md.
2. **Four different config surfaces use `localStorage` instead of Supabase** (Loyalty settings, Shop settings, Invoice Template, Brands) — none of it syncs across browsers or admins, silently.
3. **No admin-initiated cancel or return-request action exists anywhere** — both are customer-only flows; if a future ask is "let admin cancel/return an order on a customer's behalf," that's new admin-panel work, not a bug fix.
4. **Marketing Campaigns can be fully defined but never sent** — no execution path exists.
5. **`/admin/media` isn't a real reflection of "every image used on the site"** — most uploads bypass it, and its own deletes don't clean up Cloudinary.
6. **`/admin/seo`'s page list is a hardcoded array** — won't scale to per-product or per-collection SEO without a code change.
