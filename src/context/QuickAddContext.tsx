import { createContext, useContext, useState, useEffect } from "react";
import type { Product, VariantStock } from "@/lib/productsStore";
import { getVariantStock } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShoppingBag, Ruler } from "lucide-react";

type QuickAddContextType = {
  openQuickAdd: (product: Product) => void;
  closeQuickAdd: () => void;
};

const QuickAddContext = createContext<QuickAddContextType | undefined>(undefined);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [sizeOptions, setSizeOptions] = useState<VariantStock[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [loadingSizes, setLoadingSizes] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);

  const { add } = useCart();

  const openQuickAdd = (p: Product) => {
    setProduct(p);
    setSelectedSize(null);
    setAddedSuccess(false);
    setShowSizeGuide(false);
    setLoadingSizes(true);

    getVariantStock(p.slug, p.sizes).then((opts) => {
      setSizeOptions(opts);
      const firstAvailable = opts.find((o) => o.inStock);
      if (firstAvailable) {
        setSelectedSize(firstAvailable.size);
      }
      setLoadingSizes(false);
    });
  };

  const closeQuickAdd = () => {
    setProduct(null);
    setSelectedSize(null);
    setAddedSuccess(false);
    setShowSizeGuide(false);
  };

  // Keyboard Escape listener & Body scroll lock
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickAdd();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product]);

  const handleAddToCart = () => {
    if (!product || !selectedSize) return;
    const opt = sizeOptions.find((o) => o.size === selectedSize);
    if (!opt || !opt.inStock) return;

    add(product, selectedSize, 1, opt.variantId, opt.stock);
    setAddedSuccess(true);

    setTimeout(() => {
      closeQuickAdd();
    }, 1000);
  };

  const activeOpt = sizeOptions.find((o) => o.size === selectedSize);

  return (
    <QuickAddContext.Provider value={{ openQuickAdd, closeQuickAdd }}>
      {children}

      <AnimatePresence>
        {product && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            {/* Subtle Translucent Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeQuickAdd}
            />

            {/* Editorial Quick Add Container (Compact Zara / COS / SSENSE aesthetic) */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Quick add ${product.name}`}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative w-full max-w-[680px] bg-white text-black overflow-hidden z-10 max-h-[85vh] flex flex-col md:flex-row my-auto rounded-none border-0 shadow-xl"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={closeQuickAdd}
                aria-label="Close modal"
                className="absolute top-3 right-3 z-30 p-2 text-black/60 hover:text-black transition-colors"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>

              {/* Left Column: Compact Editorial Image (50% Desktop Width) */}
              <div className="w-full md:w-[50%] bg-neutral-100 shrink-0 relative aspect-[3/4] md:aspect-auto">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Right Column: Minimal Details (50% Width) */}
              <div className="w-full md:w-[50%] p-5 sm:p-7 flex flex-col justify-between bg-white">
                <div>
                  {/* Category Label */}
                  <span className="text-[10px] font-mono tracking-[0.25em] text-black/50 uppercase block mb-2">
                    {product.category}
                  </span>

                  {/* Product Title */}
                  <h2 className="text-lg sm:text-xl font-body font-medium tracking-wide text-black mb-2 capitalize">
                    {product.name}
                  </h2>

                  {/* Price */}
                  <div className="text-sm font-mono tracking-widest text-black/80 mb-6">
                    {formatINR(product.price)}
                  </div>

                  <div className="border-t border-black/10 my-6" />

                  {/* Size Selector + Size Guide */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono tracking-widest text-black/70 uppercase">
                        SELECT SIZE
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSizeGuide(true)}
                        className="text-[11px] font-mono text-black/60 hover:text-black transition-colors underline underline-offset-4"
                      >
                        Size Guide
                      </button>
                    </div>

                    {loadingSizes ? (
                      <div className="flex gap-3 py-2 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-9 w-10 bg-black/5" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((opt) => {
                          const isSelected = selectedSize === opt.size;
                          return (
                            <button
                              key={opt.variantId ?? opt.size}
                              disabled={!opt.inStock}
                              type="button"
                              onClick={() => setSelectedSize(opt.size)}
                              className={`h-10 min-w-[42px] px-3 font-mono text-xs tracking-wider transition-all duration-180 flex items-center justify-center ${
                                !opt.inStock
                                  ? "text-black/30 line-through cursor-not-allowed border border-black/5 bg-neutral-50"
                                  : isSelected
                                  ? "bg-black text-white font-semibold"
                                  : "border border-black/15 text-black hover:border-black font-normal"
                              }`}
                            >
                              {opt.size}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Low Stock Warning (Only shown if stock <= 3) */}
                    {activeOpt && activeOpt.inStock && activeOpt.stock > 0 && activeOpt.stock <= 3 && (
                      <p className="mt-3 text-[10px] font-mono tracking-widest text-amber-700 uppercase">
                        ONLY {activeOpt.stock} LEFT IN STOCK
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary CTA: "Add to Bag" */}
                <div>
                  <button
                    type="button"
                    disabled={!selectedSize || (activeOpt && !activeOpt.inStock) || addedSuccess}
                    onClick={handleAddToCart}
                    className={`w-full py-4 text-xs font-mono tracking-[0.25em] uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                      addedSuccess
                        ? "bg-emerald-700 text-white"
                        : !selectedSize
                        ? "bg-black/20 text-black/40 cursor-not-allowed"
                        : "bg-black text-white hover:bg-black/90 active:scale-[0.99]"
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
              </div>

              {/* Minimal Size Guide Modal Overlay */}
              <AnimatePresence>
                {showSizeGuide && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40 bg-white text-black p-8 flex flex-col justify-between overflow-y-auto"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6 border-b border-black/10 pb-4">
                        <h3 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold flex items-center gap-2">
                          <Ruler className="size-4" />
                          <span>SIZE GUIDE</span>
                        </h3>
                        <button type="button" onClick={() => setShowSizeGuide(false)} className="text-black/60 hover:text-black">
                          <X className="size-5" />
                        </button>
                      </div>

                      <table className="w-full text-xs font-mono border-collapse mb-6">
                        <thead>
                          <tr className="border-b border-black/10 text-left text-black/60">
                            <th className="py-2">SIZE</th>
                            <th className="py-2">CHEST</th>
                            <th className="py-2">WAIST</th>
                            <th className="py-2">LENGTH</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-black/5">
                            <td className="py-2.5 font-semibold">XS</td>
                            <td className="py-2.5">34–36"</td>
                            <td className="py-2.5">28–30"</td>
                            <td className="py-2.5">27"</td>
                          </tr>
                          <tr className="border-b border-black/5">
                            <td className="py-2.5 font-semibold">S</td>
                            <td className="py-2.5">36–38"</td>
                            <td className="py-2.5">30–32"</td>
                            <td className="py-2.5">28"</td>
                          </tr>
                          <tr className="border-b border-black/5">
                            <td className="py-2.5 font-semibold">M</td>
                            <td className="py-2.5">38–40"</td>
                            <td className="py-2.5">32–34"</td>
                            <td className="py-2.5">29"</td>
                          </tr>
                          <tr className="border-b border-black/5">
                            <td className="py-2.5 font-semibold">L</td>
                            <td className="py-2.5">40–42"</td>
                            <td className="py-2.5">34–36"</td>
                            <td className="py-2.5">30"</td>
                          </tr>
                          <tr className="border-b border-black/5">
                            <td className="py-2.5 font-semibold">XL</td>
                            <td className="py-2.5">42–44"</td>
                            <td className="py-2.5">36–38"</td>
                            <td className="py-2.5">31"</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[11px] text-black/50 font-mono italic">
                        * Standard luxury relaxed fit. Select your normal size.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSizeGuide(false)}
                      className="w-full py-3 bg-black text-white font-mono text-xs tracking-widest uppercase font-semibold mt-6"
                    >
                      CLOSE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) {
    throw new Error("useQuickAdd must be used within a QuickAddProvider");
  }
  return context;
}
