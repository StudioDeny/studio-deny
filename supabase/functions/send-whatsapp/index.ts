import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reading secrets and constructing the Supabase client used to happen at
// module load time — if a secret was missing, this would crash *before*
// the request handler's try/catch ever ran, which Supabase reports as an
// opaque EDGE_FUNCTION_ERROR with no useful detail (same failure mode we
// hit and fixed on the Shiprocket functions). Doing it all inside the
// handler means every possible failure is one we catch and report clearly.
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}. Add it in Supabase → Edge Functions → Secrets.`);
  return v;
}

async function sendWhatsApp(
  to: string,
  templateName: string,
  variables: Record<string, string>,
  waToken: string,
  waApi: string
): Promise<{ ok: boolean; message_id?: string; error?: string }> {
  const components =
    Object.keys(variables).length > 0
      ? [
          {
            type: "body",
            parameters: Object.values(variables).map((v) => ({
              type: "text",
              text: v,
            })),
          },
        ]
      : [];

  const body = {
    messaging_product: "whatsapp",
    to: to.replace(/[^0-9]/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components,
    },
  };

  const res = await fetch(waApi, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${waToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? "Meta API error" };
  }
  return { ok: true, message_id: json.messages?.[0]?.id };
}

serve(async (_req) => {
  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const waToken = requireEnv("WHATSAPP_ACCESS_TOKEN");
    const waPhoneId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
    const waApi = `https://graph.facebook.com/v19.0/${waPhoneId}/messages`;

    // Pull up to 50 pending messages
    const { data: pending, error: fetchErr } = await supabase
      .from("notification_queue")
      .select("*, notification_templates(template_name)")
      .eq("status", "pending")
      .order("created_at")
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of pending) {
      const templateName =
        (msg.notification_templates as { template_name: string } | null)
          ?.template_name ?? "";

      if (!templateName) {
        await supabase
          .from("notification_queue")
          .update({ status: "failed", error_message: "No template name" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      const variables: Record<string, string> = msg.variables ?? {};
      const result = await sendWhatsApp(
        msg.recipient_phone,
        templateName,
        variables,
        waToken,
        waApi
      );

      if (result.ok) {
        await supabase
          .from("notification_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);

        await supabase.from("whatsapp_logs").insert({
          queue_id: msg.id,
          order_id: msg.order_id,
          recipient_phone: msg.recipient_phone,
          message_id: result.message_id,
          status: "sent",
        });
        sent++;
      } else {
        await supabase
          .from("notification_queue")
          .update({ status: "failed", error_message: result.error })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed: pending.length, sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
