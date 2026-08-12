# 06 — WhatsApp Automation: Meta Business API Integration

Studio Deny's WhatsApp system is built around one shared pipeline: every trigger anywhere in the app inserts a row into `notification_queue`; a single cron job flushes that queue to Meta's API every 5 minutes. This document covers the Meta-side setup, every edge function, every trigger, and the honest state of what's real vs. decorative — a lot of this feature area has table/UI scaffolding that was built long before it was actually wired up to send anything.

---

## 1. Meta Developer / Business setup

### 1.1 Create the app
1. `developers.facebook.com` → **My Apps → Create App** → type **Business** → name it whatever your store is.
2. Add the **WhatsApp** product to the app.
3. **WhatsApp → Getting Started** gives you a **test phone number** and a **temporary access token** immediately — enough to send test messages to a handful of verified recipient numbers you add manually in that same screen. This is fine for initial testing but:
   - The temporary token **expires in ~24 hours**.
   - The test number can **only** message numbers you've explicitly verified in that screen — never real, arbitrary customers.

### 1.2 Get a permanent token (required before anything beyond testing)
1. `business.facebook.com` → **Business Settings → Users → System Users** → create one (e.g. "Store API").
2. Give it **admin** access to the app.
3. Under that system user → **Generate New Token** → select the app → check **both**:
   - `whatsapp_business_messaging` — required to actually send messages.
   - `whatsapp_business_management` — required for `sync-whatsapp-templates` to read template list/status via the Graph API. **These are two separate permissions** — a token scoped to only the first will make `sync-whatsapp-templates` fail with a Meta permissions error while sending still works fine. If you ever see that function fail specifically, check this first.
4. This token does not expire (unlike the Getting-Started one) — this is what goes into `WHATSAPP_ACCESS_TOKEN`.

### 1.3 Get a real (non-test) phone number
The Getting Started phone number ID only works for verified test recipients. To message real customers: same page → **Step 2: Production setup** → register your actual business WhatsApp number. This gives you a **different** `WHATSAPP_PHONE_NUMBER_ID` than the test one.

### 1.4 Find your WABA ID
Needed for `sync-whatsapp-templates`. Visible on the same "Try it out" screen as "WhatsApp Business Account ID," or via Business Settings → Accounts → WhatsApp Accounts.

## 2. Secrets

| Name | Value | Used by |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | the permanent System User token (§1.2) | `send-whatsapp`, `sync-whatsapp-templates` |
| `WHATSAPP_PHONE_NUMBER_ID` | the real (or test) phone number ID | `send-whatsapp` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | the WABA ID (§1.4) | `sync-whatsapp-templates` |

**Historical note if you ever see conflicting names in old docs/commits**: the very first version of `send-whatsapp` read `WHATSAPP_TOKEN` (no `_ACCESS_`) — this was a real bug (secret-name mismatch between the code and what `SETUP.md` told you to set) that got fixed by standardizing on `WHATSAPP_ACCESS_TOKEN` everywhere. If you're ever debugging a "missing secret" error and the Dashboard shows a secret under one name that the code reads under a slightly different one, that's the class of bug to look for.

## 3. Every template actually in use

All of these are seeded into `notification_templates` by migrations, but **seeding the row is not the same as the template existing/being approved on Meta** — you still have to create and submit each one in `business.facebook.com → WhatsApp Manager → Message Templates`, choosing category **Utility** for anything transactional (order updates) and **Marketing** for the abandoned-cart sequence (Meta reviews Marketing templates more strictly). Variables must be created in this exact order — Meta only knows `{{1}}, {{2}}, {{3}}...` positionally, our `variables` array is purely our own bookkeeping for what each position means.

| `template_name` | Body | Variables (in order) | Category |
|---|---|---|---|
| `order_placed` | Hi {{1}}! Your order {{2}} has been placed. Total: ₹{{3}}. We'll confirm it shortly. | customer_name, order_number, total | Utility |
| `payment_success` | Payment confirmed! Hi {{1}}, we received ₹{{2}} for your order {{3}}. Time to get it packed. | customer_name, total, order_number | Utility |
| `cod_advance_payment` | Hi {{1}}, we've received your ₹{{3}} advance for order {{2}}. The rest is payable on delivery. | customer_name, order_number, advance_amount | Utility |
| `order_confirmed` | Hi {{1}}! Your order {{2}} has been confirmed. Total: ₹{{3}}. We'll notify you when it ships. | customer_name, order_number, total | Utility |
| `order_shipped` | Your order {{1}} is on its way! Track it here: {{2}} | order_number, tracking_url | Utility |
| `order_delivered` | Your order {{1}} has been delivered. Hope you love it! Leave a review: {{2}} | order_number, review_url | Utility |
| `order_cancelled` | Hi {{1}}, your order {{2}} has been cancelled. If you were charged, a refund will follow. | customer_name, order_number | Utility |
| `refund_approved` | Hi {{1}}, we've refunded ₹{{2}} for your order {{3}}. It will reflect in 5–7 business days. | customer_name, amount, order_number | Utility |
| `payment_failed` | Hi {{1}}, your payment didn't go through. Please retry here: {{2}}. Your bag is still saved. | customer_name, retry_url | Utility |
| `return_requested` | Your return for order {{1}} has been picked up. Track it here: {{2}} | order_number, tracking_url | Utility |
| `welcome_new_user` | Welcome to Studio Deny, {{1}}! Start exploring the drop: {{2}} | customer_name, shop_url | Utility |
| `back_in_stock` | Good news {{1}} — {{2}} is back in stock! Grab it before it sells out again: {{3}} | customer_name, product_name, product_url | Utility |
| `low_stock_alert` | Heads up — {{1}} is down to {{2}} unit(s) left. Restock soon: {{3}} | product_name, qty, product_url | Utility (this one goes to **you**, not a customer) |
| `loyalty_tier_upgrade` | Congrats {{1}}! You've been upgraded to {{2}} tier. See your new perks: {{3}} | customer_name, tier_name, perks_url | Utility |
| `abandoned_cart_1h` | Hey {{1}}, you left something in your bag! Come finish checking out: {{2}} | customer_name, cart_url | Marketing |
| `abandoned_cart_24h` | Still thinking it over, {{1}}? Your bag is still waiting for you: {{2}} | customer_name, cart_url | Marketing |
| `abandoned_cart_48h` | Last call, {{1}} — your bag is about to expire. Grab it before it sells out: {{2}} | customer_name, cart_url | Marketing |
| `abandoned_cart_final` | Last chance, {{1}} — your bag expires soon. Don't miss out: {{2}} | customer_name, cart_url | Marketing |

Meta approval typically takes 24–48h. Submit all of them at once.

**A dead orphan worth knowing about**: the very first seed migration (`20250516000011`) created a template called `abandoned_cart_reminder` (`is_active: false`) — this name is never referenced by any trigger and doesn't match SETUP.md's documentation either. It's a leftover from an early design that was superseded by the `abandoned_cart_1h/24h/48h/final` sequence. Ignore it; don't confuse it with the real ones.

## 4. Edge functions

### `send-whatsapp` — the only function that actually calls Meta's send API
No request body needed — triggered purely by the cron. Pulls up to 50 `status='pending'` rows from `notification_queue` (joined to `notification_templates` for the real `template_name`), and for each one calls `POST https://graph.facebook.com/v19.0/{phone_number_id}/messages` with:
```json
{
  "messaging_product": "whatsapp",
  "to": "<digits-only phone>",
  "type": "template",
  "template": { "name": "<template_name>", "language": {"code": "en"}, "components": [{"type": "body", "parameters": [{"type": "text", "text": "<value>"}, ...]}] }
}
```
Parameter order = `Object.values(variables)` insertion order — this is exactly why every trigger that builds a `variables` object must build it with keys in the **same order** as the template's `{{1}}, {{2}}...` positions; there's no explicit position mapping, it's purely object key insertion order. On success: `notification_queue.status → 'sent'` + a `whatsapp_logs` row (`status: 'sent'`, always — see 02-DATABASE-SCHEMA.md, nothing ever writes `'delivered'`/`'read'`). On failure: `status → 'failed'` + `error_message`. **A single message's failure never stops the batch** — it just moves to the next of the 50.

### `sync-whatsapp-templates` — the fix for a real UX bug
Before this existed, `/admin/notifications`' Templates tab let an admin edit `body_text`/`variables` directly — but **that never had any effect on what Meta actually sends**, since Meta always uses its own server-side approved copy of a template, matched purely by `template_name`. Editing the local row was a complete no-op disguised as a working feature. This function fixes that by making the local table a genuine mirror: paginates through `GET /{waba_id}/message_templates` (Meta's Graph API, up to 10 pages of 100), and for each template returned, extracts the `BODY` component's text and counts `{{n}}` placeholders. If a matching local row exists **and its variable count still matches**, its existing semantic variable names (`customer_name`, etc.) are preserved; otherwise it falls back to generic `param_1, param_2...` (Meta's API has no way to tell us what a parameter *means*, only that it exists). Brand-new templates discovered on Meta's side that have no local row get inserted with `is_active: false` (an admin must explicitly opt in before anything will queue against them). Any local row that used to sync successfully but is no longer returned by Meta gets `meta_status → 'MISSING'` — this is real signal that something on Meta's side was deleted or renamed. `is_active` itself is **never touched** by this sync — that stays the admin's manual on/off switch, orthogonal to Meta's own approval state.

### `abandoned-cart-scan` — see 02-DATABASE-SCHEMA.md's `carts`/`cart_items` for the persistence side of this (built the same session as the notification triggers, since cart abandonment can't be detected without a persisted cart in the first place). Full logic:
1. Pulls every `carts` row with `updated_at` older than 1 hour (the cheapest possible pre-filter).
2. For each, computes `ageMs` and finds the **oldest-first** matching stage from `[final(72h), 48h, 24h, 1h]` — checking oldest-first (not `1h` first) means a cart that's been quiet for 3 days gets its `final` message immediately, not a backlog of all 4 in sequence, even if a cron run was somehow missed.
3. Skips if that stage (or a later one) was already sent (`STAGE_RANK` comparison against `carts.last_abandoned_stage`).
4. Skips (silently, counted in `skipped`) if: the cart is now empty (checked out or cleared — nothing to nudge), no phone exists anywhere (`profiles.phone` first, falling back to the user's most recent order's `address.phone`), the customer explicitly opted out (`customer_notification_preferences.wa_abandoned_cart === false`), or the relevant template row is missing/inactive.
5. On success: queues the notification, **also** logs a snapshot into `abandoned_carts` (product slug/name/image/size/qty/price + computed `total_value`) — the first time that table has ever been populated — and stamps `carts.last_abandoned_stage`/`last_notified_at`.

### `queue-payment-failed` — the one trigger with no order row to hang off
Called directly from the browser (`src/lib/razorpay.ts`, both the `payment.failed` native event and a failed signature-verification response) rather than a DB trigger, because at that point in the flow **no order has been created yet** — `createOrder()` only ever runs after a verified success. Takes `{phone, name}` from the browser, sanitizes the phone to exactly 10 digits (rejects otherwise), queues `payment_failed` with a hardcoded `retry_url: "https://studiodeny.com/checkout"`.
**⚠️ No auth check at all** — anyone can call this with an arbitrary phone number, since there's no order/payment attempt to verify against at this point in the flow. Low real-world risk for a small store (worst case: someone gets an unsolicited "your payment failed" WhatsApp message), but it's a genuine unauthenticated write path, not something to copy-paste into a higher-stakes context without adding verification.

## 5. Where triggers actually live (cross-reference)

Almost none of the trigger logic lives in these edge functions — they only *send*. The actual *decision to queue* happens in three places, fully detailed in 02-DATABASE-SCHEMA.md §3:
- `queue_order_lifecycle_notification()` DB trigger on `orders` — `order_placed`, `payment_success`, `cod_advance_payment`, `order_confirmed`, `order_cancelled`, `refund_approved` (and `order_shipped`/`order_delivered` for the manual-status-dropdown path only — the Shiprocket edge functions queue those two directly for the real-shipment path, see 05-SHIPPING-SHIPROCKET.md §4/§7).
- `queue_stock_notifications()` DB trigger on `product_variants` — `back_in_stock`, `low_stock_alert`.
- `recalc_loyalty_tier()` DB trigger on `loyalty_balances` — `loyalty_tier_upgrade`.
- `handle_new_user()` DB trigger on `auth.users` — `welcome_new_user`.
- Direct inserts from `shiprocket-sync`/`shiprocket-webhook`/`shiprocket-return` — `order_shipped` (real shipment), `order_delivered`, `return_requested`.

This "queue via DB trigger with `SECURITY DEFINER`, send via a completely separate cron-driven function" split is deliberate: `notification_queue` has admin-only RLS (see 02-DATABASE-SCHEMA.md §4), so a plain customer-side insert (e.g. checkout creating an order with the anon key) could never write to it directly — only a `SECURITY DEFINER` trigger or the service-role key can.

## 6. Cross-cutting known gaps (be honest about these, don't assume they're built)

- **`whatsapp-webhook`, `process-queue` — documented in `SETUP.md`, never actually built.** No such files exist in `supabase/functions/`. `whatsapp-webhook` would have been the inbound Meta delivery-status receiver (which is why `whatsapp_logs.status` is stuck at `'sent'` forever, see 02-DATABASE-SCHEMA.md). `process-queue` is superseded in practice by `send-whatsapp` itself now also being the queue processor (it always was, technically — the name in SETUP.md implied a separate function that never existed as such).
- **Marketing Campaigns tab (`/admin/notifications` → Campaigns) is fully decorative** — see 02-DATABASE-SCHEMA.md's `marketing_campaigns` entry. Creating a campaign there does nothing beyond saving a draft row.
- **The Usage tab** (`/admin/notifications` → Usage) shows real message counts from `whatsapp_logs` (all-time, this-month, per-month history) but **deliberately does not compute a cost estimate on its own** — Meta's actual per-message billing rate depends on country/category and changes over time, so the tab instead lets the admin type in their own known rate (persisted to `localStorage`, key `sd_wa_rate_per_message`) and multiplies that against the real counts. Don't be tempted to hardcode a rate here in a future session; ask the operator for their current Meta-dashboard rate instead.
- **`customer_notification_preferences` has no UI anywhere** — the one field that's actually read (`wa_abandoned_cart`) can only ever be set by someone running raw SQL. If a future ask is "let customers opt out of abandoned-cart texts," this is the column to write to, but the UI doesn't exist yet.

## 7. Deploying

Same as everywhere else in this project — no CLI, paste each function's full `index.ts` into the Supabase Dashboard and deploy. **`send-whatsapp`, `abandoned-cart-scan`, and `sync-whatsapp-templates` all additionally need "Enforce JWT Verification" turned off** (they're called by `pg_cron`/`pg_net`, which sends no Supabase auth header) — `queue-payment-failed` keeps JWT verification on since it's called via `supabase.functions.invoke()` from the browser, which forwards the session automatically (though note it has no *ownership* check even with JWT verification on, per §4 above — verification just confirms *a* valid session exists, not that the caller has any particular right to the phone number they're submitting).
