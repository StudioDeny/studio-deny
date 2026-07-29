import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { buildMeta, buildLinks, SITE_URL, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { useState, useEffect, useRef } from "react";
import { listProducts, getStoredProduct as getProduct, type Product, type GalleryItem } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Reviews } from "@/components/product/Reviews";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, Truck, RotateCcw, ShieldCheck, ArrowRight, Zap, Share2, Minus, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type SizeOption = { size: string; inStock: boolean; variantId?: string; price?: number };
type VariantRow = { id: string; size: string | null; stock: number; price: number | null; color: string | null; color_hex: string | null };

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const p = loaderData.product;
    const url = `${SITE_URL}/product/${p.slug}`;
    return {
      meta: buildMeta({
        title: `${p.name} — STUDIO DENY`,
        description: p.description,
        image: p.image,
        url,
        type: "product",
      }),
      links: buildLinks(url),
      scripts: [
        { type: "application/ld+json", children: productJsonLd({ ...p, stock: p.stock, compare_at: p.compareAt }) },
        {
          type: "application/ld+json",
          children: breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Shop", url: `${SITE_URL}/shop` },
            { name: p.name, url },
          ]),
        },
      ],
    };
  },
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
  const [tab, setTab] = useState<"desc" | "mat" | "care" | "delivery" | "">("desc");
  const [added, setAdded] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [shared, setShared] = useState(false);

  // Full gallery, in order: base image, hover image, then any extra gallery photos —
  // deduped, and grouped into rows honoring each gallery item's layout: "standalone"
  // renders full-width, consecutive "half" items pair up side-by-side (H&M-style).
  type GalleryRow = { type: "standalone"; src: string } | { type: "half"; srcs: string[] };
  const galleryRows: GalleryRow[] = (() => {
    const seen = new Set<string>();
    const rows: GalleryRow[] = [];
    const pushStandalone = (src: string) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      rows.push({ type: "standalone", src });
    };
    pushStandalone(product.image);
    pushStandalone(product.hoverImage);

    const gallery = (product.gallery ?? []).filter((g: GalleryItem) => g.url && !seen.has(g.url));
    let i = 0;
    while (i < gallery.length) {
      const item = gallery[i];
      seen.add(item.url);
      if (item.layout === "half") {
        const next = gallery[i + 1];
        if (next && next.layout === "half" && !seen.has(next.url)) {
          seen.add(next.url);
          rows.push({ type: "half", srcs: [item.url, next.url] });
          i += 2;
          continue;
        }
        rows.push({ type: "half", srcs: [item.url] });
        i += 1;
        continue;
      }
      rows.push({ type: "standalone", src: item.url });
      i += 1;
    }
    return rows;
  })();
  const [ctaVisible, setCtaVisible] = useState(true);
  const [related, setRelated] = useState<Product[]>([]);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    listProducts().then((all) => {
      const others = all.filter((p) => p.slug !== product.slug);
      const sameCategory = others.filter((p) => p.category === product.category);
      // Fall back to other live products when this one has no category
      // siblings yet, so the section is never blank.
      const filled = sameCategory.length >= 4 ? sameCategory : [...sameCategory, ...others.filter((p) => !sameCategory.includes(p))];
      setRelated(filled.slice(0, 4));
    });
  }, [product.category, product.slug]);

  // Fetch Supabase variants; fall back to product.sizes if none
  useEffect(() => {
    supabase
      .from("product_variants")
      .select("id, size, stock, price, color, color_hex")
      .eq("product_id", product.slug)
      .order("size")
      .then(({ data }) => setVariants(data ?? []));
  }, [product.slug]);

  // Colors come from variants (if any admin-set colors exist) — falls back to the
  // product's own color list for products with no per-variant color tracking.
  // Keyed by color_hex (not name): admins can reuse the same color name across
  // variant rows while picking a different swatch per row (e.g. quick-adding
  // colors without renaming each one), so keying by name alone was silently
  // collapsing distinct colors down to whichever row was seen last.
  const colorOptions: { key: string; name: string; hex: string }[] = (() => {
    const seen = new Map<string, { name: string; hex: string }>();
    variants.forEach((v) => {
      if (!v.color) return;
      const hex = v.color_hex ?? "#0a0a0a";
      if (!seen.has(hex)) seen.set(hex, { name: v.color, hex });
    });
    const fromVariants = [...seen.entries()].map(([key, v]) => ({ key, ...v }));
    return fromVariants.length > 0 ? fromVariants : product.colors.map((c: { name: string; hex: string }) => ({ key: c.hex, ...c }));
  })();

  // Sizes are scoped to the selected color when variants carry color data, so
  // switching color never shows the same size duplicated once per color.
  const sizeOptions: SizeOption[] = (() => {
    if (variants.length === 0) return product.sizes.map((s: string) => ({ size: s, inStock: true }));
    const hasColorData = variants.some((v) => v.color);
    const scoped = hasColorData && selectedColor
      ? variants.filter((v) => (v.color_hex ?? "#0a0a0a") === selectedColor)
      : variants;
    return scoped.filter((v) => v.size != null).map((v) => ({
      size: v.size as string,
      inStock: v.stock > 0,
      variantId: v.id,
      price: v.price ?? undefined,
    }));
  })();

  // Reset state on product change
  useEffect(() => {
    setSize(null);
    setVariantId(undefined);
    setSelectedColor(null);
    setTab("desc");
    setAdded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [product.slug]);

  // Default to the first available color — re-syncs whenever the actual set of
  // colors changes (e.g. once the real variant colors arrive after the
  // product's own placeholder color list was used for the first paint), not
  // just once on mount, so the swatch and the "COLOR · X" label never go stale.
  const colorKey = colorOptions.map((c) => c.key).join("|");
  useEffect(() => {
    setSelectedColor((colorOptions.find((c) => c.key === selectedColor) ?? colorOptions[0])?.key ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey]);

  // Switching color invalidates the previously selected size (it belonged to a
  // different color's variant row).
  const isFirstColorRun = useRef(true);
  useEffect(() => {
    if (isFirstColorRun.current) { isFirstColorRun.current = false; return; }
    setSize(null);
    setVariantId(undefined);
  }, [selectedColor]);

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
  const maxQty = Math.max(1, variantId ? (variants.find((v) => v.id === variantId)?.stock ?? 1) : product.stock);

  // Qty can never end up above what's actually available for the currently
  // selected size/variant — reclamp whenever that selection changes.
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxQty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, size, maxQty]);

  const handleAdd = () => {
    if (!size) return;
    add(product, size, qty, variantId, maxQty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast.error("Couldn't copy link — copy it from the address bar instead.");
    }
  };

  const handleSizeSelect = (opt: SizeOption) => {
    if (!opt.inStock) return;
    setSize(opt.size);
    setVariantId(opt.variantId);
  };

  const renderGalleryTile = (src: string, index: number) => {
    const isFirst = index === 0;
    return (
      <div
        key={src}
        className="relative group bg-surface overflow-hidden"
        style={{ aspectRatio: "4/5" }}
      >
        <img
          src={src}
          alt={`${product.name} view ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading={isFirst ? undefined : "lazy"}
        />
        {isFirst && product.badge && (
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
      </div>
    );
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

      <section className="px-4 md:px-8 mt-4 grid md:grid-cols-[1.3fr_1fr] lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-12">
        {/* Image gallery — a continuous stack of every photo, scrolled past naturally
            (H&M-style, no gaps between frames) while the info panel stays pinned below. */}
        <div className="flex flex-col">
          {(() => {
            let imgIndex = -1;
            return galleryRows.map((row, rowIdx) => {
              if (row.type === "standalone") {
                imgIndex += 1;
                return renderGalleryTile(row.src, imgIndex);
              }
              return (
                <div key={`half-${rowIdx}`} className="grid grid-cols-2">
                  {row.srcs.map((src) => {
                    imgIndex += 1;
                    return renderGalleryTile(src, imgIndex);
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* Product Info — pinned via sticky, and independently scrollable so a wheel
            scroll with the cursor over this panel never drags the gallery underneath. */}
        <div className="md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto no-scrollbar flex flex-col">
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
          {colorOptions.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>
                  COLOR <span className="mx-2">·</span> <span className="text-foreground">{(colorOptions.find((c) => c.key === selectedColor) ?? colorOptions[0]).name.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                {colorOptions.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedColor(c.key)}
                    aria-pressed={selectedColor === c.key}
                    className={`size-10 rounded-full border-2 ring-offset-2 ring-offset-background transition-all hover:scale-110 shadow-sm ${
                      selectedColor === c.key ? "border-primary ring-2 ring-primary" : "border-border ring-1 ring-foreground/20"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Select color ${c.name}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-mono text-muted-foreground" style={{ fontSize: "11px", letterSpacing: "0.25em" }}>SIZE</div>
              <Link to="/size-guide" className="text-mono text-primary hover:underline flex items-center gap-1" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>
                SIZE GUIDE <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-2.5">
              {sizeOptions.map((opt: SizeOption) => {
                const isSelected = opt.variantId ? opt.variantId === variantId : size === opt.size;
                return (
                  <button
                    key={opt.variantId ?? opt.size}
                    onClick={() => handleSizeSelect(opt)}
                    disabled={!opt.inStock}
                    className={`h-12 border text-mono transition-all duration-200 flex items-center justify-center relative ${
                      isSelected
                        ? "bg-foreground text-background border-foreground font-bold shadow-[0_0_15px_rgba(128,128,128,0.2)]"
                        : opt.inStock
                        ? "border-border text-muted-foreground hover:border-primary hover:text-primary bg-surface/50"
                        : "border-border/30 text-muted-foreground/30 bg-surface/20 cursor-not-allowed line-through"
                    }`}
                    style={{ fontSize: "13px" }}
                  >
                    {opt.size}
                  </button>
                );
              })}
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
            <div className="flex items-center border border-border bg-surface h-[60px] shrink-0">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="h-full px-3 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-mono text-center w-6" style={{ fontSize: "13px" }}>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="h-full px-3 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

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

            <button
              aria-label="Share product"
              onClick={handleShare}
              className={`border w-[60px] flex items-center justify-center transition-all duration-300 ${
                shared ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <Share2 className="size-5" />
            </button>
          </div>
          {shared && (
            <p className="mt-2 text-mono text-primary" style={{ fontSize: "10px", letterSpacing: "0.15em" }}>
              LINK COPIED
            </p>
          )}

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
              {
                id: "desc" as const,
                label: "DESCRIPTION & FIT",
                content: product.description,
                link: { to: "/size-guide" as const, label: "See our Size Guide" },
              },
              {
                id: "mat" as const,
                label: "MATERIALS",
                content: product.material || "100% heavyweight cotton, 300 GSM.",
              },
              {
                id: "care" as const,
                label: "CARE GUIDE",
                content: product.materialCare || "Machine wash cold inside out. Hang dry. Do not bleach. Do not tumble dry. Do not iron directly over prints.",
              },
              {
                id: "delivery" as const,
                label: "DELIVERY AND PAYMENT",
                content: "Dispatched within 48 hours. Free shipping on orders ₹999+. Cash on Delivery and Razorpay both accepted at checkout.",
                link: { to: "/track-order" as const, label: "Track your order" },
              },
            ].map((t) => (
              <div key={t.id} className="border-b border-border group">
                <button
                  onClick={() => setTab(tab === t.id ? "" : t.id)}
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
                  {t.link && (
                    <Link
                      to={t.link.to}
                      className="inline-block mt-2 text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                      style={{ fontSize: "12.5px" }}
                    >
                      {t.link.label} →
                    </Link>
                  )}
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
              {sizeOptions.map((opt: SizeOption) => {
                const isSelected = opt.variantId ? opt.variantId === variantId : size === opt.size;
                return (
                  <button
                    key={opt.variantId ?? opt.size}
                    onClick={() => handleSizeSelect(opt)}
                    disabled={!opt.inStock}
                    className={`h-10 min-w-[44px] px-2 border text-mono transition-all duration-150 ${
                      isSelected
                        ? "bg-foreground text-background border-foreground"
                        : opt.inStock
                        ? "border-border text-muted-foreground hover:border-primary hover:text-primary bg-surface/50"
                        : "border-border/30 text-muted-foreground/30 bg-surface/20 cursor-not-allowed"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    {opt.size}
                  </button>
                );
              })}
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
    </div>
  );
}
