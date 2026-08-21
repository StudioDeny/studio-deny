import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ADMIN_GUIDE, ADMIN_GUIDE_GROUPS, type GuideEntry } from "@/lib/adminGuideContent";
import { ArrowRight, ArrowLeft, Info, Check, Upload, Search, ChevronUp, ChevronDown, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/guide")({
  component: AdminGuide,
  head: () => ({ meta: [{ title: "Guide — STUDIO DENY" }] }),
});

// Every step's mockup is picked by matching keywords in that step's own
// text — there's no real screenshot per step, but a small, honest, generic
// illustration of "this is the kind of control you're looking for" beats
// a flat wall of text with nothing to visually anchor to.
type MockupKind = "save" | "toggle" | "reorder" | "upload" | "search" | "color" | "dropdown" | "delete" | "default";

function mockupForStep(step: string): MockupKind {
  const s = step.toLowerCase();
  if (s.includes("delete") || s.includes("trash") || s.includes("remove")) return "delete";
  if (s.includes("save")) return "save";
  if (s.includes("toggle") || s.includes("instantly") || s.includes("switch") || s.includes("active")) return "toggle";
  if (s.includes("reorder") || s.includes("arrow") || s.includes("drag")) return "reorder";
  if (s.includes("upload") || s.includes("photo") || s.includes("video") || s.includes("image") || s.includes("media")) return "upload";
  if (s.includes("search")) return "search";
  if (s.includes("color")) return "color";
  if (s.includes("dropdown") || s.includes("pick") || s.includes("select") || s.includes("category")) return "dropdown";
  return "default";
}

const MOCKUP_CAPTION: Record<MockupKind, string> = {
  save: "A Save button — nothing on this step is live until you click it.",
  toggle: "A toggle/switch — these take effect the moment you click, no Save needed.",
  reorder: "Up/down arrows — drag or click to reorder; also saves instantly.",
  upload: "An upload field — drop a file or paste a URL.",
  search: "A search box — type to filter live results below it.",
  color: "A color picker — click the swatch or type a hex code.",
  dropdown: "A dropdown — pick one option from an existing list.",
  delete: "A delete action — usually asks you to confirm first.",
  default: "This step is informational — nothing to click yet.",
};

function StepMockup({ kind }: { kind: MockupKind }) {
  switch (kind) {
    case "save":
      return (
        <div className="w-full max-w-[220px] space-y-3">
          <div className="h-8 border border-border/60 bg-background rounded-sm" />
          <div className="h-8 border border-border/60 bg-background rounded-sm w-2/3" />
          <div className="h-9 bg-foreground text-background rounded-sm flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest">
            <Check className="size-3" /> SAVE
          </div>
        </div>
      );
    case "toggle":
      return (
        <div className="flex items-center gap-3">
          <div className="h-6 w-11 rounded-full bg-emerald-500 relative shrink-0">
            <div className="absolute top-0.5 right-0.5 size-5 rounded-full bg-white shadow" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-emerald-600">ACTIVE</span>
        </div>
      );
    case "reorder":
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="size-5 border border-border/60 rounded-sm flex items-center justify-center"><ChevronUp className="size-3" /></div>
            <div className="size-5 border border-border/60 rounded-sm flex items-center justify-center"><ChevronDown className="size-3" /></div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-24 bg-border/60 rounded-sm" />
            <div className="h-2.5 w-20 bg-border/60 rounded-sm" />
            <div className="h-2.5 w-24 bg-border/60 rounded-sm" />
          </div>
        </div>
      );
    case "upload":
      return (
        <div className="w-full max-w-[200px] h-20 border border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <Upload className="size-4" />
          <span className="text-[9px] font-mono tracking-widest">UPLOAD</span>
        </div>
      );
    case "search":
      return (
        <div className="w-full max-w-[220px]">
          <div className="h-9 border border-border/60 rounded-sm flex items-center gap-2 px-2.5 bg-background">
            <Search className="size-3.5 text-muted-foreground" />
            <div className="h-2 w-16 bg-border/60 rounded-sm" />
          </div>
        </div>
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-sm border border-border/60" style={{ background: "var(--primary, #c8f135)" }} />
          <div className="h-8 w-20 border border-border/60 rounded-sm bg-background" />
        </div>
      );
    case "dropdown":
      return (
        <div className="w-full max-w-[200px] space-y-1.5">
          <div className="h-9 border border-border/60 rounded-sm bg-background flex items-center justify-between px-2.5">
            <div className="h-2 w-14 bg-border/60 rounded-sm" />
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>
          <div className="border border-border/40 rounded-sm divide-y divide-border/40">
            <div className="h-6 px-2.5 flex items-center"><div className="h-2 w-12 bg-border/50 rounded-sm" /></div>
            <div className="h-6 px-2.5 flex items-center"><div className="h-2 w-16 bg-border/50 rounded-sm" /></div>
          </div>
        </div>
      );
    case "delete":
      return (
        <div className="flex items-center gap-3">
          <div className="size-9 border border-red-300 rounded-sm flex items-center justify-center text-red-500">
            <Trash2 className="size-4" />
          </div>
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground">CONFIRM?</div>
        </div>
      );
    default:
      return (
        <div className="size-9 border border-border/60 rounded-full flex items-center justify-center text-muted-foreground">
          <Info className="size-4" />
        </div>
      );
  }
}

function AdminGuide() {
  const [selectedKey, setSelectedKey] = useState<string>(ADMIN_GUIDE[0].key);
  const [stepIndex, setStepIndex] = useState(0);
  const entry: GuideEntry = ADMIN_GUIDE.find((e) => e.key === selectedKey) ?? ADMIN_GUIDE[0];

  // Jumping to a different section always starts back at step 1 —
  // otherwise you could land on "step 5" of a 2-step section.
  useEffect(() => { setStepIndex(0); }, [selectedKey]);

  const total = entry.steps.length;
  const currentStep = entry.steps[stepIndex];
  const kind = mockupForStep(currentStep);

  return (
    <div className="max-w-4xl">
      <h1 className="text-display text-4xl md:text-5xl mb-2">GUIDE.</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Pick any admin section below for a plain, step-by-step walkthrough of how to use it.
      </p>

      <label className="block mb-6 max-w-md">
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

        <p className="text-sm text-muted-foreground mb-6">{entry.summary}</p>

        <div className="grid md:grid-cols-[1fr_260px] gap-6">
          {/* STEP WALKTHROUGH */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground">
                STEP {stepIndex + 1} OF {total}
              </div>
              <div className="flex gap-1.5">
                {entry.steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStepIndex(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`size-2 rounded-full transition-colors ${i === stepIndex ? "bg-primary" : "bg-border hover:bg-primary/50"}`}
                  />
                ))}
              </div>
            </div>

            <div className="border border-border bg-background p-5 min-h-[110px] flex items-center">
              <div className="flex gap-3 items-start">
                <span className="shrink-0 size-6 rounded-full bg-foreground text-background text-mono text-[11px] flex items-center justify-center mt-0.5">
                  {stepIndex + 1}
                </span>
                <p className="text-sm leading-relaxed">{currentStep}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
                className="border border-border h-9 px-3 inline-flex items-center gap-1.5 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> BACK
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
                disabled={stepIndex === total - 1}
                className="bg-primary text-primary-foreground h-9 px-4 inline-flex items-center gap-1.5 text-mono text-[10px] tracking-widest hover:glow-primary disabled:opacity-30"
              >
                NEXT <ArrowRight className="size-3.5" />
              </button>
            </div>

            {entry.notes && entry.notes.length > 0 && (
              <div className="border border-border/70 bg-muted/30 p-4 mt-6">
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

          {/* SIDE PREVIEW */}
          <div className="md:sticky md:top-6 self-start">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2">WHAT TO LOOK FOR</div>
            <div className="border border-border bg-background p-6 flex items-center justify-center min-h-[140px]">
              <StepMockup kind={kind} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{MOCKUP_CAPTION[kind]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
