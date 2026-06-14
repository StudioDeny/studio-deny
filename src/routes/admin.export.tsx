import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listOrders } from "@/lib/orders";
import { listProducts } from "@/lib/productsStore";
import { listCategories, listBrands } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { Download, Database } from "lucide-react";
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

function ExportPage() {
  const [counts, setCounts] = useState({ orders: 0, products: 0, customers: 0 });
  useEffect(() => {
    const orders = listOrders();
    setCounts({
      orders: orders.length,
      products: listProducts().length,
      customers: new Set(orders.map((o) => o.userEmail)).size,
    });
  }, []);

  const exportOrders = (fmt: "csv" | "json") => {
    const orders = listOrders();
    if (fmt === "csv") {
      downloadFile("orders.csv", toCSV(orders.map((o) => ({
        id: o.id, order_number: o.order_number ?? o.id, invoiceNo: o.invoiceNo, customer: o.userEmail, status: o.status,
        items: o.items.length, subtotal: o.subtotal, tax: o.tax, total: o.total,
        date: new Date(o.createdAt).toISOString(),
      }))), "text/csv");
    } else {
      downloadFile("orders.json", JSON.stringify(orders, null, 2), "application/json");
    }
    toast.success(`Exported ${orders.length} orders`);
  };

  const exportProducts = (fmt: "csv" | "json") => {
    const list = listProducts();
    if (fmt === "csv") downloadFile("products.csv", toCSV(list as unknown as Record<string, unknown>[]), "text/csv");
    else downloadFile("products.json", JSON.stringify(list, null, 2), "application/json");
    toast.success(`Exported ${list.length} products`);
  };

  const exportCustomers = () => {
    const orders = listOrders();
    const map = new Map<string, { email: string; orders: number; spent: number; lastOrder: number }>();
    orders.forEach((o) => {
      const r = map.get(o.userEmail) ?? { email: o.userEmail, orders: 0, spent: 0, lastOrder: 0 };
      r.orders++; r.spent += (o.status === "REFUNDED" || o.status === "CANCELLED") ? 0 : o.total;
      r.lastOrder = Math.max(r.lastOrder, o.createdAt);
      map.set(o.userEmail, r);
    });
    const rows = [...map.values()].map((c) => ({ ...c, lastOrder: new Date(c.lastOrder).toISOString() }));
    downloadFile("customers.csv", toCSV(rows), "text/csv");
    toast.success(`Exported ${rows.length} customers`);
  };

  const exportFullDb = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      products: listProducts(),
      orders: listOrders(),
      categories: listCategories(),
      brands: listBrands(),
      settings: getSettings(),
      raw: typeof window !== "undefined"
        ? Object.keys(localStorage).filter((k) => k.startsWith("sd_")).reduce((acc, k) => {
            acc[k] = localStorage.getItem(k);
            return acc;
          }, {} as Record<string, string | null>)
        : {},
    };
    downloadFile(`studio-deny-db-${Date.now()}.json`, JSON.stringify(dump, null, 2), "application/json");
    toast.success("Full database exported");
  };

  const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
    <div className="border border-border bg-surface p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-mono text-[11px] tracking-[0.25em] text-primary">{title}</div>
        <div className="text-mono text-xs text-muted-foreground">{count} ROWS</div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const Btn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="border border-border h-10 px-4 text-mono text-xs tracking-widest inline-flex items-center gap-2 hover:border-primary hover:text-primary">
      <Download className="size-3" /> {children}
    </button>
  );

  return (
    <div className="max-w-4xl">
      <h1 className="text-display text-4xl md:text-5xl mb-2">EXPORT.</h1>
      <p className="text-muted-foreground text-sm mb-8">Download stats, orders, products and the full database.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Section title="ORDERS" count={counts.orders}>
          <Btn onClick={() => exportOrders("csv")}>CSV</Btn>
          <Btn onClick={() => exportOrders("json")}>JSON</Btn>
        </Section>
        <Section title="PRODUCTS" count={counts.products}>
          <Btn onClick={() => exportProducts("csv")}>CSV</Btn>
          <Btn onClick={() => exportProducts("json")}>JSON</Btn>
        </Section>
        <Section title="CUSTOMERS" count={counts.customers}>
          <Btn onClick={exportCustomers}>CSV</Btn>
        </Section>
        <Section title="FULL DATABASE" count={3}>
          <button onClick={exportFullDb} className="bg-primary text-primary-foreground h-10 px-4 text-mono text-xs tracking-widest inline-flex items-center gap-2 hover:glow-primary">
            <Database className="size-3" /> EXPORT EVERYTHING
          </button>
        </Section>
      </div>
    </div>
  );
}
