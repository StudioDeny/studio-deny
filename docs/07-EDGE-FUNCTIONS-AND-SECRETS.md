# 07 — Edge Functions & Secrets: Master Reference

A single consolidated table of every Supabase Edge Function in this project, every secret, and the deployment mechanics — cross-referencing 04/05/06 for the per-integration detail. Read this first if you just need "what secret goes where" without wading through the full integration docs.

---

## 1. There is no Supabase CLI in this project's dev environment

Every single edge function and every single database migration in this project's entire history has been deployed by a human **manually pasting code into the Supabase Dashboard** — there is no `supabase functions deploy`, no `supabase db push` that has ever actually run against the real project. `supabase/config.toml` still references a **stale, dead project ref** (`ylnulbqctvvvvygezyik`) — the real, live project is `ablejcrtuiohdrapgacb` (`https://ablejcrtuiohdrapgacb.supabase.co`). This stale ref is almost certainly *why* an early categories-table migration sat unapplied for months (an old plan told an agent to `supabase link --project-ref ylnulbqctvvvvygezyik` first, which would fail against the real project).

**Practical consequence for any future work**: never assume a CLI command will "just work." Every SQL migration goes to **Supabase Dashboard → SQL Editor**, pasted and run manually, in filename order. Every edge function goes to **Supabase Dashboard → Edge Functions**, either editing an existing function's code in place or creating a new one, pasting the full `index.ts` contents, and clicking Deploy.

## 2. Every edge function

| Function | Purpose | Auth model | JWT verification | Cron? |
|---|---|---|---|---|
| `razorpay-create-order` | Creates a real order on Razorpay's side, returns its `order_id` | None — fully unauthenticated | On (irrelevant, no check performed) | No |
| `razorpay-verify-payment` | HMAC-verifies a completed payment's signature | None — fully unauthenticated, but it's a pure verification function with no side effects | On (irrelevant) | No |
| `shiprocket-sync` | Creates a Shiprocket shipment + AWB + pickup for a `PACKED` order | Called only from the admin's own logged-in session | **On** | No |
| `shiprocket-cancel` | Cancels an order (and its Shiprocket shipment if one exists) | Ownership-checked via the caller's own JWT against RLS (see 05-SHIPPING-SHIPROCKET.md §5) | **On** | No |
| `shiprocket-return` | Creates a reverse shipment for a customer return | Same ownership-check pattern as `shiprocket-cancel` | **On** | No |
| `shiprocket-webhook` | Receives live status updates from Shiprocket | None — Shiprocket has no HMAC signing on this webhook | **Off** (required — Shiprocket sends no Supabase auth header) | No (called by Shiprocket, not by us) |
| `send-whatsapp` | Flushes pending `notification_queue` rows to Meta's API | None — internal, cron-only | **Off** (required) | Every 5 min |
| `abandoned-cart-scan` | Finds stale carts, queues 1h/24h/48h/final nudges | None — internal, cron-only | **Off** (required) | Every 15 min |
| `sync-whatsapp-templates` | Pulls real template body/status from Meta | None — internal, cron/manual-button only | **Off** (required for the cron path — the manual "SYNC FROM META" button in `/admin/notifications` also works fine with it off, since it just calls the same function) | Daily at 3am |
| `queue-payment-failed` | Queues a `payment_failed` WhatsApp notice | None at all — no order exists yet to check ownership against (see 06-WHATSAPP-META.md §4 for the risk note) | On (irrelevant — no check performed regardless) | No |

**"Enforce JWT Verification" toggle location**: Supabase Dashboard → Edge Functions → (function name) → its own settings page. Get this wrong and the symptom is silent: a cron-triggered function that has JWT verification **on** will reject the `pg_net.http_post` call with a bare 401 before any of its own code — including its own `try/catch` — ever executes, so you won't see a helpful error, just "nothing happened, no logs I understand."

## 3. Every secret, consolidated

| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | every function | **Auto-injected** — never set manually, and the Dashboard actively blocks creating a custom secret with the `SUPABASE_` prefix |
| `SUPABASE_SERVICE_ROLE_KEY` | every function | Auto-injected, same as above |
| `SUPABASE_ANON_KEY` | `shiprocket-cancel`, `shiprocket-return` | Auto-injected — used deliberately here (not the service key) to re-check the caller's own RLS-visible access, see 05-SHIPPING-SHIPROCKET.md §5 |
| `RAZORPAY_KEY_ID` | `razorpay-create-order` | See 04-PAYMENTS-RAZORPAY.md |
| `RAZORPAY_KEY_SECRET` | `razorpay-create-order`, `razorpay-verify-payment` | Same |
| `SHIPROCKET_EMAIL` | `shiprocket-sync`, `shiprocket-cancel`, `shiprocket-return` | Must be a dedicated **API User**'s email, not the main dashboard login — see 05-SHIPPING-SHIPROCKET.md §2.1 |
| `SHIPROCKET_PASSWORD` | same three | Same API User's password |
| `SHIPROCKET_PICKUP_LOCATION` | `shiprocket-sync`, `shiprocket-return` | The exact `pickup_location` string this specific API user's context accepts — **not necessarily the dashboard nickname**, see 05-SHIPPING-SHIPROCKET.md §2.2 |
| `WHATSAPP_ACCESS_TOKEN` | `send-whatsapp`, `sync-whatsapp-templates` | Permanent System User token with **both** `whatsapp_business_messaging` and `whatsapp_business_management` permissions — see 06-WHATSAPP-META.md §1.2 |
| `WHATSAPP_PHONE_NUMBER_ID` | `send-whatsapp` | The real (production) phone number ID, not the Getting-Started test one, once you're past initial testing |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `sync-whatsapp-templates` | The WABA ID — see 06-WHATSAPP-META.md §1.4 |

No secrets are needed for `shiprocket-webhook` or `queue-payment-failed` beyond the auto-injected Supabase ones.

## 4. The single most important lesson learned this session: read secrets INSIDE the request handler

Every function above was written (or, for the two Razorpay functions, **should be but currently is not** — see the flag below) with this shape:
```ts
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}. Add it in Supabase → Edge Functions → Secrets.`);
  return v;
}

serve(async (req) => {
  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    // ... all other requireEnv() calls also happen here, inside the try ...
  } catch (err) {
    // this DOES catch a missing secret, and returns a clear, readable error
  }
});
```
**Never do this instead** (reading secrets or constructing the Supabase client at module scope, outside the handler):
```ts
// ❌ WRONG — every one of the WhatsApp/Shiprocket functions started this way and had to be fixed
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(SUPABASE_URL, ...);
serve(async (req) => { try { ... } catch { ... } });
```
If a secret referenced at module scope is missing, the `!`-asserted `undefined` (or the `createClient()` call itself) throws **before `serve`'s handler — and therefore its `try/catch` — ever runs.** Supabase reports this as an opaque `EDGE_FUNCTION_ERROR` with a tiny, unhelpful response body, visible only via Invocations → Raw as `sb_error_code: "EDGE_FUNCTION_ERROR"` — no indication of *which* secret, or that it's a secrets problem at all. This exact bug was hit and fixed on `shiprocket-sync`, `shiprocket-webhook`, and `send-whatsapp` during this project's build. **`razorpay-create-order` and `razorpay-verify-payment` were never touched during that fix round and still have the module-scope pattern today** — they happen to work because their two secrets have always been present, but if either secret is ever accidentally deleted/renamed, expect this exact opaque failure mode, not a clear error.

## 5. `supabase.functions.invoke()`'s other gotcha: non-2xx responses hide the real error body

On the **client** side (`src/lib/orders.ts`, `src/lib/razorpay.ts`, `src/routes/admin.notifications.tsx`), every call to `supabase.functions.invoke(...)` that might return a non-2xx status follows this pattern to recover the actual error message, since supabase-js's default behavior on a non-2xx response is to hand back a generic `"Edge Function returned a non-2xx status code"` and leave the real JSON body **unparsed** on `error.context` (a `Response` object):
```ts
const { data, error } = await supabase.functions.invoke("some-function", { body: {...} });
if (error) {
  let message = error.message;
  try {
    const context = (error as unknown as { context?: Response }).context;
    const body = await context?.clone().json();
    if (body?.error) message = body.error;
  } catch {
    // fall back to the generic message
  }
  throw new Error(message);
}
```
**Any new client-side call to an edge function that can return a non-2xx status needs this same extraction**, or the UI will only ever show the generic Supabase message regardless of how specific the function's own error text is. This was itself a real, fixed bug on the WhatsApp sync button (`admin.notifications.tsx`'s "SYNC FROM META" originally lacked this and only showed the generic message).

## 6. Cron jobs, consolidated

All three configured via `pg_cron` + `pg_net` (see 02-DATABASE-SCHEMA.md §6 for the exact SQL) — none require a secret of their own, they just POST to a public function URL with no auth header, which is why those three functions must have JWT verification off.

| Job | Schedule | Function |
|---|---|---|
| `send-whatsapp-queue` | every 5 min | `send-whatsapp` |
| `abandoned-cart-scan` | every 15 min | `abandoned-cart-scan` |
| `sync-whatsapp-templates` | daily 3am | `sync-whatsapp-templates` |

## 7. CORS

Every function that's ever called directly from the browser (i.e. everything except the three cron-only ones, though those also include it defensively) starts with:
```ts
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  // ...
});
```
and every `Response` returned includes `...CORS_HEADERS` in its headers. Any new function callable from the browser needs this same preflight short-circuit or the browser will block the real request before it's even sent.
