// Delivery-side optimisation for Cloudinary images.
//
// Uploads are stored as their raw `secure_url` (…/image/upload/v123/id.jpg),
// which serves the full-resolution original. These helpers rewrite that URL to
// ask Cloudinary for a resized (c_limit — never upscales), auto-format
// (WebP/AVIF where supported) and auto-quality copy instead.
//
// Quality is q_auto:best, not a bare q_auto. Plain q_auto resolves to
// q_auto:good, which is tuned for bandwidth and visibly softens apparel
// photography (flat fabric, gradients, fine texture).
//
// Anything that isn't a Cloudinary image URL (bundled /assets, external links,
// videos) passes through untouched.

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const VERSION_SEGMENT = /^v\d+$/;

// Widths offered in a srcset. Kept short on purpose: every distinct width is
// a separate derived image on Cloudinary.
const WIDTH_LADDER = [160, 320, 480, 640, 828, 1080, 1280, 1600, 1920, 2560, 3200];

function isCloudinaryRaster(url: string): boolean {
  return CLOUDINARY_UPLOAD.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

/**
 * The URL with `f_auto,q_auto:best` (and `w_<width>,c_limit` when a width is given)
 * added as a transformation step. Any transformations already in the URL are
 * kept.
 */
export function optimizedImageUrl(url: string, width?: number, upscale = false): string {
  if (!url || !isCloudinaryRaster(url)) return url;
  const m = CLOUDINARY_UPLOAD.exec(url)!;
  const segments = m[2].split("/");

  // Existing transformations sit between /upload/ and the version (v123…)
  // segment. With no version, a folder name can look like a transformation, so
  // ours go first — chaining stays valid either way.
  const versionAt = segments.findIndex((s) => VERSION_SEGMENT.test(s));
  const firstAssetSegment = Math.max(versionAt, 0);

  const ours = ["f_auto", "q_auto:best", width && `w_${Math.round(width)}`, width && "c_limit"].filter(Boolean).join(",");
  const existing = segments.slice(0, firstAssetSegment);
  const asset = segments.slice(firstAssetSegment);
  const lift = upscale && width ? upscaleSteps(Math.round(width)) : [];
  return m[1] + [...existing, ...lift, ours, ...asset].join("/");
}

/**
 * Generative-upscale steps, for sources too small for the slot they fill.
 * `e_upscale` invents real detail (4x) where plain resizing only stretches,
 * but it is fussy, so the chain guards every edge:
 *
 *  - `if_iw_lt_<width>` runs it only when the source really is too small, so
 *    a big upload costs nothing and large widths in a srcset stay untouched.
 *  - the `iw`/`ih` bounds keep the input under e_upscale's 4.2MP ceiling —
 *    over it the transformation 400s and the image fails to load entirely.
 *  - `f_jpg` first keeps the 4x result under its 10MB output ceiling.
 *
 * `f_jpg` discards transparency, and e_upscale flattens alpha regardless, so
 * never set `upscale` on an image whose background must stay transparent.
 */
function upscaleSteps(width: number): string[] {
  return [`f_jpg`, `if_iw_lt_${width}_and_iw_lt_2000_and_ih_lt_2100`, "e_upscale", "if_end"];
}

export type ResponsiveImageProps = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

/**
 * Props for an <img> that should pick its resolution from the layout:
 * `{...responsiveImage(url, { maxWidth: 1080, sizes: "(min-width: 768px) 25vw, 50vw" })}`.
 *
 * `maxWidth` is the largest file ever worth sending — rendered CSS width × 2,
 * or × 2.5 for full-bleed art, since c_limit never upscales and a cap below
 * what the device asks for makes the browser stretch the file it gets.
 * `sizes` tells the browser how wide the image renders.
 * Non-Cloudinary URLs come back as a plain `src`.
 */
export function responsiveImage(
  url: string | null | undefined,
  { maxWidth, sizes, upscale = false }: { maxWidth: number; sizes: string; upscale?: boolean },
): ResponsiveImageProps {
  if (!url) return { src: "" };
  if (!isCloudinaryRaster(url)) return { src: url };
  const widths = [...WIDTH_LADDER.filter((w) => w < maxWidth && w >= maxWidth / 4), maxWidth];
  return {
    src: optimizedImageUrl(url, maxWidth, upscale),
    srcSet: widths.map((w) => `${optimizedImageUrl(url, w, upscale)} ${w}w`).join(", "),
    sizes,
  };
}

/** Fixed-size images (thumbnails, avatars, logos): one file at `width` px. */
export function thumbImage(url: string | null | undefined, width: number): string {
  return url ? optimizedImageUrl(url, width) : "";
}
