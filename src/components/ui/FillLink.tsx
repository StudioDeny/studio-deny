import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

type LinkOwnProps = ComponentProps<typeof Link>;

type FillLinkProps = LinkOwnProps & {
  children: ReactNode;
  /** light = white border/text sweeping to white bg + black text (for use over dark/image backgrounds).
   *  dark  = foreground border/text sweeping to foreground bg + background text (for use on light backgrounds). */
  tone?: "light" | "dark";
  className?: string;
};

export function FillLink({ children, tone = "dark", className = "", ...linkProps }: FillLinkProps) {
  const toneCls =
    tone === "light"
      ? "btn-fill--light border border-white text-white"
      : "btn-fill--dark border border-foreground text-foreground";

  return (
    <Link
      {...linkProps}
      className={`btn-fill group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-11 text-xs sm:text-sm tracking-[0.14em] uppercase text-mono ${toneCls} ${className}`}
    >
      <span className="btn-fill-bg" aria-hidden="true" />
      <span className="btn-fill-front inline-flex items-center gap-2">{children}</span>
      <span className="btn-fill-back inline-flex items-center gap-2" aria-hidden="true">{children}</span>
    </Link>
  );
}
