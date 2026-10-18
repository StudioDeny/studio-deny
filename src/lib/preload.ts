import type { ResponsiveImageProps } from "@/lib/image";

/**
 * Warms a set of responsive images and resolves once they are all in cache.
 *
 * Used to hold a loading screen up until the page behind it is genuinely
 * ready: without it the loader clears as soon as the *data* arrives and the
 * grid then fills in photo by photo, which puts a second loading stage right
 * after the first.
 *
 * The images are warmed through real <img> elements with `srcset`/`sizes`
 * set, so the browser picks exactly the width it will pick in the grid and
 * the later render is a cache hit. Picking a width ourselves would guess
 * wrong whenever the layout disagreed.
 *
 * Always resolves — never rejects — and gives up after `timeoutMs` so one
 * broken or slow image can't strand the visitor on the loading screen.
 */
export function preloadResponsive(
  images: ResponsiveImageProps[],
  timeoutMs = 2500,
): Promise<void> {
  if (typeof window === "undefined" || !images.length) return Promise.resolve();

  const settled = images
    .filter((img) => img.src)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = new Image();
          el.decoding = "async";
          // sizes must be set before srcset for the browser to select correctly.
          if (img.sizes) el.sizes = img.sizes;
          if (img.srcSet) el.srcset = img.srcSet;
          el.onload = () => resolve();
          el.onerror = () => resolve();
          el.src = img.src;
        }),
    );

  return Promise.race([
    Promise.all(settled).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
