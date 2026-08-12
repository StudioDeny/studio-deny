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

type MetaTemplate = {
  name: string;
  status: string;
  components?: { type: string; text?: string }[];
};

function bodyOf(t: MetaTemplate): string {
  return t.components?.find((c) => c.type === "BODY")?.text ?? "";
}

function paramCount(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}

function titleCase(templateName: string): string {
  return templateName.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

// Pulls the real, currently-registered templates from Meta and mirrors their
// body text + approval status into notification_templates. Local edits to
// body_text/variables never had any effect on what actually gets sent — Meta
// always uses its own approved copy of a template, matched by name — so this
// makes the DB a read-only reflection of Meta's truth instead of an editable
// copy that silently did nothing. is_active is left untouched here: that's
// still the admin's own on/off switch for whether we queue this template at
// all, independent of Meta's approval state.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = requireEnv("WHATSAPP_ACCESS_TOKEN");
    const wabaId = requireEnv("WHATSAPP_BUSINESS_ACCOUNT_ID");

    const seenNames: string[] = [];
    let url: string | null =
      `https://graph.facebook.com/v19.0/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100&access_token=${token}`;
    let synced = 0;
    let pages = 0;

    while (url && pages < 10) {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        console.error("Meta message_templates fetch failed:", res.status, JSON.stringify(json));
        throw new Error(json.error?.message ?? `Meta API error (HTTP ${res.status})`);
      }

      for (const t of (json.data ?? []) as MetaTemplate[]) {
        seenNames.push(t.name);
        const body = bodyOf(t);
        const count = paramCount(body);

        const { data: existing } = await supabase
          .from("notification_templates")
          .select("id, variables")
          .eq("template_name", t.name)
          .maybeSingle();

        const variables = existing && existing.variables.length === count
          ? existing.variables
          : Array.from({ length: count }, (_, i) => `param_${i + 1}`);

        if (existing) {
          await supabase
            .from("notification_templates")
            .update({ body_text: body, variables, meta_status: t.status })
            .eq("id", existing.id);
        } else {
          await supabase.from("notification_templates").insert({
            name: titleCase(t.name),
            template_name: t.name,
            body_text: body,
            variables,
            is_active: false, // newly-discovered on Meta's side — admin opts in explicitly
            meta_status: t.status,
          });
        }
        synced++;
      }

      url = json.paging?.next ?? null;
      pages++;
    }

    // Anything we'd synced before that Meta no longer returns (deleted there)
    // — flag it rather than silently leaving a stale "APPROVED" status.
    if (seenNames.length > 0) {
      await supabase
        .from("notification_templates")
        .update({ meta_status: "MISSING" })
        .not("template_name", "in", `(${seenNames.map((n) => `"${n}"`).join(",")})`)
        .not("meta_status", "is", null);
    }

    return new Response(JSON.stringify({ ok: true, synced }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-whatsapp-templates error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
