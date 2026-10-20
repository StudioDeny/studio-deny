import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePreloaderDone } from "@/lib/preloaderStore";

/** Glide from the preloader's logo position to the hero centre. */
const INTRO_MS = 950;

/** Share of the hero's height the visitor scrolls before the logo docks. */
const DOCK_AT = 1;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Pose = { x: number; y: number; w: number };
const mix = (a: Pose, b: Pose, t: number): Pose => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t) });

/** Centre and width of an element's box on screen, transforms included. */
function poseOf(el: Element | null): Pose | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
}

/**
 * The home page's wordmark, as one element on a three-part journey:
 *
 *   1. While the preloader runs, it sits exactly over the preloader's own
 *      logo (which is kept in layout but not painted), following its
 *      entrance animation frame by frame.
 *   2. When the preloader is dismissed, it glides to the centre of the hero
 *      while the preloader fades out from underneath it.
 *   3. As the visitor scrolls, it travels up into the navbar's logo slot,
 *      shrinking and turning from white to black, and hands off to the real
 *      navbar logo the moment they match.
 *
 * Because it is never unmounted along the way, it reads as the same logo
 * continuing rather than three logos taking turns.
 *
 * Every pose is measured from the live page rather than hard-coded — the
 * preloader logo, the hero area and the navbar slot — so it stays aligned at
 * any viewport size and if the navbar layout changes. Position and size are
 * applied as a single transform (no layout per frame), written straight to
 * the DOM so scrolling never re-renders React.
 *
 * `hasHero` is undefined until the hero's config has loaded; the glide waits
 * for it. With no hero, the logo flies straight to the navbar instead.
 */
export function HeroLogo({ hasHero }: { hasHero: boolean | undefined }) {
  const reduceMotion = useReducedMotion();
  const preloaderDone = usePreloaderDone();
  const logoRef = useRef<HTMLDivElement>(null);

  // Arriving by client-side navigation, the preloader finished long ago:
  // skip the glide and start at the hero.
  const skipIntro = useRef(preloaderDone);
  const mountedAt = useRef(0);
  const introStartedAt = useRef<number | null>(null);
  const preloaderPose = useRef<Pose | null>(null);

  // Hide the real navbar logo before first paint, so there are never two.
  useLayoutEffect(() => {
    if (reduceMotion) return;
    const navLogo = document.querySelector<HTMLElement>("[data-nav-logo] .brand-logo");
    if (navLogo) navLogo.style.opacity = "0";
    return () => {
      if (navLogo) navLogo.style.opacity = "";
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (preloaderDone && hasHero !== undefined && introStartedAt.current === null) {
      introStartedAt.current = performance.now();
    }
  }, [preloaderDone, hasHero]);

  useEffect(() => {
    if (reduceMotion) return;
    const el = logoRef.current;
    if (!el) return;
    // Once only. This effect re-runs while the preloader is still up —
    // useReducedMotion() settles from null, and hasHero arrives when the
    // hero config loads — and resetting the clock each time restarted the
    // fade-in from opacity 0, which showed as the logo blinking.
    if (!mountedAt.current) mountedAt.current = performance.now();

    let frame = 0;

    const render = () => {
      frame = 0;
      const now = performance.now();
      const logoText = el.firstElementChild as HTMLElement | null;
      if (!logoText) return;
      const naturalW = logoText.offsetWidth; // untransformed, at the hero size
      const naturalH = logoText.offsetHeight;
      if (!naturalW) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 0;
      const heroH = Math.max(420, vh - topbarH); // HeroSlider: calc(100vh - topbar), min 420px

      const heroPose: Pose = { x: vw / 2, y: topbarH + heroH / 2, w: naturalW };
      const navPose = poseOf(document.querySelector("[data-nav-logo] .brand-logo")) ?? heroPose;

      // The preloader logo only exists while the preloader does; remember
      // where it was so the glide starts from its last real position.
      const livePreloader = poseOf(document.querySelector("[data-preloader-logo] .brand-logo"));
      if (livePreloader) preloaderPose.current = livePreloader;
      const startPose = preloaderPose.current ?? heroPose;

      const rest = hasHero === false ? navPose : heroPose;

      let introT: number;
      if (skipIntro.current) introT = 1;
      else if (introStartedAt.current === null) introT = 0;
      else introT = clamp01((now - introStartedAt.current) / INTRO_MS);

      const base = mix(startPose, rest, easeOut(introT));

      // Scroll carries it from the hero into the navbar.
      // Linear: the logo moves at a constant rate per pixel scrolled — no
      // easing — so it travels exactly in step with the page.
      const scrollT = hasHero ? clamp01(window.scrollY / (heroH * DOCK_AT)) : 0;
      const pose = hasHero ? mix(base, navPose, scrollT) : base;

      const docked = hasHero ? scrollT >= 1 : introT >= 1 && hasHero === false;
      // White for as long as it is over the hero or the preloader, and black
      // only while it is actually inside the navbar: the colour follows how
      // much of the logo has crossed the navbar's bottom edge, not how far
      // the page has scrolled — so it never goes grey over the photo.
      const scaledH = naturalH * (pose.w / naturalW);
      const insideNav = clamp01((topbarH - (pose.y - scaledH / 2)) / scaledH);
      const whiteness = 1 - insideNav;
      const shade = Math.round(255 * whiteness);
      const fadeIn = skipIntro.current ? 1 : clamp01((now - mountedAt.current) / 600);

      el.style.transform = `translate3d(${pose.x - naturalW / 2}px, ${pose.y - naturalH / 2}px, 0) scale(${pose.w / naturalW})`;
      el.style.color = `rgb(${shade}, ${shade}, ${shade})`;
      // A soft shadow keeps white type legible on bright hero photos; it
      // fades out as the logo darkens on its way to the white navbar.
      el.style.textShadow = `0 2px 28px rgba(0, 0, 0, ${(0.35 * whiteness).toFixed(3)})`;
      el.style.opacity = String(fadeIn);
      el.style.visibility = docked ? "hidden" : "visible";

      const navLogo = document.querySelector<HTMLElement>("[data-nav-logo] .brand-logo");
      if (navLogo) navLogo.style.opacity = docked ? "1" : "0";

      // Keep animating through the preloader and the glide; after that, only
      // scroll and resize move it.
      const settling = !skipIntro.current && introT < 1;
      if (settling || fadeIn < 1) schedule();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduceMotion, hasHero, preloaderDone]);

  if (reduceMotion || typeof document === "undefined") return null;

  // Portalled to <body>: it has to sit above the preloader (z 99999), and the
  // home page renders inside a page-transition wrapper whose opacity
  // animation would trap any z-index set in here.
  return createPortal(
    <div
      ref={logoRef}
      aria-hidden
      // flex, not block: as a block the inline logo sits on a text line with
      // descender space below it, which offsets the transform's centre.
      className="pointer-events-none fixed left-0 top-0 flex origin-center will-change-transform"
      style={{ opacity: 0, zIndex: 100000 }}
    >
      <BrandLogo style={{ fontSize: "clamp(44px, 8.5vw, 120px)" }} />
    </div>,
    document.body,
  );
}
