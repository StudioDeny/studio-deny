# 05 — Shipping: Shiprocket Integration

Four edge functions, one DB migration chain, and full customer-facing cancel/return/replace flows. This document includes the exact account-setup gotchas that were only discovered by direct trial and error against a live Shiprocket account — **read §2 before assuming account setup is "just create an account and get an API key," it is not that simple.**

---

## 1. What's built

| Flow | Trigger | Edge function |
|---|---|---|
| Create shipment + AWB + auto-pickup | Admin clicks "CREATE SHIPMENT" on a `PACKED` order (`/admin/orders`) | `shiprocket-sync` |
| Cancel (forward or reverse, whichever applies) | Customer cancels an order that's `PLACED`/`PACKED`/`SHIPPED` (`/account` or `/order/$id`) | `shiprocket-cancel` |
| Customer-initiated return | Customer requests a return on a `DELIVERED` order, within 7 days (`/account` or `/order/$id`) | `shiprocket-return` |
| Live tracking status | Shiprocket calls this whenever a shipment's status changes | `shiprocket-webhook` |
| Send a replacement instead of refunding | Admin clicks "SEND REPLACEMENT" on a `RECEIVED` return (`/admin/returns`) | *(none — reuses `shiprocket-sync` via the normal create-shipment flow)* |

---

## 2. Account setup — the parts that actually cost real debugging time

### 2.1 You need a dedicated API User, not your main login
Shiprocket's `/auth/login` endpoint **rejects your normal dashboard login credentials** with `403 {"message":"Access forbidden"}` — this looks identical to a generic auth failure but is a completely different problem from a wrong password (a wrong password returns a **different** message: `403 {"message":"Invalid email and password combination"}`). The fix: Shiprocket dashboard → **Settings → Additional Settings → API Users** → **+ Add New API User**. This requires:
- An email **different from your main login email** (Shiprocket enforces this — a Gmail `+` alias like `yourstore+shiprocketapi@gmail.com` works fine and lands in the same inbox).
- A separate password you set for this API user.
- A "Select Modules to Access" list — leaving everything checked (Orders, Settings, Shipments, Listings, Courier) is fine.
- An "Allowed IPs for PII Access" field — leave this **blank**. Supabase Edge Functions have no fixed outbound IP, so restricting this would break every call.

The resulting email+password go into `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD` — not your own dashboard login.

### 2.2 `pickup_location` is not the dashboard nickname you think it is
Once auth works, `/orders/create/adhoc` can still reject with `HTTP 200 {"message":"Wrong pickup location entered. Please choose one location from the data given"}` — a **200**, not an error status, so don't just check `res.ok`. The dashboard shows a pickup address nickname (e.g. "Primary") but that string is **not guaranteed to be what a specific API user's context actually expects** — it can differ per API user's granted access. `shiprocket-sync`'s `getPickupLocationNicknames()` helper handles this by calling `GET /settings/company/pickup` with the same token and surfacing exactly which `pickup_location` values this API user can actually see, appended right onto the error message — so if you ever hit this, **read the error message itself**, it tells you the fix (usually: update `SHIPROCKET_PICKUP_LOCATION` to match the real value returned, which in this project's account turned out to be `"Warehouse"`, not `"Primary"`).

### 2.3 Register the webhook
Shiprocket dashboard → **Settings → API → Webhooks** → set the Webhook URL to:
```
https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/shiprocket-webhook
```
Enable events: Shipment Picked Up, In Transit, Out for Delivery, Delivered, RTO Initiated, RTO Delivered.

## 3. Secrets

| Name | Value |
|---|---|
| `SHIPROCKET_EMAIL` | the **API user's** email (§2.1), not your main login |
| `SHIPROCKET_PASSWORD` | the API user's password |
| `SHIPROCKET_PICKUP_LOCATION` | the exact `pickup_location` string this API user sees (§2.2) — verify via the error-message self-diagnosis if unsure |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are **auto-injected into every edge function by Supabase** — never set these manually (attempting to add a secret with the `SUPABASE_` prefix is actively blocked by the Dashboard).

## 4. `shiprocket-sync` — create shipment

Called from `createShipment(orderId)` in `src/lib/orders.ts`, itself called from `/admin/orders`'s "CREATE SHIPMENT" button when `order.status === "PACKED"`.

Flow:
1. Idempotency check: if `order.awb_number` already exists, return the existing shipment info immediately (no duplicate).
2. `getShiprocketToken()` — logs in.
3. `POST /orders/create/adhoc` with the order's address/items mapped to Shiprocket's field names (`billing_customer_name`, `billing_address`, etc.), `payment_method: "COD"` or `"Prepaid"` based on `order.payment_method`, and a **hardcoded parcel size** (`length: 30, breadth: 25, height: 5`, weight `max(0.5, 0.25 × total item qty)` kg) — there's no real per-product dimension/weight data anywhere in the schema, this is a flat estimate.
4. `POST /courier/assign/awb` with the resulting `shipment_id`.
5. `POST /courier/generate/pickup` — **best-effort**: a failure here (e.g. no pickup slot available today) does not undo the AWB that was already assigned; it's surfaced back to the admin as `pickup_scheduled: false` + a `pickup_error` string, but the shipment stands.
6. Updates the order: `shiprocket_order_id`, `shiprocket_shipment_id`, `awb_number`, `courier_name`, `tracking_url` (format: `https://shiprocket.co/tracking/{awb}`), `shipped_at`, `status: "SHIPPED"` — all in one `UPDATE`.
7. Queues an `order_shipped` WhatsApp notification directly (best-effort, silently skipped if the template row is missing/inactive).

**Note on step 6/7 and the DB trigger**: because this function sets `awb_number` in the *same* `UPDATE` that flips `status` to `SHIPPED`, the `queue_order_lifecycle_notification()` DB trigger (02-DATABASE-SCHEMA.md §3) sees `NEW.awb_number IS NOT NULL` and deliberately **skips** queuing its own `order_shipped` message — this function's own direct queue insert (step 7) is the only one that fires. This is intentional, not a race condition — it's how the codebase avoids double-sending when a real Shiprocket shipment exists vs. when admin just flips the status dropdown manually with no real shipment.

## 5. `shiprocket-cancel` — cancel (forward or reverse)

Called from `cancelOrder(orderId)`, itself called from the cancel button on `/account` and `/order/$id` — only shown for `PLACED`/`PACKED`/`SHIPPED` orders.

**Ownership check** (a pattern reused by every function below that's callable by a plain customer, not just admin): the service-role key needed to actually write regardless of RLS can't tell who's calling, so it re-checks by creating a *second* Supabase client using the anon key **plus the caller's own forwarded `Authorization` header**, and does a `SELECT id FROM orders WHERE id = order_id` through it. If that returns nothing, the customer's own RLS policies (`orders: own rows` / `orders: admins all`, see 02-DATABASE-SCHEMA.md §4) wouldn't have let them see this order either — so the request is rejected with 403 before ever touching the service-role client. This means **the same RLS policy that protects direct table access also protects this edge function**, with zero duplicated business logic.

Flow after the ownership check:
1. Reject if `order.status` isn't one of `PLACED`/`PACKED`/`SHIPPED` (409).
2. If `order.shiprocket_order_id` exists (a real shipment was created): try `POST /orders/cancel` with `{ids: [shiprocket_order_id]}` — this only works **pre-pickup**.
3. **If step 2 fails and an AWB exists** (courier already has the parcel): falls back to `POST /orders/cancel/shipment/awbs` with `{awbs: [awb_number]}` — this is Shiprocket's mechanism for pulling back an already-picked-up shipment, the closest thing to "force an RTO" that their public API exposes. Success here sets `rtoInitiated: true` in the response.
4. Regardless of whether 2/3 succeeded, the order is unconditionally marked `CANCELLED` in the DB — a Shiprocket-side failure never blocks the local cancellation (so refunds aren't stuck waiting on a courier's API).

**Known ceiling, not a bug**: if the parcel is already genuinely in transit / out for delivery, even step 3 can fail — there is no API to force a courier mid-route to reverse. That's a physical logistics limit, not something more code can fix; it becomes a manual "coordinate with the courier" situation. The function still marks the order `CANCELLED` regardless, and logs the failure.

## 6. `shiprocket-return` — customer-initiated return

Called from `requestReturn(orderId, reason?)`, from a "REQUEST RETURN" button shown only on `DELIVERED` orders within 7 days (`RETURN_WINDOW_DAYS = 7`, enforced server-side against `order.delivered_at`, not just hidden client-side).

Guards, in order: same ownership check as `shiprocket-cancel` → order must be `DELIVERED` → no return already in progress (`return_status` must be null or `'PICKUP_FAILED'`, i.e. retryable) → within the 7-day window.

The interesting part is the **reverse address**: a return shipment needs a real destination address for Shiprocket to route the parcel to — `pickup_location` (a nickname) isn't enough for this API, since `/orders/create/return`'s `shipping_*` fields need literal address text. `getPickupAddress()` calls the same `/settings/company/pickup` endpoint used for the pickup-location self-diagnosis (§2.2) and finds the entry matching `SHIPROCKET_PICKUP_LOCATION`, pulling its `address`/`city`/`state`/`pin_code`/`phone`/`email` to build the destination. No extra secrets needed — this is derived live from the same one secret.

Payload shape: `pickup_*` fields = the **customer's** address (courier picks up FROM them), `shipping_*` fields = the **warehouse's** address (courier delivers back TO the store) — inverted from a forward shipment. `payment_method` is hardcoded `"PREPAID"` (a return never involves COD collection). `order_id` sent to Shiprocket is `"{order_number}-RET"` — must differ from the original forward order's `order_id`, since Shiprocket requires uniqueness.

On success: `return_status` becomes `PICKUP_SCHEDULED` (if the pickup-generation step also succeeded) or `REQUESTED` (if not — same best-effort, non-fatal pattern as the forward flow), plus `return_awb_number`/`return_tracking_url`/etc. and — if the customer supplied one — `return_reason`.

## 7. `shiprocket-webhook` — live status updates

No auth check at all (Shiprocket has no HMAC signing on this webhook, unlike Razorpay) and, critically, **"Enforce JWT Verification" must be turned off** for this function in the Supabase Dashboard — Shiprocket's own call carries no Supabase auth header, so a function with JWT verification still on rejects every real webhook call with 401 before its code ever runs.

Because a shipment's AWB and a return's AWB are stored in **different columns** (`awb_number` vs `return_awb_number`), the webhook looks up by `awb_number` first, and if nothing matches, tries `return_awb_number` — `isReturnLeg` tracks which one hit so the rest of the function branches correctly:
- **Forward leg, status contains "delivered" (and not "rto")**: `status → DELIVERED`, stamps `delivered_at`. This is what makes the customer-facing "REQUEST RETURN" button possible in the first place (it gates on `status === "DELIVERED"`), and — since `20260812000005` — is also what makes a loyalty-points-earning transaction fire (see 02-DATABASE-SCHEMA.md's order trigger).
- **Forward leg, status contains "rto"**: stamps `rto_initiated_at` (only if not already set).
- **Forward leg, "picked"/"transit"/"out for delivery"**: `status → SHIPPED` (only if not already `DELIVERED` — a late-arriving "in transit" event after delivery shouldn't regress the status).
- **Return leg, "delivered" (not rto)**: `return_status → RECEIVED` — this is the exact signal that makes an order show up in `/admin/returns`' "Ready to Refund" bucket.
- **Return leg, "picked"/"transit"**: `return_status → PICKUP_SCHEDULED` (only if not already `RECEIVED`).

Also queues `order_delivered` **only** on the forward-leg delivered transition (never on the return leg — a return being received doesn't mean the customer should get a "your order was delivered, leave a review" message).

Shiprocket's webhook payload field names have varied across API versions in practice — the code reads every alias observed: `body.awb ?? body.awb_code ?? body.current_awb`, and `body.current_status ?? body.shipment_status ?? body.status`.

## 8. Sending a replacement instead of refunding

Not an edge function — a plain client-side flow, admin-only, from `/admin/returns` once a return's `return_status === 'RECEIVED'`. Two steps, run back to back from the "SEND REPLACEMENT" button:

1. `createReplacementOrder(originalOrderId)` (`src/lib/orders.ts`) — clones the original order's `items`/`address` into a **brand-new** order row: `subtotal` = original's subtotal (for accurate invoice record-keeping), `discount` = the **same** amount (making `total = 0` — recorded as a full discount rather than silently zeroing the subtotal, so the invoice reads as "free replacement," not "free item"), `status: "PACKED"` (skips `PLACED`, ready to ship immediately), `notes: "Replacement for order {order_number} (return)"`. Also links the **original** order: `return_status → 'REPLACED'`, `replacement_order_id → {new order id}`.
2. Immediately calls `createShipment(newOrderId)` — the **exact same** `shiprocket-sync` function used for any normal order — which creates a real Shiprocket shipment and schedules a real pickup to the customer's address, no new code path needed.

The customer sees this on their order page: once `return_status === 'REPLACED'`, the "RETURN" card shows a **"VIEW REPLACEMENT"** link straight to the new order instead of a tracking link for the (now-moot) return.

## 9. Deploying

No CLI — every one of these four functions is deployed by pasting its full `index.ts` contents into the Supabase Dashboard's Edge Functions code editor for that function name and clicking Deploy. `shiprocket-webhook` additionally needs its JWT verification toggled off (§7); the other three keep JWT verification on (they're only ever called by your own logged-in browser session, via `supabase.functions.invoke(...)`, which forwards the session's auth header automatically).
