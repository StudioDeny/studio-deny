import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OrderItemLine = { slug: string; name: string; qty: number; price: number };
type OrderAddress = { name: string; phone: string; line1: string; city: string; state: string; pincode: string };

// Reading env vars and constructing the Supabase client used to happen at
// module load time — if any secret was missing, createClient() throws
// *before* the request handler (and its try/catch) ever runs, which Supabase
// reports as an opaque EDGE_FUNCTION_ERROR with no useful detail. Doing it
// all inside the handler means every possible failure is one we catch and
// report clearly.
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}. Add it in Supabase → Edge Functions → Secrets.`);
  return v;
}

async function getShiprocketToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.token) {
    console.error("Shiprocket login failed:", res.status, JSON.stringify(json));
    throw new Error(json.message ?? `Shiprocket login failed (HTTP ${res.status}) — check SHIPROCKET_EMAIL/PASSWORD`);
  }
  return json.token as string;
}

function formatOrderDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const srEmail = requireEnv("SHIPROCKET_EMAIL");
    const srPassword = requireEnv("SHIPROCKET_PASSWORD");
    const srPickupLocation = requireEnv("SHIPROCKET_PICKUP_LOCATION");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ ok: false, error: "order_id is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ ok: false, error: "Order not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Idempotent — a shipment already exists for this order, don't create a duplicate.
    if (order.awb_number) {
      return new Response(
        JSON.stringify({ ok: true, awb: order.awb_number, courier_name: order.courier_name, tracking_url: order.tracking_url }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const token = await getShiprocketToken(srEmail, srPassword);
    const address = order.address as OrderAddress;
    const items = order.items as OrderItemLine[];
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const phoneDigits = (address.phone ?? "").replace(/[^0-9]/g, "").slice(-10);

    const createRes = await fetch(`${SR_BASE}/orders/create/adhoc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_number,
        order_date: formatOrderDate(new Date()),
        pickup_location: srPickupLocation,
        billing_customer_name: address.name,
        billing_last_name: "",
        billing_address: address.line1,
        billing_city: address.city,
        billing_pincode: address.pincode,
        billing_state: address.state,
        billing_country: "India",
        billing_email: order.user_email,
        billing_phone: phoneDigits,
        shipping_is_billing: true,
        order_items: items.map((i) => ({
          name: i.name,
          sku: i.slug,
          units: i.qty,
          selling_price: i.price,
        })),
        payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
        sub_total: Number(order.subtotal),
        length: 30,
        breadth: 25,
        height: 5,
        weight: Math.max(0.5, 0.25 * totalQty),
      }),
    });

    const createJson = await createRes.json();
    const shipmentId = createJson.shipment_id ?? createJson.payload?.shipment_id;
    const shiprocketOrderId = createJson.order_id ?? createJson.payload?.order_id;

    if (!createRes.ok || !shipmentId) {
      console.error("Shiprocket order creation failed:", createRes.status, JSON.stringify(createJson));
      const message = createJson.message ?? JSON.stringify(createJson.errors ?? createJson);
      return new Response(JSON.stringify({ ok: false, error: `Shiprocket order creation failed (HTTP ${createRes.status}): ${message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const awbRes = await fetch(`${SR_BASE}/courier/assign/awb`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });
    const awbJson = await awbRes.json();
    const awbData = awbJson.response?.data ?? awbJson.data ?? {};
    const awbCode = awbData.awb_code;
    const courierName = awbData.courier_name;

    if (!awbRes.ok || !awbCode) {
      console.error("AWB assignment failed:", awbRes.status, JSON.stringify(awbJson));
      const message = awbJson.message ?? JSON.stringify(awbJson);
      return new Response(JSON.stringify({ ok: false, error: `AWB assignment failed (HTTP ${awbRes.status}): ${message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;

    await supabase
      .from("orders")
      .update({
        shiprocket_order_id: String(shiprocketOrderId ?? ""),
        shiprocket_shipment_id: String(shipmentId),
        awb_number: awbCode,
        courier_name: courierName ?? null,
        tracking_url: trackingUrl,
        shipped_at: new Date().toISOString(),
        status: "SHIPPED",
      })
      .eq("id", order_id);

    // Queue the WhatsApp "order shipped" notification (sent by the existing
    // send-whatsapp function on its next run) — best-effort, doesn't fail
    // the shipment creation if the template lookup or insert fails.
    try {
      const { data: template } = await supabase
        .from("notification_templates")
        .select("id")
        .eq("template_name", "order_shipped")
        .maybeSingle();
      if (template) {
        await supabase.from("notification_queue").insert({
          template_id: template.id,
          recipient_phone: address.phone,
          order_id: order.id,
          variables: { order_number: order.order_number, tracking_url: trackingUrl },
        });
      }
    } catch {
      // notification queueing is best-effort
    }

    return new Response(
      JSON.stringify({ ok: true, awb: awbCode, courier_name: courierName, tracking_url: trackingUrl }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shiprocket-sync uncaught error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
