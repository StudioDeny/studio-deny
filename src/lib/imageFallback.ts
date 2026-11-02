import { originalImageUrl } from "@/lib/image";

// Resized copies come from Supabase's image resizer. If it ever refuses
// (plan quota, spend cap, an outage), the page would show broken images even
// though the originals are fine — which is exactly how losing Cloudinary
// looked. One capture-phase listener catches every failed <img> on the page
// and retries it with the original file, so shoppers get a slower image
// instead of none.
//
// Load errors don't bubble, hence capture on window. React leaves the swapped
// attributes alone until the component's own src/srcSet props change. No loop:
// an original's URL isn't a resized-copy URL, so a failing original stops here.
export function installImageFallback() {
  window.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const original = originalImageUrl(img.currentSrc || img.src);
      if (!original) return;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = original;
    },
    true,
  );
}
