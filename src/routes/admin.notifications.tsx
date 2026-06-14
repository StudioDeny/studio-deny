import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  NotificationTemplate,
  NotificationQueue,
  WhatsappLog,
  MarketingCampaign,
  NotifStatus,
  CampaignStatus,
} from "@/types/database";
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

type Tab = "templates" | "queue" | "logs" | "campaigns";

const STATUS_COLORS: Record<string, string> = {
  pending: "border-yellow-500 text-yellow-500",
  sent: "border-secondary text-secondary",
  failed: "border-destructive text-destructive",
  delivered: "border-secondary text-secondary",
  read: "border-primary text-primary",
  draft: "border-border text-muted-foreground",
  scheduled: "border-yellow-500 text-yellow-500",
  running: "border-primary text-primary",
  completed: "border-secondary text-secondary",
};

function AdminNotifications() {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display text-4xl md:text-5xl">WHATSAPP.</h1>
        <p className="text-muted-foreground text-sm mt-2">Manage notification templates, queue, logs, and campaigns.</p>
      </div>

      <div className="flex gap-1 mb-6">
        {(["templates", "queue", "logs", "campaigns"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-mono text-[10px] tracking-widest px-3 h-9 border ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "templates" && <TemplatesTab />}
      {tab === "queue" && <QueueTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "campaigns" && <CampaignsTab />}
    </div>
  );
}

function TemplatesTab() {
  const [rows, setRows] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("notification_templates").select("*").order("name");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("notification_templates").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, is_active: val } : x)));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_templates")
      .update({ body_text: editing.body_text, variables: editing.variables, is_active: editing.is_active })
      .eq("id", editing.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Template saved");
    setSaving(false);
    setEditing(null);
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">NAME</th>
              <th className="text-left p-3 hidden md:table-cell">TEMPLATE ID</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-right p-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 text-mono text-[11px] text-muted-foreground hidden md:table-cell">{r.template_name}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle(r.id, !r.is_active)}
                    className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${r.is_active ? "border-secondary text-secondary" : "border-border text-muted-foreground"}`}
                  >
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(r)} className="border border-border h-8 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary">EDIT</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">No templates configured.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">EDIT TEMPLATE</div>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">BODY TEXT</div>
                <textarea rows={6} value={editing.body_text} onChange={(e) => setEditing({ ...editing, body_text: e.target.value })}
                  className="w-full bg-background border border-border p-3 font-mono text-sm" />
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">VARIABLES (comma-separated)</div>
                <input
                  value={editing.variables.join(", ")}
                  onChange={(e) => setEditing({ ...editing, variables: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="w-full bg-background border border-border h-10 px-3 font-mono text-sm"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-mono text-[11px] tracking-widest">ACTIVE</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setEditing(null)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueTab() {
  const [rows, setRows] = useState<NotificationQueue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("notification_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    const { error } = await supabase.from("notification_queue").update({ status: "pending" as NotifStatus, error_message: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Queued for retry");
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left p-3">PHONE</th>
            <th className="text-left p-3 hidden md:table-cell">ORDER</th>
            <th className="text-left p-3">STATUS</th>
            <th className="text-left p-3 hidden lg:table-cell">ERROR</th>
            <th className="text-left p-3 hidden md:table-cell">CREATED</th>
            <th className="text-right p-3">RETRY</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="p-3 text-mono text-[11px]">{r.recipient_phone}</td>
              <td className="p-3 text-mono text-[10px] text-muted-foreground hidden md:table-cell">{r.order_id ? `#${r.order_id.slice(0, 8)}` : "—"}</td>
              <td className="p-3">
                <span className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${STATUS_COLORS[r.status] ?? "border-border text-muted-foreground"}`}>
                  {r.status.toUpperCase()}
                </span>
              </td>
              <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">{r.error_message ?? "—"}</td>
              <td className="p-3 text-mono text-[10px] text-muted-foreground hidden md:table-cell">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-3 text-right">
                {r.status === "failed" && (
                  <button onClick={() => retry(r.id)} className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-primary hover:text-primary">
                    <RefreshCw className="size-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">Queue is empty.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function LogsTab() {
  const [rows, setRows] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    let q = supabase.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59");
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">FROM</div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-background border border-border h-9 px-3 text-sm font-mono" />
        </div>
        <div>
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TO</div>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-background border border-border h-9 px-3 text-sm font-mono" />
        </div>
      </div>
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">PHONE</th>
              <th className="text-left p-3 hidden md:table-cell">ORDER</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-left p-3 hidden md:table-cell">DATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3 text-mono text-[11px]">{r.recipient_phone}</td>
                <td className="p-3 text-mono text-[10px] text-muted-foreground hidden md:table-cell">{r.order_id ? `#${r.order_id.slice(0, 8)}` : "—"}</td>
                <td className="p-3">
                  <span className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${STATUS_COLORS[r.status] ?? "border-border text-muted-foreground"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-mono text-[10px] text-muted-foreground hidden md:table-cell">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">No logs found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignsTab() {
  const [rows, setRows] = useState<MarketingCampaign[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", template_id: "", target_segment: "all", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [camps, tmpls] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("notification_templates").select("id,name,template_name,body_text,variables,is_active,created_at").eq("is_active", true),
    ]);
    if (camps.error) toast.error(camps.error.message);
    else setRows(camps.data ?? []);
    if (tmpls.data) setTemplates(tmpls.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Campaign name required");
    setSaving(true);
    const { error } = await supabase.from("marketing_campaigns").insert({
      name: form.name,
      template_id: form.template_id || null,
      target_segment: form.target_segment || null,
      scheduled_at: form.scheduled_at || null,
      status: "draft" as CampaignStatus,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Campaign created");
    setSaving(false);
    setModal(false);
    setForm({ name: "", template_id: "", target_segment: "all", scheduled_at: "" });
    load();
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setModal(true)} className="bg-primary text-primary-foreground px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary">
          <Plus className="size-4" /> NEW CAMPAIGN
        </button>
      </div>
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">NAME</th>
              <th className="text-left p-3 hidden md:table-cell">SEGMENT</th>
              <th className="text-left p-3">STATUS</th>
              <th className="text-left p-3 hidden lg:table-cell">SCHEDULED</th>
              <th className="text-left p-3">STATS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{r.target_segment ?? "—"}</td>
                <td className="p-3">
                  <span className={`text-mono text-[10px] tracking-widest px-2 py-1 border ${STATUS_COLORS[r.status] ?? "border-border text-muted-foreground"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-mono text-[10px] text-muted-foreground hidden lg:table-cell">
                  {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "—"}
                </td>
                <td className="p-3 text-mono text-[10px]">
                  <span className="text-secondary">{r.sent_count} sent</span>
                  {" · "}
                  <span className="text-primary">{r.delivered_count} del</span>
                  {" · "}
                  <span className="text-destructive">{r.failed_count} fail</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="text-mono text-[11px] tracking-[0.25em] text-primary">NEW CAMPAIGN</div>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">CAMPAIGN NAME *</div>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border h-10 px-3 text-sm font-mono" />
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TEMPLATE</div>
                <select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} className="w-full bg-background border border-border h-10 px-3 text-sm font-mono">
                  <option value="">— SELECT TEMPLATE —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TARGET SEGMENT</div>
                <select value={form.target_segment} onChange={(e) => setForm({ ...form, target_segment: e.target.value })} className="w-full bg-background border border-border h-10 px-3 text-sm font-mono">
                  <option value="all">ALL CUSTOMERS</option>
                  <option value="rookie">ROOKIE TIER</option>
                  <option value="runner">RUNNER TIER</option>
                  <option value="riot">RIOT TIER</option>
                  <option value="legend">LEGEND TIER</option>
                  <option value="abandoned_cart">ABANDONED CART</option>
                </select>
              </div>
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SCHEDULED AT</div>
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full bg-background border border-border h-10 px-3 text-sm font-mono" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground h-10 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50">
                {saving ? "SAVING…" : "CREATE"}
              </button>
              <button onClick={() => setModal(false)} className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
