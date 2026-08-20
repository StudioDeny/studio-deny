import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://studiodeny.com", "https://www.studiodeny.com", "http://localhost:5173"];
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare — the previous `expected === signature` bails
// out on the first mismatched character, which leaks (via timing) how many
// leading hex characters an attacker has already guessed correctly.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// A valid HMAC alone only proves Razorpay issued *some* signature for this
// order/payment pair — it doesn't prove the payment actually captured, or
// for how much. Fetching the payment back from Razorpay's API is what lets
// `orders` INSERT RLS (verified_payments, 20260812000007) trust the amount.
async function fetchCapturedPayment(
  paymentId: string,
  keyId: string,
  keySecret: string
): Promise<{ amount: number; status: string; order_id: string } | null> {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return { amount: json.amount, status: json.status, order_id: json.order_id };
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const razorpayKeyId = requireEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = requireEnv("RAZORPAY_KEY_SECRET");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ verified: false, error: "Missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const expected = await hmacSha256Hex(`${razorpay_order_id}|${razorpay_payment_id}`, razorpayKeySecret);
    if (!timingSafeEqual(expected, razorpay_signature)) {
      return new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const payment = await fetchCapturedPayment(razorpay_payment_id, razorpayKeyId, razorpayKeySecret);
    if (!payment || payment.order_id !== razorpay_order_id || payment.status !== "captured") {
      console.error("razorpay-verify-payment: signature ok but payment not captured", {
        razorpay_payment_id,
        payment,
      });
      return new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { error: upsertErr } = await supabase.from("verified_payments").upsert(
      {
        payment_id: razorpay_payment_id,
        razorpay_order_id,
        amount_paise: payment.amount,
      },
      { onConflict: "payment_id", ignoreDuplicates: true }
    );
    if (upsertErr) console.error("razorpay-verify-payment: verified_payments upsert failed", upsertErr.message);

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("razorpay-verify-payment uncaught error:", err);
    return new Response(JSON.stringify({ verified: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
