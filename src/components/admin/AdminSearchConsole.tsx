import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, CornerDownLeft } from "lucide-react";
import { getQuickAccessItems, type SearchEntry } from "@/lib/adminSearchIndex";
import { searchAdmin, getSuggestions, type SearchResult } from "@/lib/fuzzySearch";

const INITIAL_RESULTS = 5;

export function AdminSearchConsole() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [showAll, setShowAll] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Search computation ───
  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    return searchAdmin(query);
  }, [query]);

  const quickAccess = useMemo(() => getQuickAccessItems(6), []);

  const suggestions = useMemo(() => {
    if (results.length > 0 || !query.trim()) return [];
    return getSuggestions(query, 4);
  }, [query, results]);

  const hasQuery = query.trim().length > 0;
  const visibleResults = showAll ? results : results.slice(0, INITIAL_RESULTS);
  const hasMore = results.length > INITIAL_RESULTS && !showAll;

  // ─── Click outside to close ───
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Reset highlight when results change ───
  useEffect(() => {
    setHighlightIdx(-1);
    setShowAll(false);
  }, [query]);

  // ─── Navigate to entry ───
  const navigateTo = useCallback(
    (entry: SearchEntry) => {
      setIsOpen(false);
      setQuery("");
      navigate({ to: entry.route as never });
    },
    [navigate],
  );

  // ─── Keyboard navigation ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      const items = hasQuery ? visibleResults : quickAccess.map((e) => ({ entry: e, score: 0, matchedTerms: [] }));
      const maxIdx = items.length - 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIdx((prev) => (prev < maxIdx ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIdx((prev) => (prev > 0 ? prev - 1 : maxIdx));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIdx >= 0 && highlightIdx <= maxIdx) {
            navigateTo(items[highlightIdx].entry);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, hasQuery, visibleResults, quickAccess, highlightIdx, navigateTo],
  );

  // ─── Scroll highlighted item into view ───
  useEffect(() => {
    if (highlightIdx < 0 || !dropdownRef.current) return;
    const item = dropdownRef.current.querySelector(`[data-search-idx="${highlightIdx}"]`);
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  // ─── Clear handler ───
  const handleClear = () => {
    setQuery("");
    setHighlightIdx(-1);
    setShowAll(false);
    inputRef.current?.focus();
  };

  // ─── Render a single result item ───
  const renderResultItem = (
    result: SearchResult,
    idx: number,
    showMatchExplanation: boolean,
  ) => {
    const isHighlighted = idx === highlightIdx;
    return (
      <button
        key={result.entry.id}
        data-search-idx={idx}
        onClick={() => navigateTo(result.entry)}
        onMouseEnter={() => setHighlightIdx(idx)}
        className={`w-full text-left px-4 py-3 transition-colors duration-100 ${
          isHighlighted ? "bg-muted/60" : "hover:bg-muted/40"
        }`}
        role="option"
        aria-selected={isHighlighted}
        id={`search-result-${idx}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-mono text-[12px] tracking-widest text-foreground font-semibold truncate">
              {result.entry.name}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
              {result.entry.description}
            </div>
            <div className="text-mono text-[9px] tracking-[0.2em] text-muted-foreground/60 mt-1">
              {result.entry.breadcrumb}
            </div>
          </div>
          {isHighlighted && (
            <CornerDownLeft className="size-3.5 text-muted-foreground shrink-0 mt-1 opacity-60" />
          )}
        </div>
        {showMatchExplanation && result.matchedTerms.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {result.matchedTerms.slice(0, 3).map((term) => (
              <span
                key={term}
                className="text-mono text-[8px] tracking-widest px-1.5 py-0.5 bg-primary/8 text-primary/80 border border-primary/10"
              >
                {term}
              </span>
            ))}
          </div>
        )}
      </button>
    );
  };

  // ─── Render quick-access item ───
  const renderQuickAccessItem = (entry: SearchEntry, idx: number) => {
    const isHighlighted = idx === highlightIdx;
    return (
      <button
        key={entry.id}
        data-search-idx={idx}
        onClick={() => navigateTo(entry)}
        onMouseEnter={() => setHighlightIdx(idx)}
        className={`w-full text-left px-4 py-2.5 transition-colors duration-100 ${
          isHighlighted ? "bg-muted/60" : "hover:bg-muted/40"
        }`}
        role="option"
        aria-selected={isHighlighted}
        id={`search-result-${idx}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-mono text-[11px] tracking-widest text-foreground truncate">
              {entry.name}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
              {entry.description}
            </div>
          </div>
          {isHighlighted && (
            <CornerDownLeft className="size-3 text-muted-foreground shrink-0 opacity-60" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* ═══════ Search Input ═══════ */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search settings, features…"
          className="w-full h-9 pl-9 pr-8 bg-surface border border-border text-mono text-[11px] tracking-widest text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="admin-search-dropdown"
          aria-activedescendant={highlightIdx >= 0 ? `search-result-${highlightIdx}` : undefined}
          aria-label="Search admin settings"
          autoComplete="off"
          spellCheck={false}
        />
        {hasQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* ═══════ Dropdown ═══════ */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="admin-search-dropdown"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg z-50 max-h-[380px] overflow-y-auto overscroll-contain animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* ── Quick Access (empty query) ── */}
          {!hasQuery && (
            <>
              <div className="px-4 pt-3 pb-1.5">
                <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground/70">
                  QUICK ACCESS
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {quickAccess.map((entry, idx) => renderQuickAccessItem(entry, idx))}
              </div>
              <div className="px-4 py-2 border-t border-border/50">
                <div className="text-mono text-[8px] tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                  <span>↑↓ navigate</span>
                  <span>↵ open</span>
                  <span>esc close</span>
                </div>
              </div>
            </>
          )}

          {/* ── Search Results ── */}
          {hasQuery && results.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1.5">
                <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground/70">
                  {results.length} RESULT{results.length !== 1 ? "S" : ""}
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {visibleResults.map((r, idx) => renderResultItem(r, idx, true))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full px-4 py-2.5 text-mono text-[10px] tracking-widest text-primary hover:bg-muted/40 transition-colors text-center border-t border-border/50"
                >
                  SHOW {results.length - INITIAL_RESULTS} MORE RESULTS
                </button>
              )}
              <div className="px-4 py-2 border-t border-border/50">
                <div className="text-mono text-[8px] tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                  <span>↑↓ navigate</span>
                  <span>↵ open</span>
                  <span>esc close</span>
                </div>
              </div>
            </>
          )}

          {/* ── No Results ── */}
          {hasQuery && results.length === 0 && (
            <div className="px-4 py-5">
              <div className="text-mono text-[11px] tracking-widest text-muted-foreground text-center">
                NO RESULTS FOUND
              </div>
              <div className="text-[10px] text-muted-foreground/60 text-center mt-1">
                for "{query}"
              </div>
              {suggestions.length > 0 && (
                <div className="mt-4">
                  <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 mb-2">
                    TRY
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setQuery(s);
                          setHighlightIdx(-1);
                        }}
                        className="text-mono text-[10px] tracking-widest px-2.5 py-1 border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
