import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X, Sparkles, TrendingUp, Clock } from "lucide-react";
import { listProducts } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";

const RECENT_KEY = "sd_recent_searches";

const readRecent = (): string[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};
const pushRecent = (q: string) => {
  if (typeof window === "undefined" || !q.trim()) return;
  const list = [q, ...readRecent().filter((x) => x !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();

  // refresh products + recent each time it opens
  const products = useMemo(() => (open ? listProducts() : []), [open]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && q.trim()) submit(q);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  const submit = (term: string) => {
    pushRecent(term);
    onClose();
    navigate({ to: "/shop", search: { q: term } });
  };

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products
      .map((p) => {
        const score =
          (p.name.toLowerCase().startsWith(term) ? 8 : 0) +
          (p.name.toLowerCase().includes(term) ? 5 : 0) +
          (p.category.toLowerCase().includes(term) ? 3 : 0) +
          (p.colors.some((c) => c.name.toLowerCase().includes(term)) ? 2 : 0) +
          (p.description.toLowerCase().includes(term) ? 1 : 0) +
          (p.material.toLowerCase().includes(term) ? 1 : 0);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [q, products]);

  // category & search-term suggestions
  const completions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const cats = ["Tops", "Bottoms", "Outerwear", "Accessories"].filter((c) =>
      c.toLowerCase().includes(term)
    );
    const namePart = products
      .map((p) => p.name)
      .filter((n) => n.toLowerCase().includes(term))
      .slice(0, 4);
    return [...cats.map((c) => ({ kind: "cat" as const, label: c })), ...namePart.map((n) => ({ kind: "term" as const, label: n }))];
  }, [q, products]);

  const trending = ["Hoodie", "Cargo", "Bomber", "Tee", "Cap", "Denim"];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="px-4 md:px-8 pt-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 border-b-2 border-primary pb-3">
          <Search className="size-5 text-primary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="HUNT FOR HEAT…"
            className="flex-1 bg-transparent outline-none text-display text-2xl md:text-4xl tracking-wider placeholder:text-muted-foreground/40"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary">CLEAR</button>
          )}
          <button onClick={onClose} aria-label="Close" className="p-2 hover:text-primary">
            <X className="size-5" />
          </button>
        </div>

        {!q && (
          <div className="mt-6 grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                <TrendingUp className="size-3 text-primary" /> TRENDING
              </div>
              <div className="flex flex-wrap gap-2">
                {trending.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="px-3 py-1.5 border border-border text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {recent.length > 0 && (
              <div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                  <Clock className="size-3 text-secondary" /> RECENT
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((s) => (
                    <button key={s} onClick={() => setQ(s)} className="px-3 py-1.5 border border-border text-mono text-xs tracking-widest hover:border-secondary hover:text-secondary">
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {q && completions.length > 0 && (
          <div className="mt-5">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="size-3 text-secondary" /> SUGGESTIONS
            </div>
            <div className="flex flex-wrap gap-2">
              {completions.map((c) => (
                <button
                  key={c.kind + c.label}
                  onClick={() => c.kind === "cat" ? (onClose(), navigate({ to: "/shop", search: { cat: c.label } })) : submit(c.label)}
                  className="px-3 py-1.5 border border-border text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
                >
                  {c.kind === "cat" ? "◢ " : ""}{c.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && results.length === 0 && completions.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground text-sm">
            Nothing matches <span className="text-foreground">"{q}"</span> — try another vibe.
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-5 mb-2">PRODUCTS</div>
            <ul className="divide-y divide-border border border-border bg-surface">
              {results.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    onClick={() => { pushRecent(q); onClose(); }}
                    className="flex items-center gap-4 p-3 hover:bg-muted"
                  >
                    <div className="w-14 h-16 bg-muted overflow-hidden shrink-0">
                      {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-mono text-[10px] tracking-widest text-muted-foreground">{p.category.toUpperCase()}</div>
                    </div>
                    <div className="text-mono text-sm">{formatINR(p.price)}</div>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => submit(q)}
              className="mt-3 w-full text-center text-mono text-[11px] tracking-widest text-primary hover:underline"
            >
              SEE ALL RESULTS FOR "{q.toUpperCase()}" →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
