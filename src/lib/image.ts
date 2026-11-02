// Delivery-side optimisation for uploaded images.
//
// Uploads are stored as their raw public URL, which serves the full-resolution
// original. These helpers rewrite that URL to ask for a resized, auto-format
// (WebP where supported), high-quality copy instead:
//
// - Supabase Storage (the `media` bucket, where uploads go now):
//   /storage/v1/object/public/… → /storage/v1/render/image/public/…?width=…
//   Needs the Pro plan. Billed per original image, not per size requested.
//   Quality 90, not the default 80, which visibly softens apparel photography
//   (flat fabric, gradients, fine texture).
// - Cloudinary (older uploads not yet moved over): a transformation step is
//   added. q_auto:best, not a bare q_auto, for the same reason as above.
//
// Anything else (bundled /assets, external links, videos, SVG/GIF) passes
// through untouched.

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const VERSION_SEGMENT = /^v\d+$/;

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
const SUPABASE_OBJECT = `${SUPABASE_URL}/storage/v1/object/public/`;
const SUPABASE_RENDER = `${SUPABASE_URL}/storage/v1/render/image/public/`;
// Only our own project's files, only formats the resizer handles, no query string.
const SUPABASE_RASTER_PATH = /^[^?#]+\.(jpe?g|png|webp|avif)$/i;
// Supabase's resizer caps width at 2500 px.
const SUPABASE_MAX_WIDTH = 2500;
const SUPABASE_QUALITY = 90;

// Widths offered in a srcset. Kept short on purpose: every distinct width is
// a separate resized copy to generate and cache.
const WIDTH_LADDER = [160, 320, 480, 640, 828, 1080, 1280, 1600, 1920, 2560, 3200];

function isCloudinaryRaster(url: string): boolean {
  return CLOUDINARY_UPLOAD.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

function isSupabaseRaster(url: string): boolean {
  return !!SUPABASE_URL && url.startsWith(SUPABASE_OBJECT) && SUPABASE_RASTER_PATH.test(url.slice(SUPABASE_OBJECT.length));
}

function supabaseImageUrl(url: string, width?: number): string {
  const params = new URLSearchParams();
  if (width) {
    params.set("width", String(Math.min(Math.round(width), SUPABASE_MAX_WIDTH)));
    params.set("resize", "contain");
  }
  params.set("quality", String(SUPABASE_QUALITY));
  return `${SUPABASE_RENDER}${url.slice(SUPABASE_OBJECT.length)}?${params}`;
}

/**
 * The original file behind a Supabase resized-copy URL, or null for any other
 * URL. Used to fall back when the resizer is unavailable (see imageFallback.ts).
 */
export function originalImageUrl(url: string): string | null {
  if (!SUPABASE_URL || !url.startsWith(SUPABASE_RENDER)) return null;
  return SUPABASE_OBJECT + url.slice(SUPABASE_RENDER.length).split("?")[0];
}

/**
 * The URL of a resized (when a width is given), auto-format, high-quality copy.
 * For Cloudinary, any transformations already in the URL are kept.
 */
export function optimizedImageUrl(url: string, width?: number): string {
  if (!url) return url;
  if (isSupabaseRaster(url)) return supabaseImageUrl(url, width);
  if (!isCloudinaryRaster(url)) return url;
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
 * `maxWidth` is the largest file ever worth sending — rendered CSS width × 2,
 * or × 2.5 for full-bleed art, since neither service upscales and a cap below
 * what the device asks for makes the browser stretch the file it gets.
 * `sizes` tells the browser how wide the image renders.
 * URLs that can't be resized come back as a plain `src`.
 */
export function responsiveImage(
  url: string | null | undefined,
  { maxWidth, sizes }: { maxWidth: number; sizes: string },
): ResponsiveImageProps {
  if (!url) return { src: "" };
  const cap = isSupabaseRaster(url) ? Math.min(maxWidth, SUPABASE_MAX_WIDTH) : isCloudinaryRaster(url) ? maxWidth : 0;
  if (!cap) return { src: url };
  const widths = [...WIDTH_LADDER.filter((w) => w < cap && w >= cap / 4), cap];
  return {
    src: optimizedImageUrl(url, cap),
    srcSet: widths.map((w) => `${optimizedImageUrl(url, w)} ${w}w`).join(", "),
    sizes,
  };
}

/** Fixed-size images (thumbnails, avatars, logos): one file at `width` px. */
export function thumbImage(url: string | null | undefined, width: number): string {
  return url ? optimizedImageUrl(url, width) : "";
}
