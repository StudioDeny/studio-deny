import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useWebsiteSectionConfig } from "@/lib/websiteSections";
import { responsiveImage } from "@/lib/image";
import { QUOTES } from "@/lib/quotes";
import type { HeroSlide } from "@/components/home/HeroSlider";

const EASE = [0.16, 1, 0.3, 1] as const;
const QUOTE_MS = 7000;

const isImage = (src?: string) =>
  !!src && /\/image\/upload\/|\.(jpe?g|png|webp|avif)(\?|$)/i.test(src);

/**
 * Shared frame for /login and /signup: an editorial split screen.
 *
 * Left (desktop) / top band (phones): the current hero campaign photo, taken
 * from the home page's CMS config so the sign-in page always matches the
 * live campaign, with the wordmark and a fashion quote fading through on the
 * same seven-second rhythm as the loading screen. Falls back to solid black
 * if no hero image is set.
 *
 * Right: the form, under a LOG IN / SIGN UP switch. The two pages are
 * separate routes, so this is a pair of links rather than tabs.
 */
export function AuthShell({
  mode,
  eyebrow,
  title,
  aside,
  children,
}: {
  mode: "login" | "signup";
  eyebrow: string;
  title: string;
  /** Short line under the photo's quote — e.g. member perks. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const { config } = useWebsiteSectionConfig<{ slides?: HeroSlide[] }>("hero", {});
  const slide = (config.slides ?? []).find((s) => isImage(s.src));
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const quote = QUOTES[quoteIndex];

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setQuoteIndex((i) => (i + 1) % QUOTES.length), QUOTE_MS);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section className="grid lg:grid-cols-[1.1fr_1fr] min-h-[calc(100svh-var(--topbar-h))]">
      {/* ─── Editorial panel ─── */}
      <div className="dark-section relative overflow-hidden bg-foreground text-white h-[34svh] min-h-[240px] lg:h-auto">
        {slide && (
          <motion.img
            {...responsiveImage(slide.src, {
              maxWidth: 2560,
              sizes: "(min-width: 1024px) 55vw, 100vw",
            })}
            alt=""
            aria-hidden
            fetchPriority="high"
            // A very slow push-in, so the photo feels alive behind the form.
            initial={reduce ? false : { scale: 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 2.4, ease: EASE }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Darkens towards the bottom, where the type sits. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10 lg:p-14">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          >
            <Link
              to="/"
              aria-label="Studio Deny home"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <BrandLogo className="text-white" style={{ fontSize: "clamp(22px, 2.4vw, 32px)" }} />
            </Link>
          </motion.div>

          <div className="max-w-xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.blockquote
                key={quoteIndex}
                initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.9, ease: EASE }}
                className="hidden sm:block"
              >
                <p
                  className="text-display uppercase leading-[0.95]"
                  style={{ fontSize: "clamp(28px, 3.4vw, 52px)" }}
                >
                  {quote.line}
                </p>
                <footer className="mt-5 text-mono text-[11px] tracking-[0.3em] text-white/70">
                  — {quote.author}
                </footer>
              </motion.blockquote>
            </AnimatePresence>
            {aside && <div className="mt-8 hidden lg:block">{aside}</div>}
          </div>
        </div>
      </div>

      {/* ─── Form ─── */}
      <div className="flex items-start lg:items-center justify-center px-5 sm:px-10 py-10 sm:py-14 lg:py-16">
        <div className="w-full max-w-[420px]">
          <nav aria-label="Account" className="flex gap-8 border-b border-foreground/10 mb-10">
            {(
              [
                ["login", "/login", "Log in"],
                ["signup", "/signup", "Sign up"],
              ] as const
            ).map(([key, to, label]) => (
              <Link
                key={key}
                to={to}
                aria-current={mode === key ? "page" : undefined}
                className={`relative -mb-px pb-3 text-mono text-[12px] font-semibold uppercase tracking-[0.25em] transition-colors ${
                  mode === key ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"
                }`}
              >
                {label}
                {mode === key && (
                  <motion.span
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground origin-left"
                  />
                )}
              </Link>
            ))}
          </nav>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="text-mono text-[11px] tracking-[0.3em] text-foreground/55 mb-3"
          >
            ◢ {eyebrow}
          </motion.div>

          {/* Title rises out of a mask, like the hero headline. */}
          <h1
            className="text-display uppercase leading-[0.9] mb-8 overflow-hidden"
            style={{ fontSize: "clamp(52px, 7vw, 84px)" }}
          >
            <motion.span
              className="block"
              initial={reduce ? false : { y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            >
              {title}
            </motion.span>
          </h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
