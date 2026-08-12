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

    const razorpayKeyId = requireEnv("RAZORPAY_KEY_ID");
    const razorpayKeySecret = requireEnv("RAZORPAY_KEY_SECRET");
    const { amount, currency = "INR", notes } = await req.json();

    if (!Number.isInteger(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        notes,
        receipt: `rcpt_${Date.now()}`,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("razorpay-create-order: Razorpay API error", res.status, json);
      return new Response(JSON.stringify({ error: "Could not start payment" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ order_id: json.id, amount: json.amount, currency: json.currency }),
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
