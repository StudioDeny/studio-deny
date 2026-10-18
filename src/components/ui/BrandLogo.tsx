import type { CSSProperties } from "react";

/**
 * The Studio Deny logo built from text: white "Studio Deny." on a black
 * block. Sharp at any size; set the size with font-size (padding is in em).
 */
export function BrandLogo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`brand-logo ${className}`} style={style}>
      Studio Deny.
    </span>
  );
}
