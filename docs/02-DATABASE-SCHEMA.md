# 02 — Database Schema Reference

**Project:** Studio Deny (Supabase Postgres). This document is the authoritative, current-state reference for every table, type, trigger, function, RLS policy, and cron job in the database — reconstructed by reading all 59 migration files in `supabase/migrations/` in chronological order and resolving every later `ALTER`/`DROP`/`RENAME` against the table it targets. Where a migration's own comments flag drift or a no-op, that is called out explicitly rather than silently smoothed over — treat those notes as load-bearing, not trivia.

**How to apply this file:** if you are recreating this schema from scratch, run every migration file in `supabase/migrations/` in filename (timestamp) order via the Supabase SQL Editor — there is no Supabase CLI in this project's environment, migrations are hand-pasted. Two files are hard sequencing dependencies and **must be run as separate SQL Editor executions, not pasted together**: `20260721000003_...` before `20260721000004_...`, and `20260730000002_...` before `20260730000003_...` (Postgres will not let a brand-new enum value be referenced in the same transaction it was added in).

---

## 1. Tables

### Core commerce

#### `products`
Every sellable item. **This table predates the migrations folder** — no `CREATE TABLE products` exists anywhere in `supabase/migrations/`; only `ALTER TABLE` statements. The column list below is the union of what the live app's `DBProduct` type (`src/lib/productsStore.ts`) actually reads/writes and every migration-applied column, which is the only reliable way to know the true live shape.

| Column | Type | Notes |
|---|---|---|
| `slug` | text | **Natural primary key** — every FK elsewhere in the app (`order_items.product_slug`, `wishlist_items.product_slug`, `mega_menu_products.product_slug`, etc.) references this, not a uuid. |
| `name` | text | |
| `category` | text | Legacy flat category string (e.g. `"Bottoms"`). Still the fallback source for old products; see `categories`/`category_id` below for the real hierarchy. |
| `category_id` | uuid, FK → `categories(id)` ON DELETE SET NULL | Added by `20250516000001` (assumed pre-existing `categories`; see the categories section for why this ALTER likely didn't actually apply until `categories` was created fresh in `20260719000001`). |
| `brand` | text | Pre-existing. |
| `brand_id` | uuid, references `brands(id)` | Added by `20250516000001`. **⚠️ No migration anywhere creates a `brands` table** — treat `brand_id` as unverified/possibly-nonfunctional until you confirm `brands` actually exists live (see Known Drift §7). |
| `price` | numeric | |
| `compare_at` | numeric, nullable | Pre-existing (strike-through "was" price). |
| `image`, `image_type` | text, text (`'image'\|'video'`, default `'image'`) | `image_type` added `20260730000001`. |
| `hover_image`, `hover_image_type` | text, text | Same pattern, same migration. |
| `gallery` | jsonb, default `[]` | Originally a plain array of URL strings (`20250624000000`); migrated in `20260728000002` to an array of `{url, layout}` objects (`layout` is `'standalone'` or `'half'`); an optional `type` key (`'image'\|'video'`) is handled at the application layer only, no column. |
| `material_care` | text, nullable | Added `20250624000000`. |
| `badge` | text, nullable | Pre-existing. Values used by the app: `NEW DROP`, `LAST PIECE`, `SALE`, `SOLD OUT`. |
| `sizes` | text[] | Pre-existing flat size list — only the real source of truth for products with **no** `product_variants` rows. |
| `colors` | jsonb | Pre-existing, array of `{name, hex}`. |
| `description`, `material` | text | Pre-existing. |
| `fit` | text | Added `20250625000000`, **dropped** `20260728000003`. Does not exist in the final schema. |
| `stock` | integer | Pre-existing flat stock count. **Only authoritative when the product has zero `product_variants` rows** — once variants exist, the storefront (and the fixed admin UI, see 03-ADMIN-PANEL.md) ignores this field entirely in favor of the sum of variant stock. Nothing in the database keeps this field in sync with variants; it silently goes stale.
| `is_active` | boolean | Pre-existing. `false` = hidden from storefront. |
| `is_featured` | boolean, default false | Added `20250516000001`. |
| `is_best_seller` | boolean, default false | Added `20260721000001`. |
| `created_at`, `updated_at` | timestamptz | `updated_at` added `20250516000001`. |

#### `product_variants`
Per-size/per-color stock, price, and SKU. Created `20250516000003`.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `product_id` | text — **the product's `slug`**, not a uuid FK (no FK constraint declared) |
| `size`, `color`, `color_hex` | text, nullable |
| `stock` | integer NOT NULL DEFAULT 0, `CHECK (stock >= 0)` |
| `price` | numeric(10,2) NOT NULL, `CHECK (price >= 0)` |
| `compare_price` | numeric(10,2), nullable |
| `sku` | text UNIQUE, nullable |
| `created_at` | timestamptz |

Indexes: `product_id`, and `sku WHERE sku IS NOT NULL`.

**Trigger `trg_variant_stock_notify`** (`AFTER UPDATE OF stock`, added `20260812000005`) → `queue_stock_notifications()`:
- If `OLD.stock = 0 AND NEW.stock > 0`: looks up every row in `stock_notify_requests` for this `product_id`, queues a `back_in_stock` WhatsApp message to each requester's `profiles.phone`, then deletes those requests.
- If stock crosses down through `≤3` (`NEW.stock <= 3 AND NEW.stock < OLD.stock AND OLD.stock > 3`): queues a `low_stock_alert` WhatsApp message to `settings.admin_whatsapp_phone` (the *store's* number, not a customer).
Both branches silently no-op if the relevant template is missing/inactive or the phone number is unset.

#### `order_items`
Normalized line items — supplements (does not replace) the `orders.items` jsonb column. Created `20250516000003`.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `order_id` | text — FK-shaped but **no FK constraint declared** (orders.id is text) |
| `variant_id` | uuid, FK → `product_variants(id)` ON DELETE SET NULL |
| `product_slug`, `product_name` | text NOT NULL |
| `size`, `color` | text, nullable |
| `qty` | integer NOT NULL DEFAULT 1, `CHECK (qty > 0)` |
| `unit_price` | numeric(10,2) NOT NULL |
| `created_at` | timestamptz |

#### `orders`
**Created fresh** by `20260810000001` — this table did **not exist live** before that migration (verified via a direct REST query at the time: `PGRST205 "Could not find the table 'public.orders'"`). Every order before that date only ever lived in the browser's `sessionStorage`. Because of this, `20250516000001`'s `ALTER TABLE orders ADD COLUMN ...` (which assumed an existing simpler `orders` table with columns like `payment_status`, `razorpay_order_id`, `coupon_code`, `refund_status`) almost certainly **no-op'd** at the time it ran (wrapped in `EXCEPTION WHEN undefined_table THEN NULL`) — **those columns do not exist** in the real table below. Trust this section, not `20250516000001`, for `orders`.

| Column | Type | Added by |
|---|---|---|
| `id` | text PK | `20260810000001` |
| `order_number` | text UNIQUE NOT NULL, default `'SD-' \|\| lpad(nextval('order_number_seq'), 8, '0')` (sequence starts at `10000001`) | same |
| `invoice_no` | text | same |
| `user_id` | uuid, FK → `auth.users(id)` ON DELETE SET NULL, **nullable** (guest checkout supported at the DB level) | same |
| `user_email` | text NOT NULL | same |
| `items` | jsonb NOT NULL DEFAULT `[]` — the authoritative line-item snapshot (`{slug, name, image, size, qty, price, variantId}[]`) | same |
| `subtotal`, `shipping` | numeric(10,2) NOT NULL DEFAULT 0 | same |
| `tax_rate` | numeric(5,2) NOT NULL DEFAULT 0 | same |
| `tax`, `discount` | numeric(10,2) NOT NULL DEFAULT 0 | same |
| `extra_lines` | jsonb NOT NULL DEFAULT `[]` (`{label, amount}[]`, admin invoice add-ons) | same |
| `total` | numeric(10,2) NOT NULL DEFAULT 0 | same |
| `status` | text NOT NULL DEFAULT `'PLACED'`, `CHECK (status IN ('PLACED','PACKED','SHIPPED','DELIVERED','CANCELLED','REFUNDED'))` | same |
| `address` | jsonb NOT NULL (`{name, phone, line1, city, state, pincode}`) | same |
| `payment_id` | text | same |
| `payment_method` | text NOT NULL DEFAULT `'razorpay'`, `CHECK (IN ('razorpay','cod'))` — **lowercase**, unlike the dead `20250516000001` assumption of uppercase | same |
| `cod_advance_paid` | boolean NOT NULL DEFAULT false | same |
| `cod_advance_amount` | numeric(10,2) | same |
| `notes` | text | same |
| `refund_amount` | numeric(10,2) | same |
| `refunded_at`, `cancelled_at` | timestamptz | same |
| `shiprocket_order_id`, `shiprocket_shipment_id` | text | `20260811000001` |
| `awb_number` | text (indexed) | `20260811000001` |
| `courier_name`, `tracking_url` | text | `20260811000001` |
| `shipped_at`, `delivered_at`, `rto_initiated_at` | timestamptz | `20260811000001` |
| `return_status` | text, `CHECK (IN ('REQUESTED','PICKUP_SCHEDULED','PICKUP_FAILED','RECEIVED','REPLACED'))` | `20260811000002`, extended `20260811000003` |
| `return_reason` | text | `20260811000002` |
| `return_requested_at`, `return_received_at` | timestamptz | `20260811000002` |
| `shiprocket_return_order_id`, `shiprocket_return_shipment_id` | text | `20260811000002` |
| `return_awb_number` (indexed), `return_courier_name`, `return_tracking_url` | text | `20260811000002` |
| `replacement_order_id` | text, FK → `orders(id)` ON DELETE SET NULL | `20260811000003` |
| `created_at`, `updated_at` | timestamptz NOT NULL DEFAULT now() | `20260810000001` |

**Trigger `trg_orders_updated_at`** (`BEFORE UPDATE`) → `update_updated_at()`.

**Trigger `trg_orders_lifecycle_notify`** (`BEFORE INSERT OR UPDATE`, added `20260812000002`, extended `20260812000005`) → `queue_order_lifecycle_notification()` — see §3 for the full behavior; this is the single biggest piece of business logic in the schema.

### Categories & sizes

#### `categories`
**Created fresh** by `20260719000001` (confirmed not live before that — same "assumed pre-existing, actually wasn't" pattern as `orders`). `20250516000001`'s earlier `ALTER TABLE categories` almost certainly no-op'd for the same reason.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text NOT NULL |
| `slug` | text NOT NULL UNIQUE |
| `parent_id` | uuid, FK → `categories(id)` ON DELETE SET NULL — one level of nesting used in practice (e.g. Rings/Chains/Socks under Accessories) |
| `is_active` | boolean NOT NULL DEFAULT true |
| `created_at` | timestamptz |

Seeded rows: Men, Women, Accessories (top-level); Rings, Chains, Socks (children of Accessories); Tops, Bottoms, Outerwear (top-level, matching legacy `products.category` strings). Existing products were re-pointed via `UPDATE products SET category_id = ... WHERE lower(category) = categories.slug`.

#### `brands`
**⚠️ No `CREATE TABLE brands` exists in any migration.** `20250516000001` only `ALTER`s it (assuming pre-existence) and `products.brand_id` references it. Given the identical pattern with `orders`/`categories` (assumed-existing tables that turned out not to exist), **do not assume `brands` is real without verifying live** (`SELECT * FROM brands LIMIT 1` in the SQL Editor).

#### `sizes`
Category-scoped size lists (e.g. Tops → S/M/L/XL, Rings → 6/7/8/9) so the admin product form reads from a real list instead of free text. Created `20260730000004`.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `category_id` | uuid NOT NULL, FK → `categories(id)` ON DELETE CASCADE |
| `label` | text NOT NULL |
| `position` | integer NOT NULL DEFAULT 0 |
| `created_at` | timestamptz |
| — | UNIQUE `(category_id, label)` |

### Auth & profile

#### `profiles`
Auto-created on signup. Definitive shape as of `20250516000013` (the "bulletproof" rewrite superseding two earlier attempts, `20250516000002` and `20250516000012`).
| Column | Type |
|---|---|
| `id` | uuid PK (sometimes equals `user_id`, kept for a legacy tutorial-schema compat path in the trigger — see §3) |
| `user_id` | uuid, UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE |
| `name`, `email`, `phone`, `avatar_url` | text, all nullable |
| `created_at`, `updated_at` | timestamptz |

`phone` exists as a column from the start but was **never populated by any user flow** until the WhatsApp work — see §7.

#### `user_roles`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | `app_role` enum (`'admin'\|'staff'\|'customer'`) NOT NULL DEFAULT `'customer'` — defined as a Postgres enum in `20250516000002`, then **redeclared as a plain `text CHECK`** with the same 3 values in `20250516000013`'s `CREATE TABLE IF NOT EXISTS` (a no-op if the enum-typed table already existed) |
| `created_at` | timestamptz |

#### `addresses`
Saved shipping addresses — **note: the actual checkout flow and `/account` page do NOT use this table** (addresses are stored in the browser's `localStorage` under key `sd_addresses` instead — a real, live app/schema mismatch, see §7). The table and its trigger are fully built but effectively unused.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `name`, `phone`, `line1`, `city`, `state`, `pincode` | text NOT NULL |
| `line2` | text, nullable |
| `is_default` | boolean NOT NULL DEFAULT false |
| `created_at` | timestamptz |

Trigger `trg_single_default_address` (`AFTER INSERT OR UPDATE`) → `ensure_single_default_address()`: when a row is marked default, un-defaults every other address for that `user_id`.

### Cart & wishlist

#### `carts`
One row per logged-in user. Created `20250516000004`, **left completely unused until this session's abandoned-cart work** — `CartContext.tsx` was pure in-memory React state with zero persistence until then.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE — **structurally cannot represent a guest cart** (no session_id column, `user_id` is `NOT NULL`) |
| `created_at`, `updated_at` | timestamptz |
| `last_abandoned_stage` | text, `CHECK (IN ('1h','24h','48h','final'))` — added `20260812000003`, extended `20260812000005` |
| `last_notified_at` | timestamptz — added `20260812000003` |

Trigger `trg_carts_updated_at` (`BEFORE UPDATE`) → `update_updated_at()` — this is the signal the abandoned-cart scan uses as "last activity."

#### `cart_items`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `cart_id` | uuid NOT NULL, FK → `carts(id)` ON DELETE CASCADE |
| `variant_id` | uuid NOT NULL, FK → `product_variants(id)` ON DELETE CASCADE — **a product with no variant rows cannot be persisted to cart at all** |
| `qty` | integer NOT NULL DEFAULT 1, `CHECK (qty > 0)` |
| `created_at` | timestamptz |
| — | UNIQUE `(cart_id, variant_id)` |

#### `wishlist_items`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `product_slug` | text NOT NULL, no FK constraint |
| `created_at` | timestamptz |
| — | UNIQUE `(user_id, product_slug)` |

#### `abandoned_carts`
A **log/snapshot** table (not a live cart) written by the `abandoned-cart-scan` edge function each time a nudge is sent — one row per notification event, not one row per cart.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid, FK → `auth.users(id)` ON DELETE SET NULL, nullable |
| `session_id` | text, nullable — present in the schema for a guest-cart future that was never built |
| `cart_snapshot` | jsonb NOT NULL DEFAULT `[]` — `{product_slug, name, image, size, qty, price}[]` |
| `total_value` | numeric(10,2), nullable |
| `recovery_sent_at`, `recovered_at` | timestamptz, nullable — `recovered_at` is never actually written by any code path (a known gap, not wired up) |
| `created_at` | timestamptz |

#### `stock_notify_requests`
"Notify me when back in stock" opt-ins. Created `20260812000005`.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE — **logged-in only**, by design (a phone number is required to ever notify anyone) |
| `product_slug` | text NOT NULL, FK → `products(slug)` ON DELETE CASCADE |
| `created_at` | timestamptz |
| — | UNIQUE `(user_id, product_slug)` |

### Loyalty

#### `loyalty_balances`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE |
| `points` | integer NOT NULL DEFAULT 0, `CHECK (points >= 0)` |
| `lifetime_spent` | numeric(12,2) NOT NULL DEFAULT 0 |
| `tier` | `loyalty_tier` enum (`'ROOKIE'\|'RUNNER'\|'RIOT'\|'LEGEND'`) NOT NULL DEFAULT `'ROOKIE'` |
| `created_at`, `updated_at` | timestamptz |

**⚠️ Critical: this table was never fed a single row by any code path until `20260812000005`.** Grepped the entire app — nothing had ever inserted into `loyalty_transactions` (the only way this table's `tier` can change), so it was 100% dead until that migration's `queue_order_lifecycle_notification()` extension started inserting an `'earn'` transaction on every `DELIVERED` order. See §7 and §3.

Trigger `trg_recalc_tier` (`BEFORE INSERT OR UPDATE OF lifetime_spent`) → `recalc_loyalty_tier()`:
```
tier = LEGEND  if lifetime_spent >= 25000
     = RIOT    if lifetime_spent >= 10000
     = RUNNER  if lifetime_spent >= 2500
     = ROOKIE  otherwise
```
Extended `20260812000005` to also compare the old tier rank to the new one and, on an upgrade, queue a `loyalty_tier_upgrade` WhatsApp message (looking up phone/name from `profiles`).

**⚠️ Separate, disagreeing system:** the customer-facing rewards UI (`src/lib/loyalty.ts`, `/rewards` page) computes tier **client-side**, from **points** (not `lifetime_spent` directly), at a **different conversion rate** (`₹50 = 1 point`, admin-configurable via `src/lib/settings.ts`, itself localStorage-only) and **different thresholds** (RUNNER≥1000pts/RIOT≥3000pts/LEGEND≥8000pts — which at ₹50/point is RUNNER≥₹50,000/RIOT≥₹150,000/LEGEND≥₹400,000 of spend, wildly different from the DB's ₹2,500/₹10,000/₹25,000). This mismatch is **known and not resolved** — the DB was made the "real" system for notification purposes, but the customer-visible rewards page still shows its own separate, disagreeing number. If a future session is asked to fix this, decide which is canonical and update the other, don't just add a third system on top.

#### `loyalty_transactions`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `order_id` | text, nullable, no FK constraint |
| `type` | `loyalty_tx_type` enum (`'earn'\|'redeem'\|'adjust'`) |
| `points` | integer NOT NULL — positive = earn, negative = redeem/adjust |
| `note` | text |
| `created_at` | timestamptz |

Trigger `trg_apply_loyalty_tx` (`AFTER INSERT`) → `apply_loyalty_transaction()`: upserts `loyalty_balances`, adding `NEW.points` to `points` (floored at 0), and — **only when `type = 'earn'`** — increments `lifetime_spent` by `NEW.points / 10 * 100` (i.e. assumes ₹10 spent = 1 point earned; this is the rate the one real inserter, `queue_order_lifecycle_notification()`, was written to match — `FLOOR(order.total / 10)` points per delivered order).

### WhatsApp / notifications

#### `notification_templates`
The **local mirror** of Meta-approved WhatsApp templates — editing `body_text`/`variables` here has **zero effect** on what Meta actually sends (Meta always uses its own server-side approved copy, matched by `template_name`). This was a real, fixed UX bug — see 06-WHATSAPP-META.md.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text NOT NULL — display name |
| `template_name` | text NOT NULL UNIQUE — must exactly match the name registered with Meta |
| `body_text` | text NOT NULL — informational only, pulled from Meta by the sync function |
| `variables` | text[] NOT NULL DEFAULT `{}` — our own semantic labels for Meta's positional `{{1}}, {{2}}...` placeholders, in order |
| `is_active` | boolean NOT NULL DEFAULT true — **the one field that actually matters**: gates whether any trigger will queue this template at all |
| `meta_status` | text, nullable — added `20260812000004`; mirrors Meta's real approval state (`APPROVED`/`PENDING`/`REJECTED`/`PAUSED`/`MISSING`, the last meaning it disappeared from Meta since the last sync) |
| `created_at` | timestamptz |

#### `notification_queue`
Outbound WhatsApp messages pending send. This is the single integration point every trigger in the entire app writes to — nothing sends directly.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `template_id` | uuid, FK → `notification_templates(id)` ON DELETE SET NULL |
| `recipient_phone` | text NOT NULL |
| `order_id` | text, nullable, no FK |
| `variables` | jsonb NOT NULL DEFAULT `{}` — actual values for this specific message |
| `status` | `notif_status` enum (`'pending'\|'sent'\|'failed'`) NOT NULL DEFAULT `'pending'` |
| `error_message` | text, nullable |
| `scheduled_at`, `sent_at` | timestamptz, nullable |
| `created_at` | timestamptz |

Indexed on `status` and on `order_id WHERE order_id IS NOT NULL`.

#### `whatsapp_logs`
Delivery receipts. **Only ever populated with `status='sent'`** — nothing writes `'delivered'`/`'read'`/`'failed'` today because the inbound Meta delivery-status webhook (`whatsapp-webhook`) was documented in `SETUP.md` but **never actually built** (no such edge function exists on disk).
| Column | Type |
|---|---|
| `id` | uuid PK |
| `queue_id` | uuid, FK → `notification_queue(id)` ON DELETE SET NULL |
| `order_id` | text, nullable |
| `recipient_phone` | text NOT NULL |
| `message_id` | text — Meta's own message ID |
| `status` | `wa_log_status` enum (`'sent'\|'delivered'\|'read'\|'failed'`) NOT NULL DEFAULT `'sent'` |
| `created_at` | timestamptz |

#### `marketing_campaigns`
**Fully decorative** — the admin UI (`/admin/notifications` → Campaigns tab) can create a row here, but nothing anywhere ever transitions it out of `'draft'` or inserts into `notification_queue` from it. `sent_count`/`delivered_count`/`failed_count` are display-only and never incremented by any code.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text NOT NULL |
| `template_id` | uuid, FK → `notification_templates(id)` ON DELETE SET NULL |
| `target_segment` | text, nullable — free text, no enforcement (values like `'all'`, a tier name, or `'abandoned_cart'` are used by the UI but mean nothing to any backend logic) |
| `scheduled_at` | timestamptz, nullable |
| `status` | `campaign_status` enum (`'draft'\|'scheduled'\|'running'\|'completed'\|'failed'`) NOT NULL DEFAULT `'draft'` |
| `sent_count`, `delivered_count`, `failed_count` | integer NOT NULL DEFAULT 0 |
| `created_at` | timestamptz |

#### `admin_notifications`
In-app bell notifications for the admin. **⚠️ Nothing in the app inserts into this table** — the admin order bell (`admin.tsx`) computes "new orders" by comparing `orders.created_at` against a `localStorage` last-seen timestamp instead, entirely bypassing this table. It exists, is RLS-protected, and is unused.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `type` | text NOT NULL — free text, documented examples: `'new_order'`, `'low_stock'`, `'refund_request'` |
| `title`, `body` | text (body nullable) |
| `is_read` | boolean NOT NULL DEFAULT false |
| `ref_id` | text, nullable — order ID, product slug, etc. |
| `created_at` | timestamptz |

#### `customer_notification_preferences`
Per-user WhatsApp/email opt-in flags. **Only `wa_abandoned_cart` is actually read anywhere** (by the `abandoned-cart-scan` function, which skips a customer if this is explicitly `false`). No UI exists for a customer to ever set any of these — every row, if one exists at all, was written directly via SQL.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid NOT NULL UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE |
| `wa_order_updates` | boolean NOT NULL DEFAULT true — unused |
| `wa_promotions` | boolean NOT NULL DEFAULT false — unused |
| `wa_abandoned_cart` | boolean NOT NULL DEFAULT true — the only one actually checked |
| `email_order_updates` | boolean NOT NULL DEFAULT true — unused (no email sending exists anywhere in this app) |
| `email_promotions` | boolean NOT NULL DEFAULT false — unused |
| `created_at`, `updated_at` | timestamptz |

### Misc

#### `coupons`
Table exists, no admin UI or checkout logic reads/writes it. Built per an earlier spec, never wired up.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `code` | text NOT NULL UNIQUE (indexed lowercased) |
| `discount_type` | text, `CHECK (IN ('percent','fixed'))` |
| `discount_value` | numeric(10,2), `CHECK (> 0)` |
| `min_order` | numeric(10,2), nullable |
| `max_uses`, `used_count` | integer, nullable / default 0 |
| `is_active` | boolean NOT NULL DEFAULT true |
| `expires_at` | timestamptz, nullable |
| `created_at` | timestamptz |

#### `rate_limits`
Backs `src/lib/rateLimit.ts`'s client-callable `checkRateLimit`/`recordAttempt` helpers (used on signup and checkout). No RLS policy grants anon/authenticated access — **only the service role can touch this table**, meaning any client-side usage of it must go through something with elevated privileges, or (more likely, worth verifying) the actual rate-limiting in `rateLimit.ts` is purely client-side/localStorage-based and this table is unused infrastructure for a server-side version that was never wired up.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `key` | text NOT NULL — e.g. `"ip:1.2.3.4:checkout"` |
| `count` | integer NOT NULL DEFAULT 1 |
| `window_end` | timestamptz NOT NULL |
| `created_at` | timestamptz |
| — | UNIQUE `(key, window_end)` |

Function `purge_expired_rate_limits()` (plain SQL function, `DELETE FROM rate_limits WHERE window_end < now()`) exists but is not attached to any trigger or cron job — it would need to be called manually or scheduled to ever run.

### CMS

#### `announcement_bars`
Scrolling top-bar messages. `id, message, cta_label, cta_href, bg_color (default '#c8f135'), text_color (default '#0a0a0a'), is_active, position, starts_at, ends_at, created_at`. Indexed on `(is_active, position)`.

#### `website_sections`
The backbone of the entire homepage — every section is a row here, ordered by `position`, typed by `section_type`, configured via a freeform `config jsonb`.
| Column | Type |
|---|---|
| `id` | uuid PK |
| `page_slug` | text NOT NULL DEFAULT `'home'` |
| `section_type` | `section_type` enum — see the full value list below |
| `title` | text NOT NULL (admin-facing label, not shown to visitors) |
| `is_visible` | boolean NOT NULL DEFAULT true |
| `is_locked` | boolean NOT NULL DEFAULT false — locked sections can't be deleted/reordered past certain bounds in the admin UI |
| `position` | integer NOT NULL DEFAULT 0 |
| `config` | jsonb NOT NULL DEFAULT `{}` — shape is entirely section_type-specific, see below |
| `created_at` | timestamptz |

**`section_type` enum values**, in the order they were added across migrations (Postgres enums are append-only — values can never be removed or reordered, only added): `hero`, `marquee`, `new_arrivals`, `lookbook`, `testimonials`, `faq` (original 6, `20250516000005`) → `why_us`, `instagram_feed`, `newsletter` (`20250519000000`) → `gender_split`, `category_carousel`, `denyspace` (`20260721000003`) → `popular_now` (`20260728000005`) → `fabric_tabs` (`20260728000008`) → `motion_picture` (`20260728000011`) → `influencer_picks`, `community`, `contact_support` (`20260730000002`). **`instagram_feed` was later deleted from live use** (`DELETE FROM website_sections WHERE section_type = 'instagram_feed'`, `20260730000003`) but the enum value itself still exists (enums can't drop values).

**Canonical current homepage order** (by `position`, per the last reorder in `20260730000003`): hero(0) → marquee(1) → gender_split(2) → category_carousel(3) → popular_now(4) → why_us(5) → lookbook(6) → new_arrivals(7) → fabric_tabs(8) → denyspace(9) → influencer_picks(10) → motion_picture(11) → community(12) → contact_support(13) → testimonials(14) → newsletter(15) → faq(16, `is_visible=true` as of this migration).

Each `config` shape (see `src/routes/admin.website-sections.tsx` for the editor, and the individual homepage components for consumption):
- `hero`: `{title, subtitle, cta_label, cta_href, bg_image}` or a `slides[]` array (later evolved to support multiple slides with `media_type`/`src` per slide)
- `marquee`: `{items: string[], speed: number}`
- `new_arrivals`: `{eyebrow, title, subtitle, cta_label, product_slugs: string[]}`
- `lookbook`: `{title, images: []}` (superseded in practice by the dedicated `lookbook_slides` table)
- `why_us`: `{eyebrow, title, subtitle, features: {label, desc}[]}`
- `gender_split`: `{cards: {media_type, src, label, cta_href}[]}` — started as 2 cards (Men/Women), force-migrated to 3 (Men/Accessories/Women) via a direct `UPDATE` in `20260728000009` since the app's own "3-card default" only applies to brand-new rows, not existing ones
- `category_carousel`: `{slides: {media_type, src, label, href}[]}`
- `denyspace`: `{logo_url, description, benefits: {icon, label, desc}[], cta_label, cta_href}`
- `popular_now`: `{title, items: {slug, tag?}[]}`
- `fabric_tabs`: `{tabs: {id, name, title, desc, img, href}[]}`
- `motion_picture`: `{video_url, subtext}`
- `influencer_picks`, `community`, `contact_support`: `{}` (position/visibility only — their real content lives on dedicated tables/`brand_settings`, not in this jsonb)

#### `navigation_menus`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `location` | `nav_location` enum (`'header'\|'footer'\|'mobile'`) UNIQUE |
| `items` | jsonb DEFAULT `[]` — `{label, href}[]` |
| `created_at`, `updated_at` | timestamptz |

Drives the Footer's link columns. **Not** the same system as the header navbar's categories (that's hardcoded `CATEGORY_NAV` in `Navbar.tsx` plus the `mega_menu_*` tables below) — easy to confuse.

#### `faq_items`
`id, question, answer, category (faq_category enum: general|orders|shipping|returns|sizing), is_active, position, created_at`.

#### `testimonials`
`id, name, role, avatar, avatar_type ('image'|'video', default 'image', added 20260730000001), body, rating (1-5), is_active, position, created_at`.

#### `content_versions`
Generic audit-log table (`table_name, record_id, changed_by, snapshot jsonb, created_at`) — schema exists, **nothing writes to it anywhere in the app**.

#### `brand_settings` (singleton — always exactly one row)
Grew across many migrations. Final columns: `id, site_name (default 'STUDIO/DENY'), tagline, logo_url, logo_type ('image'|'video'), favicon_url, favicon_type, og_default_image, social_instagram, social_whatsapp (renamed from social_twitter, 20260728000004), social_youtube (renamed from social_facebook, same migration — this rename fixed a real bug where the "Facebook" admin field was actually wired to render the YouTube link in Footer.tsx), contact_email, contact_phone, address, support_hours, support_enabled (default true, 20260728000007), created_at, updated_at`.

#### `theme_settings` (singleton)
`id, accent_color (default '#c8f135'), font_display, font_ui, border_radius, animations_enabled, custom_css, created_at, updated_at`.

#### `seo_settings`
One row per `page_slug` (UNIQUE). `id, page_slug, title, description, og_image, og_title, og_description, canonical_url, no_index, created_at, updated_at`.

#### `media_assets`
Cloudinary upload metadata. `id, public_id (UNIQUE), secure_url, alt_text, folder, width, height, bytes, format, resource_type ('image', added 20260728000001), created_at`.

#### `lookbook_slides`
`id, image_url, caption, link_href, is_active, position, created_at, media_type ('image'|'video', default 'image', added 20260731000004), product_slug (added 20260810000002 — links a slide to exactly one real product, plain text, no FK, same convention as wishlist_items)`.

#### `community_photos`
"Worn By Community" bento grid. `id, image_url, handle, bento_size (enum: sm|md|lg|wide|tall), media_type ('image'|'video', added 20260730000001), is_active, position, created_at`.

#### `influencer_picks`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name`, `handle` | text (handle nullable) |
| `video_source` | enum `influencer_video_source` (`'upload'\|'link'`) |
| `video_url` | text, nullable — required when `video_source='upload'` |
| `link_url` | text, nullable — required when `video_source='link'` |
| `thumbnail_url`, `thumbnail_type` ('image'\|'video', added `20260730000001`) | text |
| `quote` | text |
| `is_active`, `position`, `created_at` | |
| — | `CHECK ((video_source='upload' AND video_url IS NOT NULL) OR (video_source='link' AND link_url IS NOT NULL))` |

#### `influencer_pick_products`
Join table: `id, influencer_pick_id (FK → influencer_picks, CASCADE), product_slug (text, no FK), position, created_at`, UNIQUE `(influencer_pick_id, product_slug)`.

#### `section_headings`
A generic key-value registry so admins can rename/recolor site-wide headings without a code change — a component looks itself up by a stable `key`; a missing row means the component's hardcoded default is used.
| Column | Type |
|---|---|
| `key` | text PK |
| `label` | text NOT NULL — admin-facing description of what this controls |
| `heading_text` | text NOT NULL |
| `eyebrow_text`, `subtitle_text` | text, nullable — added `20260728000012` |
| `updated_at` | timestamptz |

Seeded keys as of the last migration touching this table: `product_specifications`, `motion_picture`, `influencer_picks`, `lookbook`, `worn_by_community`, `testimonials`, `contact_support`, `new_arrivals`, `why_us`, `newsletter`, `faq`, `popular_now`. **Not exhaustive** — some smaller hardcoded copy (individual testimonial quotes, some eyebrow tags) still isn't covered.

#### `mega_menu_categories`, `mega_menu_links`, `mega_menu_products`
The header navbar's dropdown structure — **deliberately separate from `categories`**, but every level is now forced to resolve through something real (no free-text labels or custom URLs, tightened by `20260730000007`):
- `mega_menu_categories`: `id, category_id (FK → categories, UNIQUE, NOT NULL — this row IS a category), position, is_active, created_at`. (`label`/`href` columns from the original `20260730000006` design were dropped.)
- `mega_menu_links`: `id, menu_category_id (FK → mega_menu_categories, CASCADE), category_id (FK → categories, NOT NULL — the sublink IS a category), position, is_active, created_at`. (`label`/`href` also dropped.)
- `mega_menu_products`: `id, menu_category_id (FK, CASCADE), product_slug (FK → products(slug), CASCADE), position, created_at`, UNIQUE `(menu_category_id, product_slug)` — replaces the original `mega_menu_tiles` table (dropped `20260730000007`), which used a free-standing `image_url` instead of a real product.

Seeded from the live navbar at the time (Women/Men/Accessories, Accessories → Rings/Chains/Socks).

#### `popup_promo` (singleton)
The homepage loyalty popup, fully admin-editable. `id, enabled, delay_seconds (default 15), bg_type ('none'|'image'|'video'), bg_image_url, bg_video_url, logo_url, badge_text, headline_line1, headline_line2, body_text, rule_unlock_label, rule_earn_label, rule_redeem_label, rule_unlock_icon, rule_earn_icon, rule_redeem_icon (all 3 icon columns added 20260731000002, default lucide-react icon names 'Lock'/'Zap'/'Gift'), rule_earn_value (default '1 PT'), rule_unlock_sub (default 'single order'), tier_1_label..tier_4_label (default ROOKIE/RUNNER/RIOT/LEGEND), cta_primary_text, cta_primary_href (default '/rewards'), cta_secondary_text, created_at, updated_at`.

#### `preloader_settings` (singleton)
**Went through a full create → drop → recreate cycle.** `20260731000003` created a version with font-size/weight/family/color fields (for a text-based preloader). `20260731000005` dropped it entirely — the Preloader component was redesigned to have no text, fixed backdrop. `20260731000006` recreated it with a **different, narrower shape** matching the new design — **this final version is the only one that matters**:
`id, bg_type ('image'|'video', default 'image'), bg_image_url, bg_video_url, content_type ('image'|'text', default 'image'), content_image_url (default '/deny-space-preloader.png'), content_text (default 'STUDIO DENY'), text_color (default '#000000'), created_at, updated_at`.

---

## 2. Custom types / enums

| Enum | Values |
|---|---|
| `app_role` | `admin`, `staff`, `customer` |
| `section_type` | see the full history under `website_sections` above — 17 values, append-only |
| `nav_location` | `header`, `footer`, `mobile` |
| `faq_category` | `general`, `orders`, `shipping`, `returns`, `sizing` |
| `loyalty_tier` | `ROOKIE`, `RUNNER`, `RIOT`, `LEGEND` |
| `loyalty_tx_type` | `earn`, `redeem`, `adjust` |
| `notif_status` | `pending`, `sent`, `failed` |
| `wa_log_status` | `sent`, `delivered`, `read`, `failed` |
| `campaign_status` | `draft`, `scheduled`, `running`, `completed`, `failed` |
| `bento_size` | `sm`, `md`, `lg`, `wide`, `tall` |
| `influencer_video_source` | `upload`, `link` |

`orders.status`, `orders.payment_method`, `orders.return_status`, `product_variants`-adjacent `'image'|'video'` type columns, and `user_roles.role` (in its final `20250516000013` form) are **plain `text` with a `CHECK` constraint**, not real Postgres enums — worth knowing if you ever need to add a new value (a `CHECK` constraint needs `DROP CONSTRAINT` + `ADD CONSTRAINT`, not `ALTER TYPE ... ADD VALUE`, and unlike a real enum a `CHECK`-constrained column's constraint CAN be dropped/redefined, which several migrations in this project actually do — e.g. `orders_return_status_check`).

---

## 3. Triggers and their functions

| Trigger | Table / Event | Function | What it actually does |
|---|---|---|---|
| `on_auth_user_created` | `auth.users`, `AFTER INSERT` | `handle_new_user()` | Creates the `profiles` row and a default `'customer'` `user_roles` row for every new signup. Final (`20250516000013`) version is deliberately "bulletproof": every insert is wrapped in its own nested `BEGIN...EXCEPTION WHEN OTHERS` so a failure never surfaces as a 500 back to the signup call, only a `RAISE WARNING` in the Postgres logs. Reads `name`/`full_name` from `raw_user_meta_data`, falling back to the email's local part. **Extended `20260812000005`** to also read `phone` from `raw_user_meta_data` (populated by the signup form since that round) and, if present, queue a `welcome_new_user` WhatsApp message. `SECURITY DEFINER` — bypasses RLS, which is required since it runs before the new user's session even exists. |
| `trg_orders_updated_at` | `orders`, `BEFORE UPDATE` | `update_updated_at()` | Generic single-purpose function (`NEW.updated_at := now()`), reused by 9+ tables (`settings`, `profiles`, `navigation_menus`, `brand_settings`, `theme_settings`, `seo_settings`, `carts`, `loyalty_balances`, `customer_notification_preferences`, `popup_promo`, `preloader_settings`). |
| `trg_orders_lifecycle_notify` | `orders`, `BEFORE INSERT OR UPDATE` | `queue_order_lifecycle_notification()` | **The most important trigger in the schema.** On `INSERT`, branches on `payment_method`/`cod_advance_paid` to queue exactly one of `payment_success` (razorpay), `cod_advance_payment` (cod + advance already paid), or `order_placed` (plain cod). On `UPDATE` where `status` actually changed: `PLACED→PACKED` queues `order_confirmed`; `→SHIPPED` queues `order_shipped` **only if `awb_number` is still NULL** (i.e. this is a manual admin status-dropdown change, not a real Shiprocket shipment — the Shiprocket edge function queues that one directly, itself, to avoid a double-send) and stamps `shipped_at` if it was null; `→DELIVERED` queues `order_delivered` **only if `delivered_at` is still NULL** (same manual-vs-Shiprocket-webhook distinction), stamps `delivered_at`, and — since `20260812000005` — inserts a `loyalty_transactions` `'earn'` row (`FLOOR(total/10)` points) for the order's `user_id`, this being the *only* place loyalty points are ever earned; `→CANCELLED` queues `order_cancelled`; `→REFUNDED` queues `refund_approved`. Every branch looks up the template by name, skips silently if it's missing or `is_active=false`, and pulls `customer_name`/`recipient_phone` from `NEW.address`. `SECURITY DEFINER` — this is what lets it write to `notification_queue` despite that table's admin-only RLS, and what lets a plain customer-side `orders` update (e.g. the checkout flow inserting a new order with the anon key) trigger a notification at all. |
| `trg_variant_stock_notify` | `product_variants`, `AFTER UPDATE OF stock` | `queue_stock_notifications()` | See the `product_variants` table entry above — `back_in_stock` to waiting customers, `low_stock_alert` to the store's own number. `SECURITY DEFINER`. |
| `trg_recalc_tier` | `loyalty_balances`, `BEFORE INSERT OR UPDATE OF lifetime_spent` | `recalc_loyalty_tier()` | Recomputes `tier` from `lifetime_spent` (see thresholds under `loyalty_balances`). Extended `20260812000005` to detect a tier-rank increase and queue `loyalty_tier_upgrade`. `SECURITY DEFINER`. |
| `trg_apply_loyalty_tx` | `loyalty_transactions`, `AFTER INSERT` | `apply_loyalty_transaction()` | Upserts the corresponding `loyalty_balances` row — see `loyalty_transactions` entry above for the exact point/spend math. Not `SECURITY DEFINER` (relies on the caller already having write access, which in practice is only ever the `SECURITY DEFINER` order trigger above, since nothing else inserts here). |
| `trg_single_default_address` | `addresses`, `AFTER INSERT OR UPDATE` | `ensure_single_default_address()` | Un-defaults every other address for the same user when one is marked default. Effectively dead code since nothing in the app writes to `addresses` (see §7). |
| `trg_cust_notif_pref_updated_at`, `trg_carts_updated_at`, `trg_brand_settings_updated_at`, `trg_theme_settings_updated_at`, `trg_seo_settings_updated_at`, `trg_settings_updated_at`, `trg_profiles_updated_at`, `trg_nav_updated_at`, `trg_loyalty_balances_updated_at`, `trg_popup_promo_updated_at`, `trg_preloader_settings_updated_at` | each on its own table, `BEFORE UPDATE` | `update_updated_at()` | Same generic timestamp-bump function as `trg_orders_updated_at`. |

---

## 4. Row Level Security — policy summary

Every table has RLS **enabled**; policies fall into four repeating shapes:

1. **"Own rows only"** (customer data): `profiles`, `addresses`, `carts`, `cart_items` (via a subquery on `carts.user_id`), `wishlist_items`, `loyalty_balances` (read-only for the owner), `loyalty_transactions` (read-only), `customer_notification_preferences`, `user_roles` (read-only) — all `USING (user_id = auth.uid())`, plus a companion admin-bypass policy on most of them.
2. **"Public read, admin/staff write"**: every CMS table (`announcement_bars`, `website_sections`, `navigation_menus`, `faq_items`, `testimonials`, `media_assets`, `brand_settings`, `theme_settings`, `seo_settings`, `lookbook_slides`, `community_photos`, `influencer_picks`, `influencer_pick_products`, `section_headings`, `sizes`, `mega_menu_*`, `popup_promo`, `preloader_settings`, `product_variants`, `categories`, `settings`, `coupons`) — `FOR SELECT USING (true)` + `FOR ALL USING (is_admin_or_staff())`. Several of these (the whole CMS batch in `20250516000010`, and the lookbook/community/influencer batch in `20260721000002`) are generated via a `DO $$ ... FOREACH t IN ARRAY [...] ... EXECUTE format(...)` loop rather than one `CREATE POLICY` per table — same effect, less repetition.
3. **"Admin/staff only, no public access at all"**: `notification_templates`, `notification_queue`, `whatsapp_logs`, `marketing_campaigns`, `admin_notifications`, `abandoned_carts`, `content_versions`, `order_items` — `FOR ALL USING (is_admin_or_staff())`, nothing else. This is exactly why any client-side code needing to write to `notification_queue` (e.g. queuing a `payment_failed` message from the browser mid-checkout) **cannot do it directly** — it has to go through a `SECURITY DEFINER` trigger or an edge function using the service-role key.
4. **"Service-role only, zero policies"**: `rate_limits` — RLS is enabled with no policies at all, meaning even the "public read" default doesn't apply; only a request using the service-role key (which bypasses RLS entirely) can touch it.

`orders` itself is **not** covered by the RLS-policy migration file (`20250516000010`, which predates the real `orders` table's creation) — its actual RLS policies were defined later, alongside the table itself, in `20260810000001`: `"orders: own rows"` (`user_id = auth.uid()`, `FOR ALL`) and `"orders: admins all"` (`is_admin_or_staff()`, `FOR ALL`).

---

## 5. Standalone SQL functions (not trigger-bound)

| Function | Returns | Purpose |
|---|---|---|
| `is_admin_or_staff()` | boolean | `EXISTS (... user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff'))`. `STABLE SECURITY DEFINER`. The single most-used helper across every "admin write" RLS policy. |
| `is_admin()` | boolean | Same shape, `role = 'admin'` only (staff excluded) — used for a handful of stricter policies (`settings`, `coupons`, `user_roles` management). |
| `get_user_role(uid uuid)` | `app_role` | Early helper (`20250516000002`), superseded in practice by `get_my_role()` below for frontend use. |
| `get_my_role()` | text | `SELECT role::text FROM user_roles WHERE user_id = auth.uid()`. `STABLE SECURITY DEFINER`, with an explicit `GRANT EXECUTE ... TO authenticated, anon`. This is the one actually called from the frontend — `src/context/AuthContext.tsx`'s `resolveRole()` calls `supabase.rpc("get_my_role")` on every auth state change to decide whether to route a logged-in user as `admin` or `user`. Also used directly inside several later `CREATE POLICY ... USING (get_my_role() = 'admin')` clauses (categories, sizes, mega menu tables, section_headings) as an alternative to `is_admin()`. |
| `purge_expired_rate_limits()` | void | `DELETE FROM rate_limits WHERE window_end < now()`. Not attached to any trigger or `pg_cron` job — dead unless something calls it manually. |

---

## 6. Scheduled jobs (`pg_cron` + `pg_net`)

All three were added in the WhatsApp-automation work and follow the identical shape: a `pg_net.http_post` to a Supabase Edge Function URL, with `CREATE EXTENSION IF NOT EXISTS pg_cron`/`pg_net` and a `DO $$ ... IF EXISTS ... PERFORM cron.unschedule(...) ... $$` guard first so re-running the migration doesn't create a duplicate schedule.

| Job name | Schedule | Calls | Why |
|---|---|---|---|
| `send-whatsapp-queue` | `*/5 * * * *` (every 5 minutes) | `.../functions/v1/send-whatsapp` | Flushes up to 50 `pending` rows from `notification_queue` through Meta's API per run. Added `20260812000001` — **before this, nothing ever called `send-whatsapp` at all**, so even the working triggers just piled up unsent. |
| `abandoned-cart-scan` | `*/15 * * * *` (every 15 minutes) | `.../functions/v1/abandoned-cart-scan` | Scans `carts` for rows untouched past 1h/24h/48h/72h(`'final'`) and queues the matching stage. Added `20260812000003`. |
| `sync-whatsapp-templates` | `0 3 * * *` (daily at 3am) | `.../functions/v1/sync-whatsapp-templates` | Pulls real body text + approval status from Meta into `notification_templates`. Added `20260812000004`. |

**All three require "Enforce JWT Verification" to be turned OFF** for their respective edge function in the Supabase Dashboard — `pg_net.http_post` sends no Supabase auth header, so a function with JWT verification still on will reject every cron-triggered call with 401 before its own code ever runs.

---

## 7. Known drift, dead code, and gotchas

Treat this section as load-bearing — several of these will actively mislead you if you assume "a migration exists for X" means "X works live."

1. **`20250516000001_alter_existing_tables.sql`'s `orders` and `categories` blocks almost certainly no-op'd entirely.** Both tables were confirmed, via direct verification months later, to **not exist live** at the times their dedicated creation migrations (`20260810000001` for orders, `20260719000001` for categories) actually ran — meaning this much earlier `ALTER TABLE` file's `EXCEPTION WHEN undefined_table THEN NULL` almost certainly fired and silently swallowed the whole block for each. Trust the dedicated creation migrations' schemas as authoritative for these two tables, not this file.
2. **`brands` table: existence unverified.** No migration anywhere contains `CREATE TABLE brands`. `products.brand_id` references it. Given the identical "assumed pre-existing, actually wasn't" pattern that hit `orders` and `categories`, treat this as **unverified** until you personally confirm via `SELECT * FROM brands LIMIT 1` in the live database.
3. **`addresses` table and its trigger are fully built and RLS-protected but effectively dead code.** The real checkout flow and `/account` page store addresses in browser `localStorage` (`sd_addresses`) instead, never touching this table.
4. **`admin_notifications` table is fully built but nothing ever inserts into it.** The admin bell notification feature is implemented entirely differently (comparing `orders.created_at` to a localStorage timestamp).
5. **`marketing_campaigns` is decorative.** Creating a campaign in the admin UI writes a `draft` row and nothing more — there is no send pipeline.
6. **`whatsapp_logs.status` is only ever `'sent'`** — the inbound Meta webhook that would populate `'delivered'`/`'read'`/`'failed'` was documented in `SETUP.md` but never built.
7. **The `loyalty_balances`/`loyalty_transactions` pair was completely inert until `20260812000005`** — before that, zero rows were ever inserted by any code path in the app's history, meaning every customer's tier was permanently stuck at the default `'ROOKIE'` regardless of how much they'd actually spent.
8. **Two independent, disagreeing loyalty-tier calculations coexist right now** — the DB (spend-based, ₹2,500/10,000/25,000) and the client (points-based at a different, admin-configurable rate, effectively ₹50,000/150,000/400,000-equivalent). See the `loyalty_balances` entry above. Not resolved.
9. **`rate_limits` has zero RLS policies** — only the service role can touch it, meaning if `src/lib/rateLimit.ts`'s `checkRateLimit`/`recordAttempt` calls run client-side with the anon key (verify this before relying on server-enforced rate limiting), they cannot actually be hitting this table and must be pure `localStorage`.
10. **`supabase/config.toml` and `supabase/README.md` reference a stale Supabase project ID** (`ylnulbqctvvvvygezyik`) that no longer resolves — the real, current project ref is `ablejcrtuiohdrapgacb` (confirmed via the live `.env`). This is almost certainly *why* the original `20260719000001_create_categories_hierarchy.sql` categories work sat unapplied for so long — an old implementation plan told the agent to `supabase link --project-ref ylnulbqctvvvvygezyik` first, which would fail silently against the wrong project. **There is no Supabase CLI available in this project's dev environment at all** — every single migration in this entire history was applied by a human manually pasting the SQL into the Supabase Dashboard's SQL Editor, one file at a time, in order. Any future work assuming `supabase db push` will "just work" is wrong until someone confirms a CLI is installed and linked to the *correct* project ref.
11. **Enum values are permanent.** `section_type` in particular has accumulated one dead value (`instagram_feed`, whose rows were deleted but whose enum value can't be removed) — don't be surprised to see it in a `\dT+ section_type` listing with zero live rows using it.
12. **Two migrations require separate SQL Editor executions**, not one pasted block — see the note at the top of this document.
