import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";
const RETURN_WINDOW_DAYS = 7;

const ALLOWED_ORIGINS = ["https://studiodeny.com", "https://www.studiodeny.com", "http://localhost:5173"];
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

type OrderItemLine = { slug: string; name: string; qty: number; price: number };
type OrderAddress = { name: string; phone: string; line1: string; city: string; state: string; pincode: string };
type PickupAddress = {
  pickup_location?: string;
  name?: string;
  address?: string;
  address_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  phone?: string;
  email?: string;
};

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
    throw new Error(json.message ?? `Shiprocket login failed (HTTP ${res.status})`);
  }
  return json.token as string;
}

// The return order's "shipping" (destination) address has to be our actual
// warehouse address — Shiprocket's pickup_location nickname alone isn't
// enough here, so pull the full registered address for that nickname.
async function getPickupAddress(token: string, pickupLocation: string): Promise<PickupAddress | undefined> {
  const res = await fetch(`${SR_BASE}/settings/company/pickup`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  const list: PickupAddress[] = json.data?.shipping_address ?? [];
  return list.find((a) => a.pickup_location === pickupLocation);
}

function formatOrderDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Customer requests a return on a DELIVERED order → creates a reverse
// shipment on Shiprocket (pickup FROM the customer, delivery TO our
// warehouse), assigns an AWB, and schedules the pickup — no manual step in
// the Shiprocket dashboard, same shape as shiprocket-sync/shiprocket-cancel.
serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const srEmail = requireEnv("SHIPROCKET_EMAIL");
    const srPassword = requireEnv("SHIPROCKET_PASSWORD");
    const srPickupLocation = requireEnv("SHIPROCKET_PICKUP_LOCATION");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, reason } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ ok: false, error: "order_id is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Same ownership check as shiprocket-cancel: ask again as the caller's
    // own JWT — if RLS wouldn't let them see this order, they can't request
    // a return on it either.
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: allowed } = await authedClient.from("orders").select("id").eq("id", order_id).maybeSingle();
    if (!allowed) {
      return new Response(JSON.stringify({ ok: false, error: "Not authorized to request a return on this order" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ ok: false, error: "Order not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "DELIVERED") {
      return new Response(JSON.stringify({ ok: false, error: `Order is ${order.status} — returns can only be requested once an order is DELIVERED` }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (order.return_status && order.return_status !== "PICKUP_FAILED") {
      return new Response(JSON.stringify({ ok: false, error: `A return is already ${order.return_status} for this order` }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (order.delivered_at) {
      const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
        return new Response(JSON.stringify({ ok: false, error: `The ${RETURN_WINDOW_DAYS}-day return window has passed for this order` }), {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const token = await getShiprocketToken(srEmail, srPassword);
    const warehouse = await getPickupAddress(token, srPickupLocation);
    if (!warehouse) {
      return new Response(JSON.stringify({ ok: false, error: `Could not find the "${srPickupLocation}" pickup address on Shiprocket to use as the return destination` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const address = order.address as OrderAddress;
    const items = order.items as OrderItemLine[];
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const customerPhoneDigits = (address.phone ?? "").replace(/[^0-9]/g, "").slice(-10);
    const warehousePhoneDigits = (warehouse.phone ?? "").replace(/[^0-9]/g, "").slice(-10);

    const createRes = await fetch(`${SR_BASE}/orders/create/return`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: `${order.order_number}-RET`,
        order_date: formatOrderDate(new Date()),
        pickup_customer_name: address.name,
        pickup_last_name: "",
        pickup_address: address.line1,
        pickup_city: address.city,
        pickup_state: address.state,
        pickup_country: "India",
        pickup_pincode: address.pincode,
        pickup_email: order.user_email,
        pickup_phone: customerPhoneDigits,
        shipping_customer_name: warehouse.name ?? "Studio Deny",
        shipping_address: warehouse.address ?? "",
        shipping_city: warehouse.city ?? "",
        shipping_state: warehouse.state ?? "",
        shipping_country: warehouse.country ?? "India",
        shipping_pincode: warehouse.pin_code ?? "",
        shipping_email: warehouse.email ?? order.user_email,
        shipping_phone: warehousePhoneDigits,
        order_items: items.map((i) => ({
          name: i.name,
          sku: i.slug,
          units: i.qty,
          selling_price: i.price,
          qc_enable: false,
        })),
        payment_method: "PREPAID",
        sub_total: Number(order.subtotal),
        length: 30,
        breadth: 25,
        height: 5,
        weight: Math.max(0.5, 0.25 * totalQty),
      }),
    });

    const createJson = await createRes.json();
    const shipmentId = createJson.shipment_id ?? createJson.payload?.shipment_id;
    const shiprocketReturnOrderId = createJson.order_id ?? createJson.payload?.order_id;

    if (!createRes.ok || !shipmentId) {
      console.error("Shiprocket return order creation failed:", createRes.status, JSON.stringify(createJson));
      const message = createJson.message ?? JSON.stringify(createJson.errors ?? createJson);
      return new Response(JSON.stringify({ ok: false, error: `Shiprocket return creation failed (HTTP ${createRes.status}): ${message}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
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
      console.error("Return AWB assignment failed:", awbRes.status, JSON.stringify(awbJson));
      const message = awbJson.message ?? JSON.stringify(awbJson);
      return new Response(JSON.stringify({ ok: false, error: `Return AWB assignment failed (HTTP ${awbRes.status}): ${message}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;

    // Ask the courier to actually go collect the parcel from the customer —
    // best-effort, same as the forward pickup in shiprocket-sync.
    let pickupScheduled = false;
    let pickupError: string | undefined;
    try {
      const pickupRes = await fetch(`${SR_BASE}/courier/generate/pickup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      const pickupJson = await pickupRes.json();
      if (pickupRes.ok && pickupJson.pickup_status !== 0) {
        pickupScheduled = true;
      } else {
        pickupError = pickupJson.message ?? `HTTP ${pickupRes.status}`;
        console.error("Return pickup generation failed:", pickupRes.status, JSON.stringify(pickupJson));
      }
    } catch (e) {
      pickupError = e instanceof Error ? e.message : String(e);
      console.error("Return pickup generation threw:", pickupError);
    }

    await supabase
      .from("orders")
      .update({
        return_status: pickupScheduled ? "PICKUP_SCHEDULED" : "REQUESTED",
        return_reason: reason ?? null,
        return_requested_at: new Date().toISOString(),
        shiprocket_return_order_id: String(shiprocketReturnOrderId ?? ""),
        shiprocket_return_shipment_id: String(shipmentId),
        return_awb_number: awbCode,
        return_courier_name: courierName ?? null,
        return_tracking_url: trackingUrl,
      })
      .eq("id", order_id);

    // Best-effort WhatsApp notice — no-op if this template hasn't been
    // created (same guarded pattern as order_shipped/order_delivered).
    try {
      const { data: template } = await supabase
        .from("notification_templates")
        .select("id")
        .eq("template_name", "return_requested")
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
      JSON.stringify({
        ok: true,
        return_awb: awbCode,
        return_courier_name: courierName,
        return_tracking_url: trackingUrl,
        pickup_scheduled: pickupScheduled,
        pickup_error: pickupError,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shiprocket-return uncaught error:", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
