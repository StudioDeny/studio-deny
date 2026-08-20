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

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

// Called directly from the browser when a Razorpay payment fails or its
// signature can't be verified — there's no order row yet at that point (an
// order is only ever created after a successful, verified payment), so
// there's nothing for a DB trigger to hang off. Used to accept any
// {phone, name} from anyone with no auth at all, letting anyone spam any
// number with real WhatsApp messages — now requires a real signed-in
// session and rate-limits per user.
serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Sign in required" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const windowEnd = new Date(Math.ceil(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
    const rlKey = `payment-failed:${userData.user.id}`;
    const { data: rl } = await supabase.from("rate_limits").select("count").eq("key", rlKey).eq("window_end", windowEnd).maybeSingle();
    if (rl && rl.count >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ ok: false, error: "Too many attempts — try again shortly" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    await supabase
      .from("rate_limits")
      .upsert({ key: rlKey, window_end: windowEnd, count: (rl?.count ?? 0) + 1 }, { onConflict: "key,window_end" });

    const { phone, name } = await req.json();
    const digits = String(phone ?? "").replace(/[^0-9]/g, "").slice(-10);
    if (digits.length !== 10) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid phone number" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: template } = await supabase
      .from("notification_templates")
      .select("id")
      .eq("template_name", "payment_failed")
      .eq("is_active", true)
      .maybeSingle();

    if (template) {
      await supabase.from("notification_queue").insert({
        template_id: template.id,
        recipient_phone: digits,
        order_id: null,
        variables: { customer_name: name || "there", retry_url: "https://studiodeny.com/checkout" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("queue-payment-failed error:", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
