// Opens a link set in the admin (LinkPicker): outside links in a new tab,
// site links through the router, including ?filters and #home-sections —
// <Link to="/shop?sale=1"> would treat "?sale=1" as part of the path.
import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { isOutsideLink, routerTarget } from "@/lib/siteLinks";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children?: ReactNode };

export function SiteLink({ href, children, ...rest }: Props) {
  if (isOutsideLink(href)) {
    return (
      <a href={href.trim()} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  const t = routerTarget(href);
  return (
    <Link to={t.to as never} search={t.search as never} hash={t.hash} {...(rest as object)}>
      {children}
    </Link>
  );
}
