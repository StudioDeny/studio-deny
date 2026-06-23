import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Download, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/export")({
  component: ExportPage,
});

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

async function fetchAll(table: string, select = "*") {
  const { data, error } = await supabase.from(table).select(select);
  if (error) { toast.error(`${table}: ${error.message}`); return []; }
  return data ?? [];
}

const TABLES = [
  { key: "products", label: "PRODUCTS" },
  { key: "product_variants", label: "VARIANTS" },
  { key: "orders", label: "ORDERS" },
  { key: "order_items", label: "ORDER ITEMS" },
  { key: "profiles", label: "PROFILES" },
  { key: "user_roles", label: "ROLES" },
  { key: "loyalty_balances", label: "LOYALTY" },
  { key: "loyalty_transactions", label: "LOYALTY TXN" },
  { key: "faq_items", label: "FAQ" },
  { key: "testimonials", label: "TESTIMONIALS" },
  { key: "announcement_bars", label: "ANNOUNCEMENTS" },
  { key: "website_sections", label: "SECTIONS" },
  { key: "notification_templates", label: "NOTIF TEMPLATES" },
  { key: "notification_queue", label: "NOTIF QUEUE" },
  { key: "whatsapp_logs", label: "WHATSAPP LOGS" },
  { key: "marketing_campaigns", label: "CAMPAIGNS" },
];

type Counts = Record<string, number>;

function ExportPage() {
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadCounts = async () => {
    setLoading(true);
    const results = await Promise.all(
      TABLES.map(async ({ key }) => {
        const { count, error } = await supabase
          .from(key)
          .select("*", { count: "exact", head: true });
        return [key, error ? 0 : (count ?? 0)] as [string, number];
      })
    );
    setCounts(Object.fromEntries(results));
    setLoading(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const exportTable = async (table: string, fmt: "csv" | "json", label: string) => {
    setExporting(table + fmt);
    const rows = await fetchAll(table);
    if (!rows.length) { toast.error("No data to export"); setExporting(null); return; }
    const ts = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") {
      downloadFile(`${table}_${ts}.csv`, toCSV(rows as Record<string, unknown>[]), "text/csv");
    } else {
      downloadFile(`${table}_${ts}.json`, JSON.stringify(rows, null, 2), "application/json");
    }
    toast.success(`Exported ${rows.length} ${label} rows`);
    setExporting(null);
  };

  const exportOrders = async (fmt: "csv" | "json") => {
    setExporting("orders" + fmt);
    const [orders, items] = await Promise.all([
      fetchAll("orders"),
      fetchAll("order_items"),
    ]);
    const ts = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") {
      downloadFile(`orders_${ts}.csv`, toCSV(orders as Record<string, unknown>[]), "text/csv");
      downloadFile(`order_items_${ts}.csv`, toCSV(items as Record<string, unknown>[]), "text/csv");
    } else {
      const combined = orders.map((o: any) => ({
        ...o,
        items: (items as any[]).filter((i) => i.order_id === o.id),
      }));
      downloadFile(`orders_${ts}.json`, JSON.stringify(combined, null, 2), "application/json");
    }
    toast.success(`Exported ${orders.length} orders`);
    setExporting(null);
  };

  const exportProducts = async (fmt: "csv" | "json") => {
    setExporting("products" + fmt);
    const [products, variants] = await Promise.all([
      fetchAll("products"),
      fetchAll("product_variants"),
    ]);
    const ts = new Date().toISOString().slice(0, 10);
    if (fmt === "csv") {
      downloadFile(`products_${ts}.csv`, toCSV(products as Record<string, unknown>[]), "text/csv");
      downloadFile(`product_variants_${ts}.csv`, toCSV(variants as Record<string, unknown>[]), "text/csv");
    } else {
      const combined = products.map((p: any) => ({
        ...p,
        variants: (variants as any[]).filter((v) => v.product_id === p.id || v.product_id === p.slug),
      }));
      downloadFile(`products_${ts}.json`, JSON.stringify(combined, null, 2), "application/json");
    }
    toast.success(`Exported ${products.length} products`);
    setExporting(null);
  };

  const exportCustomers = async () => {
    setExporting("customers");
    const [profiles, roles] = await Promise.all([
      fetchAll("profiles"),
      fetchAll("user_roles"),
    ]);
    const roleMap = new Map((roles as any[]).map((r) => [r.user_id, r.role]));
    const rows = (profiles as any[]).map((p) => ({
      user_id: p.user_id,
      email: p.email,
      name: p.name,
      phone: p.phone,
      role: roleMap.get(p.user_id) ?? "customer",
      created_at: p.created_at,
    }));
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`customers_${ts}.csv`, toCSV(rows), "text/csv");
    toast.success(`Exported ${rows.length} customers`);
    setExporting(null);
  };

  const exportFullDb = async () => {
    setExporting("full");
    toast.info("Fetching all tables… this may take a moment");
    const snapshots = await Promise.all(
      TABLES.map(async ({ key, label }) => {
        const rows = await fetchAll(key);
        return [key, rows] as [string, unknown[]];
      })
    );
    const dump = {
      exportedAt: new Date().toISOString(),
      source: "supabase",
      tables: Object.fromEntries(snapshots),
    };
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`studiodeny_backup_${ts}.json`, JSON.stringify(dump, null, 2), "application/json");
    toast.success("Full Supabase backup exported");
    setExporting(null);
  };

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  const Btn = ({
    onClick, children, busy, primary,
  }: {
    onClick: () => void; children: React.ReactNode; busy?: boolean; primary?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      className={`h-10 px-4 text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-50 ${
        primary
          ? "bg-primary text-primary-foreground hover:glow-primary"
          : "border border-border hover:border-primary hover:text-primary"
      }`}
    >
      {busy ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />}
      {children}
    </button>
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-display text-4xl md:text-5xl">EXPORT.</h1>
        <button
          onClick={loadCounts}
          disabled={loading}
          className="border border-border h-9 px-3 text-mono text-[10px] tracking-widest inline-flex items-center gap-2 hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> REFRESH
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        Live Supabase backup — {loading ? "counting…" : `${totalRows.toLocaleString()} total rows across ${TABLES.length} tables`}
      </p>

      {/* Main exports */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Section title="ORDERS" count={(counts.orders ?? 0) + (counts.order_items ?? 0)} label="orders + items">
          <Btn onClick={() => exportOrders("csv")} busy={exporting === "orderscsv"}>CSV</Btn>
          <Btn onClick={() => exportOrders("json")} busy={exporting === "ordersjson"}>JSON</Btn>
        </Section>

        <Section title="PRODUCTS" count={(counts.products ?? 0) + (counts.product_variants ?? 0)} label="products + variants">
          <Btn onClick={() => exportProducts("csv")} busy={exporting === "productscsv"}>CSV</Btn>
          <Btn onClick={() => exportProducts("json")} busy={exporting === "productsjson"}>JSON</Btn>
        </Section>

        <Section title="CUSTOMERS" count={(counts.profiles ?? 0)} label="profiles + roles">
          <Btn onClick={exportCustomers} busy={exporting === "customers"}>CSV</Btn>
        </Section>

        <Section title="FULL DATABASE BACKUP" count={totalRows} label="all tables">
          <Btn onClick={exportFullDb} busy={exporting === "full"} primary>
            <Database className="size-3" /> EXPORT EVERYTHING
          </Btn>
        </Section>
      </div>

      {/* Per-table section */}
      <h2 className="text-display text-2xl tracking-wider mb-4">ALL TABLES</h2>
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">TABLE</th>
              <th className="text-left p-3">ROWS</th>
              <th className="text-right p-3">DOWNLOAD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TABLES.map(({ key, label }) => (
              <tr key={key} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="font-semibold text-xs">{key}</div>
                  <div className="text-mono text-[10px] text-muted-foreground">{label}</div>
                </td>
                <td className="p-3 text-mono text-xs">
                  {loading ? "—" : (counts[key] ?? 0).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => exportTable(key, "csv", label)}
                      disabled={exporting === key + "csv"}
                      className="border border-border h-7 px-2 text-mono text-[10px] tracking-widest inline-flex items-center gap-1 hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {exporting === key + "csv" ? <RefreshCw className="size-2.5 animate-spin" /> : <Download className="size-2.5" />}
                      CSV
                    </button>
                    <button
                      onClick={() => exportTable(key, "json", label)}
                      disabled={exporting === key + "json"}
                      className="border border-border h-7 px-2 text-mono text-[10px] tracking-widest inline-flex items-center gap-1 hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {exporting === key + "json" ? <RefreshCw className="size-2.5 animate-spin" /> : <Download className="size-2.5" />}
                      JSON
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({
  title, count, label, children,
}: {
  title: string; count: number; label: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{title}</div>
        <div className="text-right">
          <div className="text-mono text-xs text-foreground">{count.toLocaleString()}</div>
          <div className="text-mono text-[9px] text-muted-foreground uppercase">{label}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
