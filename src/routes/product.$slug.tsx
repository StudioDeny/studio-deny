import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { listProducts, getStoredProduct as getProduct, type Product } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Reviews } from "@/components/product/Reviews";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, Truck, RotateCcw, ShieldCheck, ArrowRight, Zap, X, ZoomIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SizeOption = { size: string; inStock: boolean; variantId?: string; price?: number };

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — STUDIO/DENY` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: `${loaderData.product.name} — STUDIO/DENY` },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [],
  }),
  component: PDP,
  notFoundComponent: () => (
    <div className="px-4 py-32 text-center min-h-[70vh] flex flex-col items-center justify-center">
      <h1 className="text-display text-muted-foreground/30 leading-none" style={{ fontSize: "clamp(60px, 12vw, 160px)" }}>NOT FOUND</h1>
      <p className="text-mono mt-6 text-muted-foreground" style={{ fontSize: "12px", letterSpacing: "0.3em" }}>THIS DROP DOES NOT EXIST</p>
      <Link
        to="/shop"
        className="mt-10 border border-border px-8 py-3 text-mono hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-2"
        style={{ fontSize: "11px", letterSpacing: "0.2em" }}
      >
        BACK TO SHOP <ArrowRight className="size-3.5" />
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="px-4 py-32 text-center min-h-[70vh] flex flex-col items-center justify-center">
      <h1 className="text-display text-muted-foreground/30 leading-none" style={{ fontSize: "clamp(60px, 10vw, 120px)" }}>SOMETHING BROKE</h1>
      <p className="text-mono mt-6 text-muted-foreground" style={{ fontSize: "12px", letterSpacing: "0.2em" }}>{error.message}</p>
      <button
        onClick={reset}
        className="mt-10 border border-border px-8 py-3 text-mono hover:border-primary hover:text-primary transition-colors"
        style={{ fontSize: "11px", letterSpacing: "0.2em" }}
      >
        RETRY
      </button>
    </div>
  ),
});

function PDP() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(product.slug);
  const [size, setSize] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | undefined>();
  const [tab, setTab] = useState<"desc" | "mat" | "ship">("desc");
  const [mainImg, setMainImg] = useState(product.image);
  const [added, setAdded] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [related, setRelated] = useState<Product[]>([]);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    listProducts().then((all) =>
      setRelated(all.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4))
    );
  }, [product.category, product.slug]);

  // Fetch Supabase variants; fall back to product.sizes if none
  useEffect(() => {
    supabase
      .from("product_variants")
      .select("id, size, stock, price, color, color_hex")
      .eq("product_id", product.slug)
      .order("size")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSizeOptions(data.filter((v) => v.size != null).map((v) => ({
            size: v.size as string,
            inStock: v.stock > 0,
            variantId: v.id,
            price: v.price ?? undefined,
          })));
        } else {
          setSizeOptions(product.sizes.map((s: string) => ({ size: s, inStock: true })));
        }
      });
  }, [product.slug]);

  // Reset state on product change
  useEffect(() => {
    setSize(null);
    setVariantId(undefined);
    setMainImg(product.image);
    setTab("desc");
    setAdded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [product.slug]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [sizeOptions]);

  const selectedVariant = sizeOptions.find((o) => o.variantId === variantId);
  const displayPrice = selectedVariant?.price ?? product.price;
  const isOOS = sizeOptions.length > 0
    ? sizeOptions.every((o) => !o.inStock)
    : product.stock === 0;

  const handleAdd = () => {
    if (!size) return;
    add(product, size, 1, variantId);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSizeSelect = (opt: SizeOption) => {
    if (!opt.inStock) return;
    setSize(opt.size);
    setVariantId(opt.variantId);
  };

  return (
    <div className="pb-24">
      {/* Breadcrumbs */}
      <div className="px-4 md:px-8 pt-6 pb-2">
        <nav className="text-mono text-muted-foreground" style={{ fontSize: "10px", letterSpacing: "0.25em" }}>
          <Link to="/" className="hover:text-primary transition-colors">HOME</Link>
          <span className="mx-2 opacity-50">/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">SHOP</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">{product.name.toUpperCase()}</span>
        </nav>
      </div>

      <section className="px-4 md:px-8 mt-4 grid md:grid-cols-[100px_minmax(0,1.2fr)_1fr] lg:grid-cols-[120px_minmax(0,1.5fr)_1fr] gap-6 lg:gap-12">
        {/* Thumbnails (Desktop) */}
        <div className="hidden md:flex flex-col gap-3">
          {[product.image, product.hoverImage].map((src, i) => (
            <button
              key={src}
              onClick={() => setMainImg(src)}
              className={`relative overflow-hidden transition-all duration-300 ${
                mainImg === src ? "ring-1 ring-primary ring-offset-2 ring-offset-background" : "border border-border hover:border-foreground/50 opacity-60 hover:opacity-100"
              }`}
              style={{ aspectRatio: "4/5", background: "var(--color-surface)" }}
            >
              <img src={src} alt={`${product.name} view ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* Main Image */}
        <div
          className="relative group bg-surface border border-border overflow-hidden cursor-zoom-in"
          style={{ aspectRatio: "4/5" }}
          onClick={() => setZoomOpen(true)}
          title="Click to zoom"
        >
          <img
            src={mainImg}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="size-8 bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80">
              <ZoomIn className="size-4" />
            </span>
          </div>
          {product.badge && (
            <span
              className={`absolute top-4 left-4 text-mono font-semibold px-3 py-1.5 shadow-lg ${
                product.badge === "SALE" ? "bg-secondary text-secondary-foreground" :
                product.badge === "LAST PIECE" ? "bg-primary text-primary-foreground glow-primary-sm" :
                product.badge === "SOLD OUT" ? "bg-muted text-muted-foreground" :
                "bg-primary text-primary-foreground"
              }`}
              style={{ fontSize: "10px", letterSpacing: "0.25em" }}
            >
              {product.badge}
            </span>
          )}
          {/* Mobile Thumbnails Overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 md:hidden z-10 px-4">
            {[product.image, product.hoverImage].map((src) => (
              <button
                key={src}
                onClick={() => setMainImg(src)}
                className={`h-1 transition-all duration-300 ${mainImg === src ? "w-8 bg-primary glow-primary-sm" : "w-4 bg-white/40"}`}
                aria-label="Change image"
              />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="md:sticky md:top-24 md:self-start flex flex-col">
          <div className="text-mono text-primary flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
            <span className="size-1 bg-primary rounded-full pulse-dot" />
            {product.category.toUpperCase()}
          </div>
          
          <h1 className="text-display mt-3 leading-[0.9]" style={{ fontSize: "clamp(42px, 6vw, 72px)" }}>
            {product.name}
          </h1>

          <div className="mt-5 flex items-baseline gap-4 text-mono">
            <span className="text-foreground" style={{ fontSize: "28px" }}>{formatINR(displayPrice)}</span>
            {product.compareAt && (
              <>
                <span className="text-muted-foreground line-through" style={{ fontSize: "16px" }}>{formatINR(product.compareAt)}</span>
                <span className="text-secondary font-bold px-2 py-0.5 border border-secondary/30 bg-secondary/10" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
                  SAVE {Math.round(((product.compareAt - displayPrice) / product.compareAt) * 100)}%
                </span>
              </>
            )}
          </div>

          <p className="mt-6 text-muted-foreground leading-relaxed" style={{ fontSize: "14px" }}>
            {product.description}
          </p>

          {/* Color Selection */}
          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>
                COLOR <span className="mx-2">·</span> <span className="text-foreground">{product.colors[0].name.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              {product.colors.map((c: { name: string; hex: string }) => (
                <button
                  key={c.name}
                  className="size-10 rounded-full border-2 ring-offset-2 ring-offset-background transition-all hover:scale-110 border-border ring-1 ring-foreground/20 shadow-sm"
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Select color ${c.name}`}
                />
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>SIZE</div>
              <Link to="/size-guide" className="text-mono text-primary hover:underline flex items-center gap-1" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
                SIZE GUIDE <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-2.5">
              {(sizeOptions.length > 0 ? sizeOptions : product.sizes.map((s: string) => ({ size: s, inStock: true }))).map((opt: SizeOption) => (
                <button
                  key={opt.size}
                  onClick={() => handleSizeSelect(opt)}
                  disabled={!opt.inStock}
                  className={`h-12 border text-mono transition-all duration-200 flex items-center justify-center relative ${
                    size === opt.size
                      ? "bg-foreground text-background border-foreground font-bold shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                      : opt.inStock
                      ? "border-border text-muted-foreground hover:border-primary hover:text-primary bg-surface/50"
                      : "border-border/30 text-muted-foreground/30 bg-surface/20 cursor-not-allowed line-through"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {opt.size}
                </button>
              ))}
            </div>

            {/* Stock Warning */}
            <div className="mt-4 min-h-[20px]">
              {isOOS ? (
                <div className="text-mono text-muted-foreground flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
                  SOLD OUT — CHECK BACK SOON
                </div>
              ) : sizeOptions.filter((o) => o.inStock).length <= 2 && sizeOptions.length > 0 ? (
                <div className="text-mono text-secondary flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
                  <Zap className="size-3.5" /> ALMOST GONE — LIMITED SIZES LEFT
                </div>
              ) : product.stock <= 5 && sizeOptions.length === 0 ? (
                <div className="text-mono text-secondary flex items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
                  <Zap className="size-3.5" /> ONLY {product.stock} LEFT IN STOCK
                </div>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              ref={ctaRef}
              onClick={handleAdd}
              disabled={!size || isOOS}
              className={`flex-1 font-bold text-mono transition-all duration-300 flex items-center justify-center gap-3 ${
                added
                  ? "bg-secondary text-secondary-foreground glow-lime"
                  : size
                  ? "bg-primary text-primary-foreground hover:glow-primary border-shimmer"
                  : "bg-surface border border-border text-muted-foreground"
              }`}
              style={{
                height: "60px",
                fontSize: "12px",
                letterSpacing: "0.25em",
                opacity: isOOS ? 0.5 : 1,
                cursor: isOOS || (!size && !added) ? "not-allowed" : "pointer"
              }}
            >
              {isOOS ? "SOLD OUT" : added ? "✓ ADDED TO BAG" : size ? "ADD TO BAG" : "SELECT SIZE"}
              {size && !added && !isOOS && <ArrowRight className="size-4" />}
            </button>
            
            <button
              aria-label="Wishlist"
              onClick={() => toggle(product.slug)}
              className={`border w-[60px] flex items-center justify-center transition-all duration-300 ${
                wished ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <Heart className={`size-5 ${wished ? "fill-primary" : ""}`} />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, t: "FREE SHIP ₹999+" },
              { icon: RotateCcw, t: "7-DAY RETURNS" },
              { icon: ShieldCheck, t: "SECURE PAY" }
            ].map((b) => (
              <div key={b.t} className="border border-border/50 bg-surface/30 p-3 md:p-4 flex flex-col items-center justify-center text-center gap-2">
                <b.icon className="size-4 md:size-5 text-primary" />
                <span className="text-mono text-muted-foreground" style={{ fontSize: "9px", letterSpacing: "0.15em", lineHeight: 1.2 }}>{b.t}</span>
              </div>
            ))}
          </div>

          {/* Accordion Tabs */}
          <div className="mt-10 border-t border-border">
            {[
              { id: "desc", label: "DESCRIPTION", content: product.description },
              { id: "mat", label: "MATERIAL & CARE", content: product.material + " Wash cold inside out. Hang dry. Don't iron the print. Built to fade naturally over time." },
              { id: "ship", label: "SHIPPING & RETURNS", content: "Dispatched within 48 hours. Free shipping on orders ₹999+. International shipping available. 7-day hassle-free returns." },
            ].map((t) => (
              <div key={t.id} className="border-b border-border group">
                <button
                  onClick={() => setTab(tab === t.id ? ("" as any) : t.id)}
                  className="w-full py-5 flex items-center justify-between text-mono text-foreground hover:text-primary transition-colors"
                  style={{ fontSize: "11px", letterSpacing: "0.2em" }}
                >
                  {t.label}
                  <span className="text-xl leading-none">{tab === t.id ? "−" : "+"}</span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    tab === t.id ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "13.5px" }}>
                    {t.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <div className="mt-16 md:mt-24 border-t border-border pt-16">
        <Reviews slug={product.slug} />
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="px-4 md:px-8 mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-mono text-primary mb-2" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>◢ MORE LIKE THIS</div>
              <h2 className="text-display leading-none" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>YOU MIGHT ALSO RUN</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {related.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Mobile sticky add-to-cart (shows when CTA scrolls out of view) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 transition-all duration-300 ${
          ctaVisible ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center gap-3 max-w-screen-sm mx-auto">
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-1.5 min-w-max pb-0.5">
              {(sizeOptions.length > 0 ? sizeOptions : product.sizes.map((s: string) => ({ size: s, inStock: true }))).map((opt: SizeOption) => (
                <button
                  key={opt.size}
                  onClick={() => handleSizeSelect(opt)}
                  disabled={!opt.inStock}
                  className={`h-10 min-w-[44px] px-2 border text-mono transition-all duration-150 ${
                    size === opt.size
                      ? "bg-foreground text-background border-foreground"
                      : opt.inStock
                      ? "border-border text-muted-foreground hover:border-primary hover:text-primary bg-surface/50"
                      : "border-border/30 text-muted-foreground/30 bg-surface/20 cursor-not-allowed"
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  {opt.size}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!size || isOOS}
            className={`h-10 px-5 font-bold text-mono whitespace-nowrap transition-all duration-300 shrink-0 ${
              added
                ? "bg-secondary text-secondary-foreground"
                : size
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border text-muted-foreground"
            }`}
            style={{ fontSize: "11px", letterSpacing: "0.2em", opacity: isOOS ? 0.5 : 1 }}
          >
            {isOOS ? "SOLD OUT" : added ? "✓ ADDED" : "ADD TO BAG"}
          </button>
        </div>
      </div>

      {/* Image zoom lightbox */}
      {zoomOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 animate-in fade-in duration-200"
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute top-5 right-5 size-10 border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 transition-colors"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom"
          >
            <X className="size-5" />
          </button>
          <img
            src={mainImg}
            alt={product.name}
            className="max-w-[90vw] max-h-[90vh] object-contain animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
