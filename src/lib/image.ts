// Delivery-side optimisation for Cloudinary images.
//
// Uploads are stored as their raw `secure_url` (…/image/upload/v123/id.jpg),
// which serves the full-resolution original. These helpers rewrite that URL to
// ask Cloudinary for a resized (c_limit — never upscales), auto-format
// (WebP/AVIF where supported) and auto-quality copy instead.
//
// Anything that isn't a Cloudinary image URL (bundled /assets, external links,
// videos) passes through untouched.

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const VERSION_SEGMENT = /^v\d+$/;

// Widths offered in a srcset. Kept short on purpose: every distinct width is
// a separate derived image on Cloudinary.
const WIDTH_LADDER = [160, 320, 480, 640, 828, 1080, 1280, 1600, 1920];

function isCloudinaryRaster(url: string): boolean {
  return CLOUDINARY_UPLOAD.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

/**
 * The URL with `f_auto,q_auto` (and `w_<width>,c_limit` when a width is given)
 * added as a transformation step. Any transformations already in the URL are
 * kept.
 */
export function optimizedImageUrl(url: string, width?: number): string {
  if (!url || !isCloudinaryRaster(url)) return url;
  const m = CLOUDINARY_UPLOAD.exec(url)!;
  const segments = m[2].split("/");

  // Existing transformations sit between /upload/ and the version (v123…)
  // segment. With no version, a folder name can look like a transformation, so
  // ours go first — chaining stays valid either way.
  const versionAt = segments.findIndex((s) => VERSION_SEGMENT.test(s));
  const firstAssetSegment = Math.max(versionAt, 0);

  const ours = ["f_auto", "q_auto", width && `w_${Math.round(width)}`, width && "c_limit"].filter(Boolean).join(",");
  const existing = segments.slice(0, firstAssetSegment);
  const asset = segments.slice(firstAssetSegment);
  return m[1] + [...existing, ours, ...asset].join("/");
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
 * `maxWidth` is the largest file ever worth sending (rendered CSS width × 2 for
 * retina, roughly). `sizes` tells the browser how wide the image renders.
 * Non-Cloudinary URLs come back as a plain `src`.
 */
export function responsiveImage(
  url: string | null | undefined,
  { maxWidth, sizes }: { maxWidth: number; sizes: string },
): ResponsiveImageProps {
  if (!url) return { src: "" };
  if (!isCloudinaryRaster(url)) return { src: url };
  const widths = [...WIDTH_LADDER.filter((w) => w < maxWidth && w >= maxWidth / 4), maxWidth];
  return {
    src: optimizedImageUrl(url, maxWidth),
    srcSet: widths.map((w) => `${optimizedImageUrl(url, w)} ${w}w`).join(", "),
    sizes,
  };
}

/** Fixed-size images (thumbnails, avatars, logos): one file at `width` px. */
export function thumbImage(url: string | null | undefined, width: number): string {
  return url ? optimizedImageUrl(url, width) : "";
}
