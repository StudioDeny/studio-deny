import { originalImageUrl } from "@/lib/image";

// Resized copies come from Supabase's image resizer. If it ever refuses
// (plan quota, spend cap, an outage), the page would show broken images even
// though the originals are fine — which is exactly how losing Cloudinary
// looked. One capture-phase listener catches every failed <img> on the page
// and retries it with the original file, so shoppers get a slower image
// instead of none.
//
// When there is nothing left to retry (the original itself failed, or a link
// to a host that is gone, like the disabled Cloudinary account), the image is
// swapped for an "image unavailable" tile. Otherwise the loading skeleton
// (lib/skeleton.ts) stays under the broken image and the slot looks like it is
// loading forever.
//
// Load errors don't bubble, hence capture on window. React leaves the swapped
// attributes alone until the component's own src/srcSet props change. No loop:
// an original's URL isn't a resized-copy URL, and the tile is never replaced.
export function installImageFallback() {
  window.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      // An intentionally empty src (e.g. no hover image) isn't a failure to show.
      if (!img.getAttribute("src") || img.src === UNAVAILABLE_TILE) return;
      const original = originalImageUrl(img.currentSrc || img.src);
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      if (original) {
        img.src = original;
        return;
      }
      img.style.animation = "none";
      img.style.backgroundImage = "none";
      img.src = UNAVAILABLE_TILE;
    },
    true,
  );
}

// Surface-toned square with a small crossed-out picture and a label, centred
// so it survives object-fit: cover cropping at any aspect ratio. Colours are
// the --surface / --muted-foreground tokens; an <img> can't read CSS vars.
const UNAVAILABLE_TILE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560" preserveAspectRatio="xMidYMid slice">` +
      `<rect width="560" height="560" fill="#D5D5D8"/>` +
      `<g fill="none" stroke="#4A4844" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">` +
      `<rect x="258" y="246" width="44" height="34"/><path d="m261 277 13-13 9 9 6-6 11 11"/><path d="m252 242 56 42"/>` +
      `</g>` +
      `<text x="280" y="310" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="600" letter-spacing="2.5" fill="#4A4844" opacity="0.6">IMAGE UNAVAILABLE</text>` +
      `</svg>`,
  );
