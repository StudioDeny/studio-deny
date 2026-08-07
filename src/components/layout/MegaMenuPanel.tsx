import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import type { MegaMenuCategory, MegaMenuProduct } from "@/lib/megaMenu";
import { formatINR } from "@/context/CartContext";

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
    <div className={isDesktop ? "flex items-stretch h-full w-full overflow-hidden bg-white text-black" : "flex flex-col gap-6 bg-white text-black"}>
      {/* Navigation Links Column (Width 220–240px, Vertically Centered with Animated Left Bar) */}
      {isDesktop ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-[220px] lg:w-[240px] shrink-0 h-full overflow-y-auto custom-scrollbar p-5 lg:px-7 flex flex-col justify-center border-r border-black/5 bg-white"
        >
          <div className="flex flex-col gap-1 my-auto">
            {category.links.length > 0 ? (
              category.links.map((l) => (
                <motion.div key={l.id} variants={linkVariants}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link
                    to={l.href as any}
                    onClick={onNavigate}
                    className="group relative py-1.5 px-3 -mx-3 rounded-none text-xs font-mono tracking-[0.06em] text-black/70 hover:text-black font-medium hover:bg-black/[0.03] transition-all duration-200 flex items-center justify-between capitalize"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-3 bg-black rounded-full transition-all duration-200 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">{l.label}</span>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] text-black/50 font-mono">
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
          <div className="flex flex-col gap-1 px-4 pt-4">
            {category.links.map((l) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={l.id} to={l.href as any} onClick={onNavigate} className="py-2 text-sm tracking-wide font-medium hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit capitalize">
                {l.label}
              </Link>
            ))}
          </div>
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
                <Link to={p.href as any} onClick={onNavigate} className="group relative min-w-0 h-full w-full overflow-hidden rounded-xs bg-neutral-900 block">
                  <img
                    src={p.imageUrl}
                    alt={p.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                  {nameOverlay(p)}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {category.products.map((p) => <MobileProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
          </div>
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
          src={product.imageUrl}
          alt={product.label}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
