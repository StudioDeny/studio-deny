import type { CSSProperties } from "react";

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * A tiny, heavily blurred copy of a Cloudinary image (~1KB), painted as the
 * <img>'s own background. The browser shows an <img>'s background until the
 * real pixels arrive, so the slot reads as a blurry preview instead of a blank
 * box while the full image loads — no JS, no extra wrapper element.
 *
 * Non-Cloudinary URLs (bundled assets, external links) get no placeholder and
 * fall back to whatever background the container already has.
 */
export function blurPlaceholder(url: string | null | undefined): CSSProperties | undefined {
  if (!url) return undefined;
  const m = CLOUDINARY_UPLOAD.exec(url);
  if (!m) return undefined;
  const tiny = `${m[1]}w_40,q_auto:low,e_blur:1000,f_auto/${m[2]}`;
  return {
    backgroundImage: `url("${tiny}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
