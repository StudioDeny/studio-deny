import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import type { MegaMenuCategory, MegaMenuProduct } from "@/lib/megaMenu";
import { formatINR } from "@/context/CartContext";
import { responsiveImage } from "@/lib/image";

export function MegaMenuPanel({
  category,
  onNavigate,
  variant = "desktop",
}: {
  category: MegaMenuCategory;
  onNavigate: () => void;
  variant?: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.025,
        delayChildren: shouldReduceMotion ? 0 : 0.01,
      },
    },
  };

  const linkVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -6 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const productVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  // Phone menu: links rise in one after another once the menu has opened,
  // then the product cards follow. Slower and longer than the desktop
  // stagger — on a phone this is the whole screen, so the cascade is the
  // entrance rather than a detail.
  const mobileList = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.045, delayChildren: shouldReduceMotion ? 0 : 0.18 } },
  };
  const mobileLink = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  };
  const mobileCards = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08, delayChildren: shouldReduceMotion ? 0 : 0.3 } },
  };
  const mobileCard = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: shouldReduceMotion ? 1 : 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const nameOverlay = (product: MegaMenuProduct) => (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
        <div className="min-w-0 pr-2">
          <p className="text-white font-semibold text-xs sm:text-sm tracking-wide truncate">
            {product.label}
          </p>
          <span className="text-white/75 text-[11px] font-mono mt-0.5 block">{formatINR(product.price)}</span>
        </div>
        <span className="text-[10px] text-white tracking-widest font-semibold shrink-0 flex items-center gap-1 group-hover:translate-x-1 transition-transform opacity-90 font-mono">
          SHOP →
        </span>
      </div>
    </>
  );

  return (
    <div className={isDesktop ? "flex items-stretch h-full w-full bg-white text-black" : "flex flex-col gap-6 bg-white text-black"}>
      {/* Navigation Links Column (Width 220–240px, Minimal Luxury Typography) */}
      {isDesktop ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-[220px] lg:w-[240px] shrink-0 h-full overflow-y-auto overscroll-contain custom-scrollbar p-6 lg:px-8 flex flex-col border-r border-black/5 bg-white"
          data-lenis-prevent
        >
          <div className="flex flex-col gap-1.5 my-auto">
            {category.links.length > 0 ? (
              category.links.map((l) => (
                <motion.div key={l.id} variants={linkVariants}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link
                    to={l.href as any}
                    onClick={onNavigate}
                    activeProps={{ className: "text-black font-medium underline underline-offset-4 decoration-black/30" }}
                    inactiveProps={{ className: "text-black/60 font-normal" }}
                    className="group py-1.5 text-sm tracking-wide hover:text-black transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between capitalize w-full bg-transparent font-body"
                  >
                    <span>{l.label}</span>
                    <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-xs text-black/40 font-mono">
                      →
                    </span>
                  </Link>
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-black/40 py-2 font-mono italic">No category links.</p>
            )}
          </div>
        </motion.div>
      ) : (
        category.links.length > 0 && (
          <motion.div variants={mobileList} initial="hidden" animate="show" className="flex flex-col gap-1 px-4 pt-4">
            {category.links.map((l) => (
              <motion.div key={l.id} variants={mobileLink}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={l.href as any} onClick={onNavigate} className="group inline-flex items-center gap-2 py-2 text-sm tracking-wide font-medium active:opacity-60 transition-opacity w-fit capitalize">
                  {l.label}
                  <span aria-hidden className="text-black/30 transition-transform duration-300 group-active:translate-x-1">→</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )
      )}

      {/* Edge-to-Edge Editorial Image Cards (20px Spacing, 1.02x Zoom on Hover) */}
      {category.products.length > 0 ? (
        isDesktop ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 flex-1 min-w-0 h-full self-stretch p-5 gap-5 bg-white"
          >
            {category.products.map((p) => (
              <motion.div key={p.id} variants={productVariants} className="h-full w-full">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={p.href as any} onClick={onNavigate} className="group min-w-0 h-full w-full flex items-center justify-center">
                  {/* Whole photo, fitted to the space (never cropped); the
                      name sits on the photo itself, not the empty sides. */}
                  <span className="relative h-full max-w-full overflow-hidden rounded-xs">
                    <img
                      {...responsiveImage(p.imageUrl, { maxWidth: 828, sizes: "25vw" })}
                      alt={p.label}
                      loading="lazy"
                      decoding="async"
                      className="block h-full w-auto max-w-full object-contain"
                    />
                    {nameOverlay(p)}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={mobileCards} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 px-4 pb-4">
            {category.products.map((p) => (
              <motion.div key={p.id} variants={mobileCard}>
                <MobileProductCard product={p} onNavigate={onNavigate} />
              </motion.div>
            ))}
          </motion.div>
        )
      ) : (
        isDesktop && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 my-5 mr-5 rounded-xs border border-dashed border-black/10 bg-neutral-50/50 text-center text-xs tracking-widest text-black/35 font-mono">
            <span>NO FEATURED ITEMS</span>
          </div>
        )
      )}

      {category.links.length === 0 && category.products.length === 0 && !isDesktop && (
        <p className="text-sm text-muted-foreground p-6">Nothing in this menu yet.</p>
      )}
    </div>
  );
}

function MobileProductCard({ product, onNavigate }: { product: MegaMenuProduct; onNavigate: () => void }) {
  const discountPct = product.compareAt && product.compareAt > product.price
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : null;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={product.href as any} onClick={onNavigate} className="group block">
      <div className="relative w-full overflow-hidden bg-surface rounded-xs" style={{ aspectRatio: "4/5" }}>
        <img
          {...responsiveImage(product.imageUrl, { maxWidth: 1280, sizes: "50vw" })}
          alt={product.label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-active:scale-[1.03]"
        />
        {discountPct !== null && (
          <span className="absolute top-2 left-2 bg-black text-white font-bold px-1.5 py-0.5 rounded-xs" style={{ fontSize: "10px" }}>
            -{discountPct}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xs tracking-wide truncate font-medium">{product.label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold">{formatINR(product.price)}</span>
        {discountPct !== null && (
          <span className="text-xs text-muted-foreground line-through">{formatINR(product.compareAt!)}</span>
        )}
      </div>
    </Link>
  );
}
