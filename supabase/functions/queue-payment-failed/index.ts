import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}. Add it in Supabase → Edge Functions → Secrets.`);
  return v;
}

// Called directly from the browser when a Razorpay payment fails or its
// signature can't be verified — there's no order row yet at that point (an
// order is only ever created after a successful, verified payment), so
// there's nothing for a DB trigger to hang off. Best-effort: a failure here
// should never block the checkout UI from showing its own error message.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { phone, name } = await req.json();
    const digits = String(phone ?? "").replace(/[^0-9]/g, "").slice(-10);
    if (digits.length !== 10) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid phone number" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
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
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("queue-payment-failed error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
