type SlideDotsProps = {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  /** ms until autoplay advances — drives the progress ring on the active dot. Omit to disable the ring. */
  durationMs?: number;
  className?: string;
};

export function SlideDots({ count, active, onSelect, durationMs, className = "" }: SlideDotsProps) {
  if (count <= 1) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="relative flex items-center justify-center size-3.5"
          >
            {isActive && (
              <>
                <span className="absolute inset-0 rounded-full border border-white/35" />
                {durationMs && (
                  <svg key={`${active}-${durationMs}`} className="absolute inset-0 -rotate-90" viewBox="0 0 14 14">
                    <circle
                      cx="7"
                      cy="7"
                      r="6"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeDasharray="37.7"
                      style={{ animation: `dot-ring-progress ${durationMs}ms linear forwards` }}
                    />
                  </svg>
                )}
              </>
            )}
            <span className={`size-1.5 rounded-full transition-colors ${isActive ? "bg-white" : "bg-white/40 hover:bg-white/70"}`} />
          </button>
        );
      })}
    </div>
  );
}
