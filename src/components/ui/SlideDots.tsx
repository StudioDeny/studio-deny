type SlideDotsProps = {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  /** ms until autoplay advances — drives the progress bar on the active indicator. Omit to disable. */
  durationMs?: number;
  className?: string;
};

export function SlideDots({ count, active, onSelect, durationMs, className = "" }: SlideDotsProps) {
  if (count <= 1) return null;

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className="group relative py-2.5 flex items-center focus:outline-none"
          >
            <div
              className={`h-[3px] rounded-full overflow-hidden transition-all duration-300 ${
                isActive ? "w-10 sm:w-14 bg-white/30" : "w-5 sm:w-7 bg-white/30 hover:bg-white/60"
              }`}
            >
              {isActive && (
                <div
                  key={`${active}-${durationMs}`}
                  className="h-full bg-white rounded-full"
                  style={
                    durationMs
                      ? { animation: `slide-bar-fill ${durationMs}ms linear forwards` }
                      : { width: "100%" }
                  }
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
