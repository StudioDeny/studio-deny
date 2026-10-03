import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { upsertProduct, type Product, type GalleryItem } from "@/lib/productsStore";
import { listCategories, listBrands, listProductCategoryIds, setProductCategories, type Category, type Brand } from "@/lib/catalog";
import { listSizesForCategory, type Size } from "@/lib/sizes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { MultiCategoryPicker } from "@/components/admin/MultiCategoryPicker";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { StockModeEditor } from "@/components/admin/StockModeEditor";
import { singleItemVariant, ONE_SIZE } from "@/lib/singleItem";
import {
  cardsFromVariants, colorsFromCards, describeSaveResult, listVariantRows, planSingleSave, validateSingleQty, planStockSave, saveStockPlan,
  validateCards, type ColourCard, type VariantRow,
} from "@/lib/stockEditor";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const nav = useNavigate();
  return (
    <ProductForm
      onSave={upsertProduct}
      onSaved={() => {
        toast.success("Product created");
        nav({ to: "/admin/products" });
      }}
    />
  );
}

export function ProductForm({
  initial,
  onSave,
  onSaved,
}: {
  initial?: Product;
  // Persists the product row; stock rows are saved by the form afterwards.
  onSave: (p: Product) => Promise<void>;
  onSaved: () => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const refresh = () => {
      listCategories().then(setCats);
      listBrands().then(setBrands);
    };
    refresh();
    // Re-read on window focus so categories/brands added in Catalog tab appear immediately
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const [p, setP] = useState<Product>(
    initial ?? {
      slug: "",
      name: "",
      category: "",
      brand: undefined,
      price: 0,
      image: "",
      hoverImage: "",
      gallery: [],
      sizes: [],
      colors: [],
      description: "",
      material: "",
      materialCare: "",
      stock: 0,
    }
  );
  const [saving, setSaving] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryId ? [initial.categoryId] : []);
  const [galleryMedia, setGalleryMedia] = useState<MediaValue>({ url: "", type: "image" });
  const [sizesForCategory, setSizesForCategory] = useState<Size[]>([]);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [cards, setCards] = useState<ColourCard[]>(() =>
    cardsFromVariants([], initial?.colors ?? [], initial?.price ?? 0, initial?.compareAt),
  );
  const [stockLoading, setStockLoading] = useState(!!initial);
  // Single item = one quantity, no colours or sizes (one ONE SIZE row).
  const [single, setSingle] = useState(false);
  const [singleQty, setSingleQty] = useState("");

  useEffect(() => {
    if (!p.categoryId) { setSizesForCategory([]); return; }
    listSizesForCategory(p.categoryId).then(setSizesForCategory);
  }, [p.categoryId]);

  // Full category membership lives in product_categories, separate from
  // the product row itself — load it once we know which product we're editing.
  useEffect(() => {
    if (!initial?.slug) return;
    listProductCategoryIds(initial.slug).then((ids) => {
      if (ids.length > 0) setCategoryIds(ids);
    });
  }, [initial?.slug]);

  // Default a brand-new product to the first real brand once brands finish
  // loading — can't do this synchronously anymore since listBrands() is an
  // async Supabase call, not a localStorage read.
  useEffect(() => {
    if (!initial && !p.brand && brands.length > 0) {
      setP((prev) => ({ ...prev, brand: brands[0].name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands]);

  const loadStock = async (slug: string, colors: Product["colors"], price: number, compareAt?: number) => {
    setStockLoading(true);
    try {
      const r = await listVariantRows(slug);
      setRows(r);
      const one = singleItemVariant(r);
      setSingle(!!one);
      setSingleQty(one ? String(one.stock) : "");
      setCards(cardsFromVariants(one ? r.filter((x) => x !== one) : r, colors, price, compareAt));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load stock");
    } finally {
      setStockLoading(false);
    }
  };
  useEffect(() => {
    if (initial) loadStock(initial.slug, initial.colors, initial.price, initial.compareAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.slug]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP({ ...p, [k]: v });
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const addGalleryItem = () => {
    if (!galleryMedia.url.trim()) return toast.error("Add an image/video URL, or upload one, first");
    if ((p.gallery ?? []).length >= 8) return toast.error("Gallery is full (8 max)");
    const items: GalleryItem[] = [...(p.gallery ?? []), { url: galleryMedia.url, layout: "standalone", type: galleryMedia.type }];
    set("gallery", items);
    setGalleryMedia({ url: "", type: "image" });
  };

  const removeGalleryImage = (idx: number) => {
    set("gallery", (p.gallery ?? []).filter((_, i) => i !== idx));
  };

  const setGalleryLayout = (idx: number, layout: GalleryItem["layout"]) => {
    set("gallery", (p.gallery ?? []).map((item, i) => (i === idx ? { ...item, layout } : item)));
  };

  const setGalleryType = (idx: number, type: "image" | "video") => {
    set("gallery", (p.gallery ?? []).map((item, i) => (i === idx ? { ...item, type } : item)));
  };

  const moveGalleryImage = (idx: number, dir: -1 | 1) => {
    const list = p.gallery ?? [];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    set("gallery", next);
  };

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/products"
        className="text-mono text-[11px] tracking-widest text-muted-foreground hover:text-primary"
      >
        ← BACK
      </Link>
      <h1 className="text-display text-4xl md:text-5xl mt-3 mb-6">
        {initial ? "EDIT" : "NEW"} PRODUCT.
      </h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const final: Product = { ...p, slug: p.slug || slugify(p.name) };
          if (!final.name) return toast.error("Name required");
          if (!final.slug) return toast.error("Slug required");
          if (!final.image) return toast.error("Product image required");
          if (!final.categoryId) return toast.error("Select a category first — its sizes are used for stock");
          const problem = single ? validateSingleQty(singleQty) : validateCards(cards, final.is_active ?? true);
          if (problem) return toast.error(problem);
          setSaving(true);
          try {
            if (!initial) {
              const { data: clash } = await supabase.from("products").select("slug").eq("slug", final.slug).maybeSingle();
              if (clash) {
                toast.error(`A product with the slug "${final.slug}" already exists — change the name or slug`);
                return;
              }
            }
            const plan = single
              ? planSingleSave(rows, Number(singleQty), final.price, final.compareAt)
              : planStockSave(rows, cards, final.price, final.compareAt);
            final.colors = single ? [] : colorsFromCards(cards);
            final.sizes = single ? [ONE_SIZE] : [...new Set(cards.flatMap((c) => Object.keys(c.sizes)))];
            final.stock = single
              ? Number(singleQty)
              : cards.reduce((sum, c) => sum + Object.values(c.sizes).reduce((t, q) => t + Number(q), 0), 0);
            await onSave(final);
            await setProductCategories(final.slug, categoryIds.length > 0 ? categoryIds : final.categoryId ? [final.categoryId] : []);
            const result = await saveStockPlan(final.slug, plan);
            const note = describeSaveResult(result);
            if (note) {
              toast.warning(note, { duration: 10000 });
              if (initial) {
                await loadStock(final.slug, final.colors, final.price, final.compareAt);
                return;
              }
            }
            onSaved();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
          } finally {
            setSaving(false);
          }
        }}
        className="space-y-4"
      >
        <Field label="NAME">
          <input
            value={p.name}
            onChange={(e) => set("name", e.target.value)}
            className="inp"
          />
        </Field>
        <Field label="SLUG (auto from name if empty)">
          <input
            value={p.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            disabled={!!initial}
            className="inp"
            placeholder={slugify(p.name)}
          />
        </Field>

        <Field label="CATEGORIES (search to add, star = primary)">
          <MultiCategoryPicker
            categories={cats}
            selectedIds={categoryIds}
            primaryId={p.categoryId}
            onChange={(ids, primaryId) => {
              setCategoryIds(ids);
              const primary = cats.find((c) => c.id === primaryId);
              setP({ ...p, categoryId: primaryId, category: primary?.name ?? "" });
            }}
            onCategoriesChange={setCats}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="BRAND">
            <select
              value={p.brand ?? ""}
              onChange={(e) => set("brand", e.target.value || undefined)}
              className="inp"
            >
              <option value="">— NONE —</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="BADGE">
            <select
              value={p.badge ?? ""}
              onChange={(e) =>
                set("badge", (e.target.value || undefined) as Product["badge"])
              }
              className="inp"
            >
              <option value="">— NONE —</option>
              <option>NEW DROP</option>
              <option>LAST PIECE</option>
              <option>SALE</option>
              <option>SOLD OUT</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={p.isBestSeller ?? false}
            onChange={(e) => set("isBestSeller", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-foreground">Best Seller</span>
          <span className="text-mono text-[10px] text-muted-foreground">— shows a "Best Seller" badge on this product's card everywhere</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={p.storeExclusive ?? false}
            onChange={(e) => set("storeExclusive", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-foreground">Exclusive to physical store (hidden from website)</span>
          <span className="text-mono text-[10px] text-muted-foreground">— never visible or purchasable on studiodeny.com, including via a direct link; still fully visible in the POS app</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="PRICE (₹)">
            <input
              type="number"
              value={p.price}
              onChange={(e) => set("price", Number(e.target.value))}
              className="inp"
            />
          </Field>
          <Field label="COMPARE AT">
            <input
              type="number"
              value={p.compareAt ?? 0}
              onChange={(e) =>
                set("compareAt", Number(e.target.value) || undefined)
              }
              className="inp"
            />
          </Field>
        </div>

        {/* IMAGE */}
        <MediaField
          label="PRODUCT IMAGE"
          value={{ url: p.image, type: p.imageType ?? "image" }}
          onChange={(v) => setP({ ...p, image: v.url, imageType: v.type })}
        />

        {/* HOVER IMAGE */}
        <MediaField
          label="HOVER IMAGE"
          value={{ url: p.hoverImage, type: p.hoverImageType ?? "image" }}
          onChange={(v) => setP({ ...p, hoverImage: v.url, hoverImageType: v.type })}
        />

        {/* GALLERY IMAGES */}
        <Field label="GALLERY MEDIA (additional photos/videos — up to 8)">
          <div className="space-y-3">
            <p className="text-mono text-[10px] text-muted-foreground leading-relaxed">
              For every item, choose FULL PICTURE (shows edge-to-edge on the product page) or HALF PICTURE
              (H&M-style — pairs up with the next HALF picture to show two photos side by side in one row).
              Use the arrows to reorder — this is the order they appear on the product page.
            </p>
            <div className="flex flex-wrap gap-3">
              {(p.gallery ?? []).map((item, idx) => (
                <div key={idx} className="relative w-24 shrink-0">
                  <div className="relative w-24 h-24 border border-border">
                    {item.type === "video" ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.url} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => moveGalleryImage(idx, -1)}
                      disabled={idx === 0}
                      className="h-6 w-6 shrink-0 border border-border flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-25"
                    >
                      <ChevronLeft className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGalleryImage(idx, 1)}
                      disabled={idx === (p.gallery ?? []).length - 1}
                      className="h-6 w-6 shrink-0 border border-border flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-25"
                    >
                      <ChevronRight className="size-3" />
                    </button>
                  </div>
                  <select
                    value={item.layout}
                    onChange={(e) => setGalleryLayout(idx, e.target.value as GalleryItem["layout"])}
                    className="w-full mt-1 bg-background border border-border text-mono text-[9px] tracking-widest h-7 px-1"
                  >
                    <option value="standalone">FULL PICTURE</option>
                    <option value="half">HALF PICTURE</option>
                  </select>
                  <div className="inline-flex border border-border rounded overflow-hidden w-full mt-1">
                    {(["image", "video"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGalleryType(idx, t)}
                        className={`flex-1 h-6 text-[9px] font-semibold tracking-widest uppercase transition-colors ${
                          (item.type ?? "image") === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(p.gallery ?? []).length < 8 && (
              <div className="border border-dashed border-border rounded p-3 max-w-sm">
                <MediaField value={galleryMedia} onChange={setGalleryMedia} />
                <button
                  type="button"
                  onClick={addGalleryItem}
                  className="mt-2 w-full h-8 border border-border text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary"
                >
                  ADD TO GALLERY
                </button>
              </div>
            )}
            {(p.gallery ?? []).length > 0 && (
              <span className="text-mono text-[10px] text-muted-foreground">{(p.gallery ?? []).length}/8</span>
            )}
          </div>
        </Field>

        <div className="border border-border p-4 space-y-2">
          <div className="text-mono text-[10px] tracking-widest text-muted-foreground">STOCK &amp; VARIANTS (COLOUR × SIZE)</div>
          {!p.categoryId ? (
            <p className="text-mono text-[11px] text-muted-foreground">Select a category first — the sizes come from the category.</p>
          ) : stockLoading ? (
            <p className="text-mono text-[11px] text-muted-foreground">Loading stock…</p>
          ) : (
            <>
              {!single && sizesForCategory.length === 0 && (
                <p className="text-mono text-[11px] text-muted-foreground">
                  No sizes for this category, so stock is tracked as ONE SIZE. Add sizes in{" "}
                  <Link to="/admin/sizes" className="text-primary hover:underline">Admin → Sizes</Link>.
                </p>
              )}
              <StockModeEditor
                single={single}
                onSingleChange={setSingle}
                singleQty={singleQty}
                onSingleQtyChange={setSingleQty}
                cards={cards}
                onCardsChange={setCards}
                sizeLabels={sizesForCategory.map((sz) => sz.label)}
                productPrice={p.price}
                productCompareAt={p.compareAt}
              />
            </>
          )}
        </div>

        <Field label="DESCRIPTION (select text to bold or color it)">
          <RichTextEditor
            value={p.description}
            onChange={(html) => set("description", html)}
            rows={3}
          />
        </Field>

        <Field label="MATERIAL COMPOSITION (select text to bold or color it)">
          <RichTextEditor
            value={p.material}
            onChange={(html) => set("material", html)}
            rows={1}
            placeholder="100% heavyweight cotton, 300 GSM"
          />
        </Field>

        <Field label="MATERIAL CARE INSTRUCTIONS (select text to bold or color it)">
          <RichTextEditor
            value={p.materialCare ?? ""}
            onChange={(html) => set("materialCare", html)}
            rows={2}
            placeholder="Machine wash cold inside out. Hang dry. Do not bleach. Do not tumble dry."
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "SAVING…" : "SAVE PRODUCT"}
        </button>
      </form>

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
