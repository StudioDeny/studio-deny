import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shiprocket has no HMAC signing on this webhook (unlike Razorpay) — there's
// nothing to cryptographically verify the sender with. We just process
// whatever arrives; a bad/unmatched AWB is a no-op below, not a security hole.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const body = await req.json();
    // Shiprocket's webhook field names have varied across their API versions —
    // read every alias we've seen documented.
    const awb: string | undefined = body.awb ?? body.awb_code ?? body.current_awb;
    const statusText: string = String(body.current_status ?? body.shipment_status ?? body.status ?? "").toLowerCase();

    if (!awb) {
      return new Response(JSON.stringify({ ok: true, skipped: "no awb in payload" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("awb_number", awb).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ ok: true, skipped: "no matching order for this awb" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {};
    if (body.courier_name && !order.courier_name) update.courier_name = body.courier_name;

    if (statusText.includes("delivered") && !statusText.includes("rto")) {
      update.status = "DELIVERED";
      update.delivered_at = new Date().toISOString();
    } else if (statusText.includes("rto")) {
      update.rto_initiated_at = order.rto_initiated_at ?? new Date().toISOString();
    } else if (statusText.includes("picked") || statusText.includes("transit") || statusText.includes("out for delivery")) {
      if (order.status !== "DELIVERED") update.status = "SHIPPED";
    }

    if (Object.keys(update).length > 0) {
      await supabase.from("orders").update(update).eq("id", order.id);
    }

    // Queue "order delivered" WhatsApp notification exactly once, on the
    // transition into DELIVERED.
    if (update.status === "DELIVERED") {
      try {
        const { data: template } = await supabase
          .from("notification_templates")
          .select("id")
          .eq("template_name", "order_delivered")
          .maybeSingle();
        if (template) {
          const address = order.address as { phone: string };
          await supabase.from("notification_queue").insert({
            template_id: template.id,
            recipient_phone: address.phone,
            order_id: order.id,
            variables: { order_number: order.order_number, review_url: `https://studiodeny.com/order/${order.id}` },
          });
        }
      } catch {
        // best-effort
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
