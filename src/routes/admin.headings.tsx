import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SectionHeading } from "@/types/database";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/headings")({
  component: AdminHeadings,
});

function AdminHeadings() {
  const [rows, setRows] = useState<SectionHeading[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("section_headings").select("*").order("label");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (key: string, patch: Partial<SectionHeading>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const save = async (row: SectionHeading) => {
    setSavingKey(row.key);
    const { error } = await supabase
      .from("section_headings")
      .update({ heading_text: row.heading_text, text_color: row.text_color })
      .eq("key", row.key);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success(`"${row.label}" saved`);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">HEADINGS.</h1>
      <p className="text-mono text-[11px] tracking-widest text-muted-foreground mb-6">
        EVERY MAJOR SECTION HEADING SITE-WIDE — RENAME OR RECOLOR WITHOUT TOUCHING CODE.
      </p>

      <div className="space-y-4 max-w-2xl">
        {rows.length === 0 && (
          <div className="border border-border bg-surface p-6 text-sm text-muted-foreground">
            No headings registered yet.
          </div>
        )}
        {rows.map((row) => (
          <div key={row.key} className="border border-border bg-surface p-4 space-y-3">
            <div className="text-mono text-[11px] tracking-widest text-primary">{row.label}</div>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">HEADING TEXT</div>
              <textarea
                value={row.heading_text}
                onChange={(e) => update(row.key, { heading_text: e.target.value })}
                rows={2}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono"
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="block">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">TEXT COLOR</div>
                <input
                  type="color"
                  value={row.text_color ?? "#000000"}
                  onChange={(e) => update(row.key, { text_color: e.target.value })}
                  className="h-10 w-16 bg-background border border-border p-1"
                />
              </label>
              {row.text_color && (
                <button
                  type="button"
                  onClick={() => update(row.key, { text_color: null })}
                  className="h-10 px-3 border border-border text-mono text-[10px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
                >
                  RESET TO THEME
                </button>
              )}
              <button
                type="button"
                onClick={() => save(row)}
                disabled={savingKey === row.key}
                className="ml-auto h-10 px-5 bg-primary text-primary-foreground text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingKey === row.key && <Loader2 className="size-3.5 animate-spin" />}
                SAVE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
