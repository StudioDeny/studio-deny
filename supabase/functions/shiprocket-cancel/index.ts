import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Cancels the order on Shiprocket's side (if a shipment was ever created for
// it) and marks it CANCELLED in our DB — one call from the customer-facing
// "Cancel order" button, no manual cleanup in the Shiprocket dashboard.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ ok: false, error: "order_id is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Cancelling needs the service-role key (to call Shiprocket + write the
    // row regardless of RLS), but that key can't tell us who's asking. Ask
    // again as the caller's own JWT — if RLS ("own rows" or "admins all")
    // wouldn't let them see this order, they can't cancel it either.
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: allowed } = await authedClient.from("orders").select("id").eq("id", order_id).maybeSingle();
    if (!allowed) {
      return new Response(JSON.stringify({ ok: false, error: "Not authorized to cancel this order" }), {
        status: 403,
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

    // Cancel covers PLACED/PACKED/SHIPPED (auto-cancelling the shipment if
    // one exists). Once DELIVERED the parcel is already with the customer —
    // that needs a return/RTO flow, not a cancel — and CANCELLED/REFUNDED
    // are already terminal.
    if (!["PLACED", "PACKED", "SHIPPED"].includes(order.status)) {
      return new Response(JSON.stringify({ ok: false, error: `Order is ${order.status} and can no longer be cancelled` }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let shiprocketCancelled = false;
    let shiprocketCancelError: string | undefined;
    let rtoInitiated = false;

    if (order.shiprocket_order_id) {
      try {
        const srEmail = requireEnv("SHIPROCKET_EMAIL");
        const srPassword = requireEnv("SHIPROCKET_PASSWORD");
        const token = await getShiprocketToken(srEmail, srPassword);
        const cancelRes = await fetch(`${SR_BASE}/orders/cancel`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [Number(order.shiprocket_order_id)] }),
        });
        const cancelJson = await cancelRes.json();
        if (cancelRes.ok) {
          shiprocketCancelled = true;
        } else {
          shiprocketCancelError = cancelJson.message ?? `HTTP ${cancelRes.status}`;
          console.error("Shiprocket order cancel failed:", cancelRes.status, JSON.stringify(cancelJson));

          // The plain order-cancel only works pre-pickup. If the courier
          // already has the parcel (AWB assigned), fall back to cancelling
          // the shipment itself by AWB — Shiprocket's equivalent of pulling
          // it back / RTO, instead of leaving this for the admin to sort
          // out by hand in the Shiprocket dashboard.
          if (order.awb_number) {
            const awbCancelRes = await fetch(`${SR_BASE}/orders/cancel/shipment/awbs`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ awbs: [order.awb_number] }),
            });
            const awbCancelJson = await awbCancelRes.json();
            if (awbCancelRes.ok) {
              shiprocketCancelled = true;
              rtoInitiated = true;
              shiprocketCancelError = undefined;
            } else {
              shiprocketCancelError = awbCancelJson.message ?? shiprocketCancelError;
              console.error("Shiprocket AWB cancel/RTO failed:", awbCancelRes.status, JSON.stringify(awbCancelJson));
            }
          }
        }
      } catch (e) {
        shiprocketCancelError = e instanceof Error ? e.message : String(e);
        console.error("Shiprocket order cancel threw:", shiprocketCancelError);
      }
    }

    const orderUpdate: Record<string, unknown> = { status: "CANCELLED", cancelled_at: new Date().toISOString() };
    if (rtoInitiated) orderUpdate.rto_initiated_at = new Date().toISOString();
    await supabase.from("orders").update(orderUpdate).eq("id", order_id);

    return new Response(
      JSON.stringify({
        ok: true,
        shiprocket_cancelled: shiprocketCancelled,
        shiprocket_cancel_error: shiprocketCancelError,
        rto_initiated: rtoInitiated,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shiprocket-cancel uncaught error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
