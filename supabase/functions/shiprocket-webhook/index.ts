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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Shiprocket has no HMAC signing on this webhook (unlike Razorpay), so there
// was nothing verifying the sender — anyone who found this URL could flip
// any order to DELIVERED/SHIPPED/RTO by AWB and trigger real customer
// WhatsApp messages. Shiprocket's dashboard (Settings → Webhooks) lets you
// configure a token sent as a header — "Auth Token Type: x-api-key" is what
// we check here; set the "Token" field there to SHIPROCKET_WEBHOOK_SECRET.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const webhookSecret = requireEnv("SHIPROCKET_WEBHOOK_SECRET");
    const suppliedSecret = req.headers.get("x-api-key") ?? "";
    if (!timingSafeEqual(suppliedSecret, webhookSecret)) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Constructed inside the handler (not at module load) so a missing
    // secret is a caught, readable error instead of an opaque
    // EDGE_FUNCTION_ERROR from a crash before this try/catch even runs.
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
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

    // Could be a forward shipment (customer-bound) or a return shipment
    // (warehouse-bound) — each has its own AWB column, so check both.
    const { data: forwardOrder } = await supabase.from("orders").select("*").eq("awb_number", awb).maybeSingle();
    const order = forwardOrder ?? (await supabase.from("orders").select("*").eq("return_awb_number", awb).maybeSingle()).data;
    const isReturnLeg = !forwardOrder && !!order;

    if (!order) {
      return new Response(JSON.stringify({ ok: true, skipped: "no matching order for this awb" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {};

    if (isReturnLeg) {
      if (body.courier_name && !order.return_courier_name) update.return_courier_name = body.courier_name;
      // "Delivered" on the return leg means the parcel arrived back at our
      // warehouse — that's what makes it ready for the admin to refund.
      if (statusText.includes("delivered") && !statusText.includes("rto")) {
        update.return_status = "RECEIVED";
        update.return_received_at = new Date().toISOString();
      } else if (statusText.includes("picked") || statusText.includes("transit")) {
        if (order.return_status !== "RECEIVED") update.return_status = "PICKUP_SCHEDULED";
      }
    } else {
      if (body.courier_name && !order.courier_name) update.courier_name = body.courier_name;

      if (statusText.includes("delivered") && !statusText.includes("rto")) {
        update.status = "DELIVERED";
        update.delivered_at = new Date().toISOString();
      } else if (statusText.includes("rto")) {
        update.rto_initiated_at = order.rto_initiated_at ?? new Date().toISOString();
      } else if (statusText.includes("picked") || statusText.includes("transit") || statusText.includes("out for delivery")) {
        if (order.status !== "DELIVERED") update.status = "SHIPPED";
      }
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
    console.error("shiprocket-webhook uncaught error:", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
