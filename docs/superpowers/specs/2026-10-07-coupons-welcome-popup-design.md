# Coupons, Welcome Offer & Signup Popup — Design

Date: 2026-10-07 · Status: draft, awaiting owner review

## 1. What the owner asked for

- A **signup popup** shown to visitors who are not logged in. Signup collects
  name, email, phone and password (option A — no OTP).
- Every **new customer gets a unique coupon code**, tied to their account.
  The discount is picked at random using admin-set targets, e.g. 80 % → 5 % off,
  15 % → 10 % off, 5 % → 15 % off. Discount amounts, tiers and target
  percentages are all edited in admin.
- **General coupons** that admin creates, activates/deactivates, deletes and
  limits by number of uses.
- Customer applies a code at checkout and gets the discount.
- Customer can **edit their info** and keep **several delivery addresses, each
  with its own phone number**.
- **Everything is admin-controlled**: popup text, colours, background (plain
  colour / image / video), buttons, timing, coupon rules. Nothing hard-coded.

Explicitly out of scope (owner decisions, 2026-10-07):
- OTP and multi-account abuse prevention. Multiple accounts per person are
  acceptable to the business.
- Email verification. Signup logs the user in immediately.
- **Any change to the loyalty system.** Loyalty discount, tiers and settings
  stay exactly as they are.
- Changing email from the account page. Users edit name, phone and addresses.

## 2. Facts from the current codebase that shape this

- `coupons` table already exists (percent/fixed, min_order, max_uses, used_count,
  is_active, expires_at) with a `public_coupons` view. No UI uses it.
  `orders.coupon_code` column exists.
- Checkout requires login, so every coupon use is tied to a known user.
- **Checkout computes the total in the browser, and `razorpay-create-order`
  charges whatever amount the browser sends.** The orders INSERT policy already
  checks item prices (`items_match_catalog_prices`) and the loyalty discount
  (`discount = customer_loyalty_discount(auth.uid(), subtotal)`, migration
  20260812000009), but nothing checks that `total` = subtotal − discount +
  shipping, or that `subtotal` = sum of items. Coupons built on the browser's
  number could be forged. This design computes the amount to charge on the
  server, **reusing `customer_loyalty_discount` unchanged** — loyalty
  behaviour, tiers and settings are not modified.
- An admin-editable loyalty popup (`popup_promo`) already exists and shows to
  everyone once per browser.
- Saved addresses live in `localStorage` (`sd_addresses`), even though an
  `addresses` table exists in the database.

## 3. Data model (one migration)

### 3.1 `coupons` — extended

New columns on the existing table:

| column | type | meaning |
|---|---|---|
| `kind` | `'general' \| 'welcome'` | welcome = auto-issued to one new user |
| `assigned_user_id` | uuid null | welcome coupons: the only user who may use it |
| `welcome_tier_id` | uuid null | which tier produced it (for stats) |
| `description` | text null | admin note, shown in admin only |
| `starts_at` | timestamptz null | not valid before this |
| `max_discount` | numeric null | ₹ cap for percent coupons |
| `per_user_limit` | int null | times one customer may use it (null = unlimited) |
| `first_order_only` | bool, default false | valid only if the user has no previous paid order |

Unique index: one welcome coupon per user
(`assigned_user_id` where `kind = 'welcome'`).

### 3.2 `coupon_redemptions` — new

`id, coupon_id (FK, ON DELETE SET NULL), code (text snapshot), user_id,
order_id, discount_amount, created_at`. Unique `(coupon_id, order_id)`.
Deleting a coupon keeps its redemption history (code is snapshotted).

### 3.3 `welcome_offer_settings` — new singleton

`enabled, code_prefix (default 'DENY'), valid_days (null = never expires),
min_order, max_discount, first_order_only`.
These are copied onto each welcome coupon at issue time, so changing settings
later does not silently change codes already handed out.

### 3.4 `welcome_offer_tiers` — new

`id, label, discount_type (percent|fixed), discount_value, target_percent,
sort_order, is_active`. Seeded with the owner's sample: 5 % / 80, 10 % / 15,
15 % / 5. Admin can add, edit, remove tiers.

### 3.5 `signup_popup` — new singleton (all admin-editable)

- **Behaviour:** `enabled`, `delay_seconds`, `show_on` (`all` | `home`),
  `reshow_after_hours` (how long after a dismissal before it shows again),
  `show_media_on_mobile`.
- **Layout:** two panels like the reference: media/brand panel + form panel.
  `layout` (`media_left` | `media_right` | `form_only`).
- **Media panel background:** `bg_type` (`color` | `image` | `video`),
  `bg_color`, `bg_image_url`, `bg_video_url`, `overlay_color`,
  `overlay_opacity`, `logo_url`.
- **Media panel text:** `heading`, `heading_color`, `subheading`,
  `subheading_color`.
- **Form panel:** `form_bg_color`, `form_text_color`, `form_title`,
  `form_subtitle`, placeholders for name/email/phone/password,
  `submit_text`, `submit_bg_color`, `submit_text_color`, `login_link_text`,
  `terms_text`.
- **Success screen:** `success_heading`, `success_body` (supports `{code}` and
  `{discount}` tokens), `copy_button_text`, `cta_text`, `cta_href`.

Colours are free hex values picked in admin with a colour input.

### 3.6 `addresses` — existing table, now actually used

Already has `name, phone, line1, line2, city, state, pincode, is_default`.
RLS: users manage only their own rows.

## 4. Welcome coupon issuance

- A Postgres function `issue_welcome_coupon(user_id)` runs from the existing
  new-user trigger (the one that creates `profiles`). It covers email signups
  and Google signups alike. Accounts that existed before launch get nothing.
- It picks a tier by weighted random over active tiers using `target_percent`
  as the weight. If weights don't sum to 100 the function still works
  (it normalises); the admin screen refuses to save unless they sum to 100.
- Code format: `<prefix>-<6 chars>` from an unambiguous alphabet
  (no 0/O/1/I), retried on collision. Example: `DENY-7KX2QM`.
- Idempotent: the unique index stops a second welcome coupon for a user.
- If welcome offer is disabled, no coupon is issued.

## 5. Checkout

### 5.1 Customer experience

- A "Have a coupon?" field with **Apply**. One coupon per order.
- If the user owns an unused, valid welcome coupon, it is shown as a one-tap
  suggestion: "Your welcome offer DENY-7KX2QM — 10 % off · APPLY".
- Clear errors: invalid, expired, not started, minimum order ₹X, already used,
  usage limit reached, belongs to another account, first order only.
- The order summary shows the coupon line and the server-confirmed total.

### 5.2 Server-computed total

- New RPC `quote_order(p_items, p_coupon_code)`, run as the logged-in user:
  `subtotal` from real database prices × qty; `loyalty_discount` from the
  existing `customer_loyalty_discount(auth.uid(), subtotal)`; `coupon_discount`
  after checking every rule in §3.1; `shipping` with today's rule (0 when
  subtotal − both discounts ≥ `loyalty_settings.free_shipping`, else 99);
  `total`; `cod_advance` from `settings.cod_advance_percent`. Returns the coupon
  error (if any) alongside a coupon-less quote, so checkout can show both.
- `razorpay-create-order` stops trusting the browser's `amount`. It takes
  `items`, `coupon_code` and `payment_type` (`full` | `cod_advance`), calls
  `quote_order` with the caller's session, and charges the quoted amount.
- `razorpay-create-order` stores the quote it charged for in a new
  service-role-only table `payment_quotes`, keyed by the Razorpay order id
  (user, items key, coupon code, every money field, payment type).
- New column `orders.coupon_discount`. The orders INSERT policy additionally
  requires the order to match the stored quote for its payment exactly
  (same user, items, coupon code, subtotal, coupon discount, shipping, total,
  COD advance). A customer cannot pay for one cart/coupon and save another.
- An AFTER INSERT trigger on orders with a `coupon_code` records a
  `coupon_redemptions` row and increments `used_count` under a row lock.
- If a coupon became invalid between payment and order save (e.g. the last use
  was taken seconds earlier), the order is **still saved and the discount
  honoured**, because the customer has already paid the quoted amount. Worst
  case a limit is exceeded by one use. Never fail an order after payment.

### 5.3 Coupon + loyalty discount

Loyalty is untouched. Both apply, each calculated on the item subtotal:
`total = subtotal − loyalty discount − coupon discount + shipping`.
Shipping uses the existing free-shipping rule on `subtotal − both discounts`.
Admin limits the combined cost with each coupon's `max_discount` and
`min_order`.

## 6. Signup popup (storefront)

- Shown only to logged-out visitors, after `delay_seconds`, on the pages set by
  `show_on`. Dismissal is remembered per browser for `reshow_after_hours`.
  It never shows on `/login`, `/signup`, `/checkout` or admin routes.
- The existing loyalty popup then shows only to logged-in users, so a visitor
  never gets both.
- Form: name, email, phone (10 digits), password, with the same validation as
  `/signup`, plus a "Log in" link.
- Existing email → "You already have an account — log in", no coupon.
- On success the user is logged in immediately (no email verification) and
  sees the success screen with their code, a **COPY** button and the CTA. The
  code is also kept in the account page.
- Mobile: full-width sheet; media panel hidden unless `show_media_on_mobile`.

## 7. Admin screens

1. **Coupons** (`/admin/coupons`) — table with code, kind, discount, uses /
   limit, status, expiry; filter by kind and status; create/edit form with every
   §3.1 field; activate/deactivate toggle; delete with confirmation; per-coupon
   redemption list (customer, order, amount, date).
2. **Welcome offer** (`/admin/welcome-offer`) — settings from §3.3; tiers
   editor with live "total = 100 %" check; stats per tier: target % vs actual %
   issued, and how many were redeemed.
3. **Signup popup** (`/admin/signup-popup`) — every §3.5 field, grouped like
   the existing popup screen, with a live preview and a desktop/mobile toggle.

All three get entries in the admin sidebar and the admin search index.

## 8. Account page

- **Profile:** edit name and phone.
- **Addresses:** moved from `localStorage` to the `addresses` table; add, edit,
  delete, set default; each address has its own phone. Existing
  `localStorage` addresses are imported once on first load, then cleared.
- **Checkout** lists saved addresses to pick from, with "use a new address"
  and "save this address".
- **My coupons:** welcome code (unused / used / expired) with copy, plus coupons
  the user has redeemed.

## 9. Testing

The project has no automated test runner. Verification per step:
`tsc --noEmit`, `vite build`, migrations applied to a Supabase branch/dev DB,
SQL checks of `issue_welcome_coupon` distribution (issue 1,000 to dummy IDs in
a transaction, compare to targets, roll back) and `quote_order` edge cases
(expired, not started, min order, total limit, per-user limit, other user's
code, first order only, ₹ cap, free-shipping boundary, forged total rejected),
then a manual end-to-end run: signup via popup → code shown → checkout with
code → Razorpay test payment → order shows the discount → admin sees the
redemption.

## 10. Build order

1. Migration (tables, columns, functions, trigger, RLS).
2. Server total: `quote_order` + `razorpay-create-order` + order policy/trigger.
3. Checkout coupon UI.
4. Admin: coupons, welcome offer.
5. Signup popup + admin editor.
6. Account: profile, DB addresses, my coupons; checkout address picker.
