# 04 — Payments: Razorpay Integration

Full payment flow for Studio Deny. Covers both a straight prepaid order and the COD-with-advance-payment variant. Written from having built/verified this flow directly against the live Supabase project — code excerpts below are the exact current file contents, not paraphrased.

---

## 1. Account setup (do this first)

1. Go to `dashboard.razorpay.com` → **Settings → API Keys**.
2. Generate a key pair. Use **Test mode** keys first (`rzp_test_...`), switch to **Live** keys (`rzp_live_...`) only once you're ready to take real payments.
3. Copy both:
   - **Key ID** — safe to expose client-side (it's the publishable key).
   - **Key Secret** — shown once, server-side only, never in any `VITE_`-prefixed variable.

## 2. Where each secret goes

| Name | Value | Where |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_...` or `rzp_test_...` | Supabase → Edge Functions → Secrets |
| `RAZORPAY_KEY_SECRET` | (the secret) | Supabase → Edge Functions → Secrets |
| `VITE_RAZORPAY_KEY_ID` | same value as `RAZORPAY_KEY_ID` | Vercel project env vars (or local `.env`) — this one **is** meant to be public, it ends up in the client bundle |

**Why the key ID is duplicated in two places**: the Key ID by itself can only ever *initiate* a checkout (the Razorpay JS widget needs it to open), it can't move money or read account data without the Secret — so it's safe to ship to the browser. The Secret signs/verifies everything server-side and must never leave Supabase's edge function secrets.

`src/lib/razorpay.ts:7-8` reads the client-side key with a hardcoded test-key fallback:
```ts
export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) || "rzp_test_Smq00oQl4okg6L";
```

## 3. Edge functions

Two functions, both in `supabase/functions/`, both currently reading secrets at **module load time** (`const X = Deno.env.get("X")!` at the top of the file, outside the request handler). **This is the exact crash-before-try/catch anti-pattern that was found and fixed on every Shiprocket/WhatsApp function this session** (a missing/renamed secret crashes before the handler's own `try/catch` ever runs, and Supabase reports it as an opaque `EDGE_FUNCTION_ERROR` with no diagnostic detail) — **these two were never touched and still have the bug**. If you ever see an unexplained opaque crash from either of these, this is almost certainly why; the fix is the same `requireEnv()`-inside-the-handler pattern documented in 07-EDGE-FUNCTIONS-AND-SECRETS.md.

### `razorpay-create-order`
Full current source (`supabase/functions/razorpay-create-order/index.ts`):
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { amount, currency = "INR", notes } = await req.json();

    if (!Number.isInteger(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency, notes, receipt: `rcpt_${Date.now()}` }),
    });

    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json.error?.description ?? "Razorpay order creation failed" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ order_id: json.id, amount: json.amount, currency: json.currency }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
```
**Called by:** anyone, unauthenticated (no ownership/auth check exists — same trust level as an anonymous form submission). Takes an amount in paise + optional `notes` object, creates a real order on Razorpay's side via HTTP Basic Auth (`base64(key_id:key_secret)`), returns Razorpay's own `order_id` to the browser. The browser never sees the secret.

**⚠️ Abuse-vector note (pre-existing, not introduced by this session's work):** since this endpoint is fully unauthenticated and takes an arbitrary amount, anyone could call it repeatedly to create empty Razorpay orders — low real-world impact (no charge happens until a human completes payment in the widget) but worth knowing before assuming it's fully safe.

### `razorpay-verify-payment`
Full current source (`supabase/functions/razorpay-verify-payment/index.ts`):
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ verified: false, error: "Missing fields" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const expected = await hmacSha256Hex(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET);
    const verified = expected === razorpay_signature;

    return new Response(JSON.stringify({ verified }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ verified: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
```
**What it does**: recomputes the HMAC-SHA256 of `"{razorpay_order_id}|{razorpay_payment_id}"` using the secret key, and compares it byte-for-byte against the `razorpay_signature` Razorpay's checkout widget handed back to the browser. This is the standard Razorpay integrity check — it proves the payment response actually came from Razorpay and wasn't fabricated by someone tampering with the client. **The order is only ever created in the database (`createOrder()`, see below) after this returns `verified: true`** — the browser's own "payment succeeded" callback is never trusted on its own.

**Called by:** anyone, unauthenticated — same as above. It's a pure verification function with no side effects (no DB write, no state), so there's nothing meaningful to abuse; worst case is someone brute-forcing signatures, which is computationally infeasible.

## 4. Client-side flow (`src/lib/razorpay.ts`)

```ts
export type RzpOpts = {
  amountPaise: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  onSuccess: (paymentId: string) => void | Promise<void>;
  onDismiss: () => void;
  onVerifyFailed: (message: string) => void;
};
```

`openRazorpay(opts)`:
1. Lazy-loads the Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`) once per page load, caching the load promise so repeat calls don't re-inject the script.
2. Calls `razorpay-create-order` to get a real Razorpay `order_id`.
3. Opens the Razorpay `Checkout` widget (`new Razorpay({...}).open()`), themed `{ color: "#ff3b1f" }`.
4. On the widget's own `handler` (payment succeeded from the browser's perspective): calls `razorpay-verify-payment`. If `verified` isn't `true`, calls `opts.onVerifyFailed(message)` **and** fires a best-effort `queue-payment-failed` notification (see 06-WHATSAPP-META.md) — the checkout UI's own error handling is never blocked waiting on that notification call. Only if verified does it call `opts.onSuccess(paymentId)`.
5. `rzp.on("payment.failed", ...)` (a genuine card-decline/failure from Razorpay's side, not a verification mismatch): logs it and fires the same `queue-payment-failed` notification.
6. `modal: { ondismiss: opts.onDismiss, backdropclose: false, escape: true }` — closing the modal without paying calls `onDismiss`, but a stray click outside the modal (`backdropclose: false`) does not accidentally dismiss it.

## 5. Checkout flow (`src/routes/checkout.tsx`) — two branches

Both branches build the same `address` object from the form (`{name, phone, line1, city, state, pincode}`) and both eventually call `createOrder()` from `src/lib/orders.ts` — the **only** place an `orders` row is ever inserted from checkout. `createOrder()` itself does two things: inserts the `orders` row (id generated client-side as `"SD" + Date.now().toString(36).toUpperCase()`), then a best-effort insert into `order_items` (warns on failure, doesn't roll back the order).

### Branch A — full prepaid (Razorpay)
```
amountPaise = total × 100
openRazorpay({ ..., onSuccess: () => createOrder({ ...payment_method: "razorpay" }) })
```
On success: `createOrder(...)` with `payment_method: "razorpay"`, no `cod_advance_*` fields. The `queue_order_lifecycle_notification()` DB trigger sees `payment_method='razorpay'` on `INSERT` and queues a `payment_success` WhatsApp message.

### Branch B — Cash on Delivery, with a mandatory advance
COD is gated behind `settings.cod_enabled` / `cod_min_order` / `cod_advance_percent` (read via `supabase.from("settings")` in `checkout.tsx:83`, singleton row — see 02-DATABASE-SCHEMA.md). When available:
```
codAdvance = total × (cod_advance_percent / 100)
amountPaise = codAdvance × 100   // only the ADVANCE goes through Razorpay, not the full total
openRazorpay({
  ..., description: `COD Advance — ${items.length} item(s)`,
  notes: { city, pincode, payment_type: "cod_advance" },
  onSuccess: () => createOrder({ ..., payment_method: "cod", cod_advance_paid: true, cod_advance_amount: codAdvance }),
})
```
The remainder of the order total is collected physically on delivery — outside this app entirely, no code path for it. The trigger sees `payment_method='cod' AND cod_advance_paid=true` and queues `cod_advance_payment` (worded as "we've received your advance," **not** "please pay an advance" — by the time this trigger fires, the Razorpay advance payment has already succeeded).

Both branches wrap the Razorpay call in a rate limiter (`checkRateLimit("checkout", 5, 30*60*1000, 30*60*1000)` — max 5 checkout attempts per 30 minutes, client-side via `src/lib/rateLimit.ts`) to slow down repeated failed/abandoned attempts.

## 6. Test card

For test-mode keys: card `4111 1111 1111 1111`, any future expiry, any 3-digit CVV. Razorpay's test mode never actually charges anything regardless of card entered, as long as the key pair is `rzp_test_...`.

## 7. What happens after payment succeeds — the full downstream chain

1. `createOrder()` inserts the `orders` row.
2. The `trg_orders_lifecycle_notify` DB trigger (see 02-DATABASE-SCHEMA.md §3) fires on that `INSERT`, queuing exactly one WhatsApp template depending on the branch above.
3. Every 5 minutes, the `send-whatsapp-queue` cron job invokes the `send-whatsapp` edge function, which actually calls Meta's API for any `pending` row (see 06-WHATSAPP-META.md).
4. The order now shows up in `/admin/orders`, starts at status `PLACED`, and proceeds through the normal fulfillment lifecycle documented in 05-SHIPPING-SHIPROCKET.md.

## 8. Deploying/updating these functions

No Supabase CLI is available in this project's dev environment (see 07-EDGE-FUNCTIONS-AND-SECRETS.md for why) — every deploy is a manual paste into the Supabase Dashboard's Edge Functions code editor. `SETUP.md` documents the CLI-based commands (`npx supabase functions deploy razorpay-create-order`, etc.) as the theoretical path if a CLI ever gets linked, but in practice this project has only ever used the Dashboard paste-and-deploy workflow.
