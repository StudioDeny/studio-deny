import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ADMIN_GUIDE, ADMIN_GUIDE_GROUPS, type GuideEntry } from "@/lib/adminGuideContent";
import { ArrowRight, Info } from "lucide-react";

export const Route = createFileRoute("/admin/guide")({
  component: AdminGuide,
  head: () => ({ meta: [{ title: "Guide — STUDIO DENY" }] }),
});

function AdminGuide() {
  const [selectedKey, setSelectedKey] = useState<string>(ADMIN_GUIDE[0].key);
  const entry: GuideEntry = ADMIN_GUIDE.find((e) => e.key === selectedKey) ?? ADMIN_GUIDE[0];

  return (
    <div className="max-w-3xl">
      <h1 className="text-display text-4xl md:text-5xl mb-2">GUIDE.</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Pick any admin section below for a plain, step-by-step walkthrough of how to use it.
      </p>

      <label className="block mb-6">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SECTION</div>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="w-full bg-background border border-border px-3 h-12 text-sm font-mono cursor-pointer"
        >
          {ADMIN_GUIDE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {ADMIN_GUIDE.filter((e) => e.group === group).map((e) => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="text-mono text-[10px] tracking-[0.25em] text-primary mb-1">{entry.group.toUpperCase()}</div>
            <h2 className="text-display text-2xl md:text-3xl">{entry.label.toUpperCase()}.</h2>
          </div>
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={entry.path as any}
            className="shrink-0 border border-primary text-primary h-9 px-4 inline-flex items-center gap-2 text-mono text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            GO TO THIS SECTION <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-5">{entry.summary}</p>

        <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">STEPS</div>
        <ol className="space-y-2 mb-6">
          {entry.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 size-5 rounded-full bg-muted text-mono text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {entry.notes && entry.notes.length > 0 && (
          <div className="border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-mono text-[10px] tracking-widest text-muted-foreground mb-2">
              <Info className="size-3.5" /> GOOD TO KNOW
            </div>
            <ul className="space-y-1.5">
              {entry.notes.map((note, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="shrink-0">—</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
