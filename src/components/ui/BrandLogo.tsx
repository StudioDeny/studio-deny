import type { CSSProperties } from "react";

/**
 * The Studio Deny logo built from text. Inherits its colour from the
 * surrounding element; set the size with font-size.
 */
export function BrandLogo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`brand-logo ${className}`} style={style}>
      Studio Deny.
    </span>
  );
}
