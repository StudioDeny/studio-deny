import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { isOutsideLink, routerTarget } from "@/lib/siteLinks";

type LinkOwnProps = ComponentProps<typeof Link>;

type FillLinkProps = LinkOwnProps & {
  children: ReactNode;
  /** light = white border/text sweeping to white bg + black text (for use over dark/image backgrounds).
   *  dark  = foreground border/text sweeping to foreground bg + background text (for use on light backgrounds). */
  tone?: "light" | "dark";
  className?: string;
  /** A link set in the admin (LinkPicker): page, ?filters, #section or outside link. Used instead of `to`. */
  link?: string;
};

export function FillLink({ children, tone = "dark", className = "", link, ...linkProps }: FillLinkProps) {
  const toneCls =
    tone === "light"
      ? "btn-fill--light border border-white text-white"
      : "btn-fill--dark border border-foreground text-foreground";

  const cls = `btn-fill group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-11 text-xs sm:text-sm tracking-[0.14em] uppercase text-mono ${toneCls} ${className}`;
  const inner = (
    <>
      <span className="btn-fill-bg" aria-hidden="true" />
      <span className="btn-fill-front inline-flex items-center gap-2">{children}</span>
      <span className="btn-fill-back inline-flex items-center gap-2" aria-hidden="true">{children}</span>
    </>
  );
  if (link !== undefined && isOutsideLink(link)) {
    return <a href={link.trim()} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  }
  const target = link !== undefined ? routerTarget(link) : null;
  return (
    <Link
      {...linkProps}
      {...(target ? { to: target.to as never, search: target.search as never, hash: target.hash } : {})}
      className={cls}
    >
      {inner}
    </Link>
  );
}
