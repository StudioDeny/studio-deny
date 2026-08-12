import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOUR = 60 * 60 * 1000;
const STAGES: { stage: "1h" | "24h" | "48h" | "final"; afterMs: number }[] = [
  { stage: "final", afterMs: 72 * HOUR },
  { stage: "48h", afterMs: 48 * HOUR },
  { stage: "24h", afterMs: 24 * HOUR },
  { stage: "1h", afterMs: 1 * HOUR },
];
// A cart crosses stages in order as it ages — check from the oldest
// threshold down so a cart that's been quiet for 3 days gets its final
// message (not re-sent an earlier one), even if a cron run was missed.
const STAGE_RANK: Record<string, number> = { "1h": 1, "24h": 2, "48h": 3, final: 4 };

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}. Add it in Supabase → Edge Functions → Secrets.`);
  return v;
}

// Runs on a cron (every 15 min) — finds carts that have sat untouched past
// 1h/24h/48h and haven't already had that stage's nudge sent, looks up a
// phone number (profile first, else their last order's), and queues the
// matching WhatsApp template. Best-effort per cart: one cart's failure
// (no phone, opted out, etc.) never blocks the rest of the scan.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: carts, error } = await supabase
      .from("carts")
      .select("id, user_id, updated_at, last_abandoned_stage")
      .lt("updated_at", new Date(Date.now() - HOUR).toISOString());
    if (error) throw error;

    let queued = 0;
    let skipped = 0;

    for (const cart of carts ?? []) {
      const ageMs = Date.now() - new Date(cart.updated_at).getTime();
      const eligible = STAGES.find((s) => ageMs >= s.afterMs);
      if (!eligible) continue;
      const alreadyDone = cart.last_abandoned_stage && STAGE_RANK[cart.last_abandoned_stage] >= STAGE_RANK[eligible.stage];
      if (alreadyDone) continue;

      const { data: items } = await supabase
        .from("cart_items")
        .select("qty, variant_id, product_variants(product_id, size, price, products(name, image))")
        .eq("cart_id", cart.id);
      if (!items || items.length === 0) continue; // emptied cart (checked out or cleared) — nothing to nudge

      const { data: profile } = await supabase.from("profiles").select("phone, name").eq("user_id", cart.user_id).maybeSingle();
      let phone = profile?.phone ?? null;
      if (!phone) {
        const { data: lastOrder } = await supabase
          .from("orders")
          .select("address")
          .eq("user_id", cart.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        phone = (lastOrder?.address as { phone?: string } | null)?.phone ?? null;
      }
      if (!phone) { skipped++; continue; } // no number anywhere — nothing we can do

      const { data: pref } = await supabase
        .from("customer_notification_preferences")
        .select("wa_abandoned_cart")
        .eq("user_id", cart.user_id)
        .maybeSingle();
      if (pref && pref.wa_abandoned_cart === false) { skipped++; continue; }

      type Row = { qty: number; variant_id: string; product_variants: { product_id: string; size: string | null; price: number; products: { name: string; image: string } | null } | null };
      const snapshot = (items as unknown as Row[]).map((r) => ({
        product_slug: r.product_variants?.product_id,
        name: r.product_variants?.products?.name,
        image: r.product_variants?.products?.image,
        size: r.product_variants?.size,
        qty: r.qty,
        price: r.product_variants?.price,
      }));
      const totalValue = snapshot.reduce((s, i) => s + (i.qty * (i.price ?? 0)), 0);

      const { data: template } = await supabase
        .from("notification_templates")
        .select("id")
        .eq("template_name", `abandoned_cart_${eligible.stage}`)
        .eq("is_active", true)
        .maybeSingle();
      if (!template) { skipped++; continue; }

      await supabase.from("notification_queue").insert({
        template_id: template.id,
        recipient_phone: phone,
        order_id: null,
        variables: { customer_name: profile?.name || "there", cart_url: "https://studiodeny.com/cart" },
      });

      await supabase.from("abandoned_carts").insert({
        user_id: cart.user_id,
        cart_snapshot: snapshot,
        total_value: totalValue,
        recovery_sent_at: new Date().toISOString(),
      });

      await supabase.from("carts").update({ last_abandoned_stage: eligible.stage, last_notified_at: new Date().toISOString() }).eq("id", cart.id);
      queued++;
    }

    return new Response(JSON.stringify({ scanned: carts?.length ?? 0, queued, skipped }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("abandoned-cart-scan error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
