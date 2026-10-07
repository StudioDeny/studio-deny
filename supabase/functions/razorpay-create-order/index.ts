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

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    // Rate-limited per caller (or per-IP for anyone without a session) —
    // creating Razorpay orders is free but calls Razorpay's API each time,
    // so an unbounded loop here is a cheap way to hammer that API key.
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authedClient.auth.getUser();
    const rlKey = userData?.user
      ? `razorpay-create-order:${userData.user.id}`
      : `razorpay-create-order:ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
    const windowEnd = new Date(Math.ceil(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: rl } = await supabase.from("rate_limits").select("count").eq("key", rlKey).eq("window_end", windowEnd).maybeSingle();
    if (rl && rl.count >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: "Too many attempts — try again shortly" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    await supabase
      .from("rate_limits")
      .upsert({ key: rlKey, window_end: windowEnd, count: (rl?.count ?? 0) + 1 }, { onConflict: "key,window_end" });

    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Log in to pay" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const razorpayKeyId = requireEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = requireEnv("RAZORPAY_KEY_SECRET");
    const { items, coupon_code = null, payment_type, notes } = await req.json();

    if (!Array.isArray(items) || items.length === 0 || (payment_type !== "full" && payment_type !== "cod_advance")) {
      return new Response(JSON.stringify({ error: "Invalid checkout request" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Price the cart server-side as the customer (auth.uid() inside quote_order).
    const { data: quote, error: quoteErr } = await authedClient.rpc("quote_order", {
      p_items: items,
      p_coupon_code: coupon_code,
    });
    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: quoteErr?.message ?? "Could not price your bag" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (coupon_code && quote.coupon_error) {
      return new Response(JSON.stringify({ error: "coupon_invalid", coupon_error: quote.coupon_error }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (payment_type === "cod_advance" && !quote.cod_available) {
      return new Response(JSON.stringify({ error: "Cash on delivery isn't available for this order" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const chargeRupees = payment_type === "cod_advance" ? Number(quote.cod_advance) : Number(quote.total);
    const amount = Math.round(chargeRupees * 100);
    if (!Number.isInteger(amount) || amount < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", notes, receipt: `rcpt_${Date.now()}` }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("razorpay-create-order: Razorpay API error", res.status, json);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // The orders INSERT policy only accepts an order equal to this stored quote.
    // The cart fingerprint (incl. the server price per line) comes from the
    // same SQL function the policy uses, so the two can never disagree.
    const { data: itemsKey, error: keyErr } = await supabase.rpc("order_items_key", { p_items: quote.lines });
    if (keyErr || typeof itemsKey !== "string") {
      console.error("razorpay-create-order: order_items_key failed", keyErr?.message);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { error: quoteSaveErr } = await supabase.from("payment_quotes").insert({
      razorpay_order_id: json.id,
      user_id: userData.user.id,
      items_key: itemsKey,
      coupon_code: quote.coupon_code,
      subtotal: quote.subtotal,
      loyalty_discount: quote.loyalty_discount,
      coupon_discount: quote.coupon_discount,
      shipping: quote.shipping,
      total: quote.total,
      payment_type,
      cod_advance: quote.cod_advance,
    });
    if (quoteSaveErr) {
      console.error("razorpay-create-order: payment_quotes insert failed", quoteSaveErr.message);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ order_id: json.id, amount: json.amount, currency: json.currency, quote }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("razorpay-create-order uncaught error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
