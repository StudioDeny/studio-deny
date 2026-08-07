import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Product, VariantStock } from "@/lib/productsStore";
import { getVariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShoppingBag, Ruler } from "lucide-react";

/* ─────────────────────────── Types ──────────────────────────── */
type QuickAddContextType = {
  openQuickAdd: (product: Product) => void;
  closeQuickAdd: () => void;
};

const QuickAddContext = createContext<QuickAddContextType | undefined>(undefined);

/* ────────────────── useMediaQuery hook ──────────────────────── */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/* ─────────────────── Size Guide Table ───────────────────────── */
function SizeGuideContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 bg-white text-black p-6 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-5 border-b border-black/10 pb-4 shrink-0">
        <h3 className="text-xs font-mono tracking-[0.2em] uppercase font-semibold flex items-center gap-2">
          <Ruler className="size-4" />
          SIZE GUIDE
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close size guide"
          className="p-2 text-black/60 hover:text-black -mr-2"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs font-mono border-collapse mb-5">
          <thead>
            <tr className="border-b border-black/10 text-left text-black/60">
              <th className="py-2">SIZE</th>
              <th className="py-2">CHEST</th>
              <th className="py-2">WAIST</th>
              <th className="py-2">LENGTH</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["XS", '34–36"', '28–30"', '27"'],
              ["S",  '36–38"', '30–32"', '28"'],
              ["M",  '38–40"', '32–34"', '29"'],
              ["L",  '40–42"', '34–36"', '30"'],
              ["XL", '42–44"', '36–38"', '31"'],
            ].map(([size, chest, waist, length]) => (
              <tr key={size} className="border-b border-black/5">
                <td className="py-2.5 font-semibold">{size}</td>
                <td className="py-2.5">{chest}</td>
                <td className="py-2.5">{waist}</td>
                <td className="py-2.5">{length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-black/50 font-mono italic">
          * Standard luxury relaxed fit. Select your normal size.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full py-3.5 bg-black text-white font-mono text-xs tracking-widest uppercase font-semibold mt-5 shrink-0"
      >
        CLOSE
      </button>
    </div>
  );
}

/* ─────────────── Size Selector Grid ─────────────────────────── */
function SizeGrid({
  options,
  selected,
  loading,
  onSelect,
}: {
  options: VariantStock[];
  selected: string | null;
  loading: boolean;
  onSelect: (s: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex gap-2 flex-wrap animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-11 w-12 bg-black/8 rounded-sm" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSel = selected === opt.size;
        return (
          <button
            key={opt.variantId ?? opt.size}
            disabled={!opt.inStock}
            type="button"
            onClick={() => onSelect(opt.size)}
            className={`h-11 min-w-[44px] px-3 font-mono text-xs tracking-wider transition-all duration-150 flex items-center justify-center ${
              !opt.inStock
                ? "text-black/30 line-through cursor-not-allowed border border-black/8 bg-neutral-50"
                : isSel
                ? "bg-black text-white font-semibold"
                : "border border-black/20 text-black hover:border-black font-normal"
            }`}
          >
            {opt.size}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════ MOBILE FLOATING CARD ═══════════════════ */
const CARD_EASE = [0.22, 1, 0.36, 1] as const;

function MobileFloatingCard({
  product,
  sizeOptions,
  selectedSize,
  loadingSizes,
  addedSuccess,
  onClose,
  onSelectSize,
  onAddToCart,
}: {
  product: Product;
  sizeOptions: VariantStock[];
  selectedSize: string | null;
  loadingSizes: boolean;
  addedSuccess: boolean;
  onClose: () => void;
  onSelectSize: (s: string) => void;
  onAddToCart: () => void;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const activeOpt = sizeOptions.find((o) => o.size === selectedSize);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick add ${product.name}`}
    >
      {/* Dimmed backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="absolute inset-0 bg-black/48 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Floating card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: CARD_EASE }}
        className="relative z-10 w-full bg-white text-black flex flex-col overflow-hidden"
        style={{
          width: "min(88vw, 340px)",
          maxHeight: "80dvh",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.12)",
          willChange: "transform, opacity",
        }}
      >
        {/* ── Product Image — full image, compact & uncropped ── */}
        <div
          className="relative w-full bg-neutral-50 shrink-0 overflow-hidden flex items-center justify-center"
          style={{ maxHeight: 180, height: 180 }}
        >
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full block"
            style={{ display: "block", objectFit: "contain" }}
          />
          {/* Category chip */}
          <span
            className="absolute top-2.5 left-2.5 font-mono text-white/90 uppercase tracking-[0.2em] bg-black/40 backdrop-blur-sm px-2 py-0.5"
            style={{ fontSize: 8 }}
          >
            {product.category}
          </span>
        </div>

        {/* ── Close Button ── */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 z-50 size-[32px] flex items-center justify-center bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>

        {/* ── Scrollable body ── */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain no-scrollbar"
          data-lenis-prevent
          /* bottom padding reserves space for the sticky CTA */
          style={{ paddingBottom: 68 }}
        >
          {/* Name + Price */}
          <div className="px-4 pt-3 pb-1">
            <h2
              className="font-body font-semibold text-black leading-tight mb-1 truncate"
              style={{ fontSize: 15, letterSpacing: "0.01em" }}
            >
              {product.name}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-black tracking-widest" style={{ fontSize: 13 }}>
                {formatINR(product.price)}
              </span>
              {product.compareAt && product.compareAt > product.price && (
                <span className="font-mono text-black/38 line-through" style={{ fontSize: 11 }}>
                  {formatINR(product.compareAt)}
                </span>
              )}
            </div>
          </div>

          <div className="mx-4 border-t border-black/8 my-3" />

          {/* Color swatches */}
          {product.colors && product.colors.length > 0 && (
            <div className="px-4 mb-3">
              <span
                className="font-mono text-black/50 uppercase tracking-widest block mb-1.5"
                style={{ fontSize: 9 }}
              >
                COLOR · {product.colors[0].name}
              </span>
              <div className="flex gap-1.5">
                {product.colors.map((c) => (
                  <span
                    key={c.name}
                    title={c.name}
                    className="inline-block size-6 rounded-full border-[2px] border-black/15 shadow-sm"
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className="font-mono text-black/55 uppercase tracking-widest"
                style={{ fontSize: 9 }}
              >
                SELECT SIZE
              </span>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="font-mono text-black/45 hover:text-black underline underline-offset-4 transition-colors min-h-[36px] flex items-center"
                style={{ fontSize: 10 }}
              >
                Size Guide
              </button>
            </div>

            <SizeGrid
              options={sizeOptions}
              selected={selectedSize}
              loading={loadingSizes}
              onSelect={onSelectSize}
            />

            {activeOpt?.inStock && activeOpt.stock > 0 && activeOpt.stock <= 3 && (
              <p
                className="mt-2 font-mono tracking-widest text-amber-700 uppercase"
                style={{ fontSize: 9 }}
              >
                ONLY {activeOpt.stock} LEFT IN STOCK
              </p>
            )}
          </div>
        </div>

        {/* ── Sticky CTA — anchored to card bottom, outside scroll area ── */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-3.5 pt-2.5 pb-3 shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        >
          <button
            type="button"
            disabled={!selectedSize || (activeOpt && !activeOpt.inStock) || addedSuccess}
            onClick={onAddToCart}
            className={`w-full h-[44px] font-mono tracking-[0.2em] uppercase transition-all duration-200 flex items-center justify-center gap-2 font-semibold ${
              addedSuccess
                ? "bg-emerald-700 text-white"
                : !selectedSize
                ? "bg-black/12 text-black/32 cursor-not-allowed"
                : "bg-black text-white active:scale-[0.99]"
            }`}
            style={{ fontSize: 11 }}
          >
            {addedSuccess ? (
              <>
                <Check className="size-4" />
                <span>ADDED TO BAG</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" />
                <span>{selectedSize ? "ADD TO BAG" : "SELECT A SIZE"}</span>
              </>
            )}
          </button>
        </div>

        {/* ── Size guide overlay ── */}
        <AnimatePresence>
          {showSizeGuide && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: CARD_EASE }}
              className="absolute inset-0 z-40"
            >
              <SizeGuideContent onClose={() => setShowSizeGuide(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ═════════════════ DESKTOP / TABLET MODAL ═══════════════════ */
function DesktopModal({
  product,
  sizeOptions,
  selectedSize,
  loadingSizes,
  addedSuccess,
  isTablet,
  onClose,
  onSelectSize,
  onAddToCart,
}: {
  product: Product;
  sizeOptions: VariantStock[];
  selectedSize: string | null;
  loadingSizes: boolean;
  addedSuccess: boolean;
  isTablet: boolean;
  onClose: () => void;
  onSelectSize: (s: string) => void;
  onAddToCart: () => void;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const activeOpt = sizeOptions.find((o) => o.size === selectedSize);

  const maxW = isTablet ? "560px" : "680px";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick add ${product.name}`}
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative w-full bg-white text-black overflow-hidden z-10 flex flex-row my-auto shadow-2xl"
        style={{ maxWidth: maxW, maxHeight: isTablet ? "82vh" : "88vh" }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 z-30 size-[36px] flex items-center justify-center text-black/60 hover:text-black"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>

        {/* Image column — 48% width */}
        <div
          className="bg-neutral-100 shrink-0 overflow-hidden"
          style={{ width: "48%", aspectRatio: "3/4", maxHeight: isTablet ? "82vh" : "88vh" }}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details column */}
        <div
          className="flex flex-col justify-between bg-white overflow-y-auto"
          style={{ width: "52%", padding: isTablet ? "20px 24px" : "24px 28px" }}
          data-lenis-prevent
        >
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-black/45 uppercase block mb-2">
              {product.category}
            </span>
            <h2 className="font-body font-medium tracking-wide text-black mb-2 capitalize leading-snug"
              style={{ fontSize: isTablet ? "18px" : "20px" }}
            >
              {product.name}
            </h2>
            <div className="flex items-baseline gap-3 mb-5 font-mono tracking-widest text-sm">
              <span>{formatINR(product.price)}</span>
              {product.compareAt && product.compareAt > product.price && (
                <span className="text-black/40 line-through text-xs">{formatINR(product.compareAt)}</span>
              )}
            </div>

            <div className="border-t border-black/10 mb-5" />

            {/* Color swatches */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-5">
                <span className="text-[10px] font-mono tracking-widest text-black/50 uppercase block mb-2">
                  COLOR · {product.colors[0].name}
                </span>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <span
                      key={c.name}
                      title={c.name}
                      className="inline-block size-7 rounded-full border-2 border-black/20 shadow-sm"
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-widest text-black/60 uppercase">
                  SELECT SIZE
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-[11px] font-mono text-black/55 hover:text-black underline underline-offset-4"
                >
                  Size Guide
                </button>
              </div>

              <SizeGrid
                options={sizeOptions}
                selected={selectedSize}
                loading={loadingSizes}
                onSelect={onSelectSize}
              />

              {activeOpt?.inStock && activeOpt.stock > 0 && activeOpt.stock <= 3 && (
                <p className="mt-3 text-[10px] font-mono tracking-widest text-amber-700 uppercase">
                  ONLY {activeOpt.stock} LEFT IN STOCK
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            disabled={!selectedSize || (activeOpt && !activeOpt.inStock) || addedSuccess}
            onClick={onAddToCart}
            className={`w-full py-4 text-xs font-mono tracking-[0.25em] uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
              addedSuccess
                ? "bg-emerald-700 text-white"
                : !selectedSize
                ? "bg-black/18 text-black/38 cursor-not-allowed"
                : "bg-black text-white hover:bg-black/88 active:scale-[0.99]"
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="size-4" />
                <span>ADDED TO BAG</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" />
                <span>{selectedSize ? "ADD TO BAG" : "SELECT SIZE"}</span>
              </>
            )}
          </button>
        </div>

        {/* Size guide overlay */}
        <AnimatePresence>
          {showSizeGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40"
            >
              <SizeGuideContent onClose={() => setShowSizeGuide(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ═══════════════════ PROVIDER ═══════════════════════════════ */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const { add } = useCart();

  /* Breakpoint detection — no SSR flicker */
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  const openQuickAdd = useCallback((p: Product) => {
    setProduct(p);
    setSelectedSize(null);
    setAddedSuccess(false);
    setLoadingSizes(true);
    getVariantStock(p.slug, p.sizes).then((opts) => {
      setSizeOptions(opts);
      const first = opts.find((o) => o.inStock);
      if (first) setSelectedSize(first.size);
      setLoadingSizes(false);
    });
  }, []);

  const closeQuickAdd = useCallback(() => {
    setProduct(null);
    setSelectedSize(null);
    setAddedSuccess(false);
    setSizeOptions([]);
  }, []);

  /* ESC key + body scroll lock */
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeQuickAdd(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, closeQuickAdd]);

  const handleAddToCart = useCallback(() => {
    if (!product || !selectedSize) return;
    const opt = sizeOptions.find((o) => o.size === selectedSize);
    if (!opt || !opt.inStock) return;
    add(product, selectedSize, 1, opt.variantId, opt.stock);
    setAddedSuccess(true);
    setTimeout(() => closeQuickAdd(), 1000);
  }, [product, selectedSize, sizeOptions, add, closeQuickAdd]);

  const sharedProps = {
    product: product!,
    sizeOptions,
    selectedSize,
    loadingSizes,
    addedSuccess,
    onClose: closeQuickAdd,
    onSelectSize: setSelectedSize,
    onAddToCart: handleAddToCart,
  };

  return (
    <QuickAddContext.Provider value={{ openQuickAdd, closeQuickAdd }}>
      {children}

      <AnimatePresence>
        {product && (
          isMobile ? (
            <MobileFloatingCard key="mobile-card" {...sharedProps} />
          ) : (
            <DesktopModal key="desktop-modal" {...sharedProps} isTablet={isTablet} />
          )
        )}
      </AnimatePresence>
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) throw new Error("useQuickAdd must be used within a QuickAddProvider");
  return context;
}
