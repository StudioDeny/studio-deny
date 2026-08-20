import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { upsertProduct, type Product, type GalleryItem } from "@/lib/productsStore";
import { listCategories, listBrands, type Category, type Brand } from "@/lib/catalog";
import { listSizesForCategory, type Size } from "@/lib/sizes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { X, Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";

export type Variant = {
  id?: string;
  tempId?: string;
  size: string | null;
  color?: string | null;
  color_hex?: string | null;
  stock: number;
  price?: number | null;
  compare_price?: number | null;
  sku?: string | null;
};

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const nav = useNavigate();
  return (
    <ProductForm
      onSave={async (p) => {
        await upsertProduct(p);
        toast.success("Product created");
        nav({ to: "/admin/products" });
      }}
    />
  );
}

export function ProductForm({
  initial,
  onSave,
}: {
  initial?: Product;
  onSave: (p: Product) => Promise<void>;
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
      sizes: ["S", "M", "L", "XL"],
      colors: [{ name: "Black", hex: "#0a0a0a" }],
      description: "",
      material: "",
      materialCare: "",
      stock: 10,
    }
  );
  const [saving, setSaving] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<MediaValue>({ url: "", type: "image" });
  const [sizesForCategory, setSizesForCategory] = useState<Size[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(!!initial);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  useEffect(() => {
    if (!p.categoryId) { setSizesForCategory([]); return; }
    listSizesForCategory(p.categoryId).then(setSizesForCategory);
  }, [p.categoryId]);

  // Default a brand-new product to the first real brand once brands finish
  // loading — can't do this synchronously anymore since listBrands() is an
  // async Supabase call, not a localStorage read.
  useEffect(() => {
    if (!initial && !p.brand && brands.length > 0) {
      setP((prev) => ({ ...prev, brand: brands[0].name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands]);

  const fetchVariants = async () => {
    if (!initial) return;
    setVariantsLoading(true);
    const { data } = await supabase.from("product_variants").select("*").eq("product_id", initial.slug).order("size");
    setVariants(data ?? []);
    setVariantsLoading(false);
  };
  useEffect(() => { fetchVariants(); }, [initial?.slug]);

  // `vs` is one entry per selected size — editing an existing row always
  // yields exactly one; adding a new one can yield several at once (pick
  // multiple sizes for the same color/stock/price to create a row per size).
  const saveVariant = async (vs: Variant[]) => {
    if (vs.length === 0) return;
    if (initial) {
      const existingId = vs[0].id;
      if (existingId) {
        const existing = vs[0];
        const { error } = await supabase
          .from("product_variants")
          .update({
            size: existing.size, color: existing.color ?? null, color_hex: existing.color_hex ?? null,
            stock: existing.stock, price: existing.price ?? null, compare_price: existing.compare_price ?? null,
            sku: existing.sku ?? null,
          })
          .eq("id", existingId);
        if (error) { toast.error(error.message); return; }
      } else {
        const rows = vs.map((v) => ({
          product_id: initial.slug, size: v.size, color: v.color ?? null,
          color_hex: v.color_hex ?? null, stock: v.stock,
          price: v.price ?? null, compare_price: v.compare_price ?? null, sku: v.sku ?? null,
        }));
        const { error } = await supabase.from("product_variants").insert(rows);
        if (error) { toast.error(error.message); return; }
      }
      toast.success(vs.length > 1 ? `${vs.length} variants saved` : "Variant saved");
      setShowVariantModal(false);
      setEditingVariant(null);
      fetchVariants();
    } else {
      setVariants((prev) => {
        let next = [...prev];
        vs.forEach((v, i) => {
          const tempId = v.tempId ?? `tmp-${Date.now()}-${prev.length + i}`;
          const withId = { ...v, tempId };
          const idx = next.findIndex((x) => x.tempId === v.tempId);
          if (idx >= 0) next[idx] = withId;
          else next = [...next, withId];
        });
        return next;
      });
      setShowVariantModal(false);
      setEditingVariant(null);
      toast.success(vs.length > 1 ? `${vs.length} variants staged — will be saved with the product` : "Variant staged — will be saved with the product");
    }
  };

  const deleteVariant = async (v: Variant) => {
    if (!confirm("Delete this variant?")) return;
    if (initial && v.id) {
      const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Deleted");
      fetchVariants();
    } else {
      setVariants((prev) => prev.filter((x) => x.tempId !== v.tempId));
    }
  };

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
          const final = { ...p, slug: p.slug || slugify(p.name) };
          if (!final.name) return toast.error("Name required");
          if (!final.slug) return toast.error("Slug required");
          if (!final.image) return toast.error("Product image required");
          setSaving(true);
          try {
            await onSave(final);
            if (!initial && variants.length > 0) {
              const rows = variants.map((v) => ({
                product_id: final.slug, size: v.size, color: v.color ?? null,
                color_hex: v.color_hex ?? null, stock: v.stock,
                price: v.price ?? null, compare_price: v.compare_price ?? null, sku: v.sku ?? null,
              }));
              const { error } = await supabase.from("product_variants").insert(rows);
              if (error) toast.error(`Product saved, but variants failed: ${error.message}`);
            }
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="CATEGORY">
            <CategoryPicker
              categories={cats}
              value={p.categoryId}
              onChange={(c) => setP({ ...p, categoryId: c.id, category: c.name })}
              onCategoriesChange={setCats}
            />
          </Field>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <Field label="STOCK">
            <input
              type="number"
              value={p.stock}
              onChange={(e) => set("stock", Number(e.target.value))}
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

        <Field label="AVAILABLE SIZES (used when this product has no variants)">
          {!p.categoryId ? (
            <p className="text-mono text-[11px] text-muted-foreground">Select a category first.</p>
          ) : sizesForCategory.length === 0 ? (
            <p className="text-mono text-[11px] text-muted-foreground">
              No sizes defined for this category yet — add some in <Link to="/admin/sizes" className="text-primary hover:underline">Admin → Sizes</Link>.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizesForCategory.map((s) => {
                const active = p.sizes.includes(s.label);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      set("sizes", active ? p.sizes.filter((x) => x !== s.label) : [...p.sizes, s.label])
                    }
                    className={`h-10 px-4 border text-sm font-semibold transition-colors ${
                      active ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="DESCRIPTION">
          <textarea
            value={p.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="inp"
          />
        </Field>

        <Field label="MATERIAL COMPOSITION">
          <input
            value={p.material}
            onChange={(e) => set("material", e.target.value)}
            className="inp"
            placeholder="100% heavyweight cotton, 300 GSM"
          />
        </Field>

        <Field label="MATERIAL CARE INSTRUCTIONS">
          <textarea
            value={p.materialCare ?? ""}
            onChange={(e) => set("materialCare", e.target.value)}
            rows={2}
            className="inp"
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

      <div className="mt-14 pt-10 border-t border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-display text-3xl">VARIANTS.</h2>
          <button
            type="button"
            onClick={() => { setEditingVariant({ size: "", stock: 10 }); setShowVariantModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-mono text-xs tracking-widest px-4 h-9 hover:glow-primary"
          >
            <Plus className="size-3.5" /> ADD VARIANT
          </button>
        </div>
        <p className="text-muted-foreground text-xs mb-5" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
          VARIANTS OVERRIDE SIZES FROM THE PRODUCT FORM. IF VARIANTS EXIST, THE STOREFRONT USES THEM FOR SIZE/STOCK.
          {!initial && " NEW VARIANTS ARE SAVED WHEN YOU SAVE THE PRODUCT."}
        </p>

        {variantsLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : variants.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No variants. Add size + stock combinations to track inventory per size/color.</p>
          </div>
        ) : (
          <div className="border border-border bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-3">SIZE</th>
                  <th className="text-left p-3">COLOR</th>
                  <th className="text-left p-3">STOCK</th>
                  <th className="text-left p-3">PRICE</th>
                  <th className="text-left p-3">SKU</th>
                  <th className="text-right p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variants.map((v) => (
                  <tr key={v.id ?? v.tempId}>
                    <td className="p-3 text-mono font-bold">{v.size}</td>
                    <td className="p-3">
                      {v.color ? (
                        <div className="flex items-center gap-2">
                          {v.color_hex && (
                            <span className="size-4 rounded-full border border-border inline-block" style={{ background: v.color_hex }} />
                          )}
                          <span className="text-mono text-xs">{v.color}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={`text-mono text-xs font-semibold ${v.stock === 0 ? "text-red-500" : v.stock <= 5 ? "text-amber-600" : ""}`}>
                        {v.stock === 0 ? "OUT" : v.stock}
                      </span>
                    </td>
                    <td className="p-3 text-mono text-xs">{v.price ? `₹${v.price}` : <span className="text-muted-foreground">default</span>}</td>
                    <td className="p-3 text-muted-foreground text-xs">{v.sku || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setEditingVariant(v); setShowVariantModal(true); }}
                          className="text-mono text-[10px] tracking-widest text-primary hover:underline"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVariant(v)}
                          className="text-mono text-[10px] tracking-widest text-red-500 hover:underline"
                        >
                          DEL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVariantModal && editingVariant && (
        <VariantModal
          initial={editingVariant}
          categoryId={p.categoryId}
          onSave={saveVariant}
          onClose={() => { setShowVariantModal(false); setEditingVariant(null); }}
        />
      )}

      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}textarea.inp{height:auto;padding:10px 12px}`}</style>
    </div>
  );
}

function VariantModal({
  initial, categoryId, onSave, onClose,
}: {
  initial: Variant;
  categoryId?: string;
  onSave: (vs: Variant[]) => void;
  onClose: () => void;
}) {
  const isEditing = !!(initial.id || initial.tempId);
  const [v, setV] = useState<Variant>(initial);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initial.size ? [initial.size] : []);
  const [sizesForCategory, setSizesForCategory] = useState<Size[]>([]);
  const set = <K extends keyof Variant>(k: K, val: Variant[K]) => setV((prev) => ({ ...prev, [k]: val }));

  useEffect(() => {
    if (!categoryId) { setSizesForCategory([]); return; }
    listSizesForCategory(categoryId).then(setSizesForCategory);
  }, [categoryId]);

  const toggleSize = (label: string) => {
    if (isEditing) { setSelectedSizes([label]); return; }
    setSelectedSizes((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
  };

  const submit = () => {
    if (selectedSizes.length === 0) { toast.error("Pick at least one size"); return; }
    onSave(selectedSizes.map((size) => ({ ...v, size })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-border w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-display text-2xl">{isEditing ? "EDIT" : "ADD"} VARIANT.</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">
              SIZE * {!isEditing && "(pick multiple to create one variant per size)"}
            </div>
            {!categoryId ? (
              <p className="text-mono text-[11px] text-muted-foreground">Select a category on the product form first.</p>
            ) : sizesForCategory.length === 0 ? (
              <p className="text-mono text-[11px] text-muted-foreground">
                No sizes defined for this category yet — add some in Admin → Sizes.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizesForCategory.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSize(s.label)}
                    className={`h-9 px-3 border text-sm font-semibold transition-colors ${
                      selectedSizes.includes(s.label) ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">STOCK *</div>
            <input type="number" value={v.stock} min={0} onChange={(e) => set("stock", Number(e.target.value))} className="inp" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COLOR NAME</div>
              <input value={v.color ?? ""} onChange={(e) => set("color", e.target.value || undefined)} className="inp" placeholder="Black" />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COLOR HEX</div>
              <input value={v.color_hex ?? ""} onChange={(e) => set("color_hex", e.target.value || undefined)} className="inp" placeholder="#0a0a0a" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">PRICE ₹ (blank = product default)</div>
              <input
                type="number" value={v.price ?? ""}
                onChange={(e) => set("price", e.target.value ? Number(e.target.value) : undefined)}
                className="inp"
              />
            </label>
            <label className="block">
              <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">COMPARE AT ₹</div>
              <input
                type="number" value={v.compare_price ?? ""}
                onChange={(e) => set("compare_price", e.target.value ? Number(e.target.value) : undefined)}
                className="inp"
              />
            </label>
          </div>
          <label className="block">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">SKU (optional — your own internal code for this size/color, e.g. for warehouse or invoicing use. Not shown to customers.)</div>
            <input value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value || undefined)} className="inp" placeholder="SD-TEE-BLK-M" />
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={submit} className="flex-1 bg-primary text-primary-foreground text-mono text-xs tracking-widest h-10 hover:glow-primary">
            SAVE VARIANT
          </button>
          <button onClick={onClose} className="border border-border px-6 text-mono text-xs tracking-widest h-10 hover:border-primary">
            CANCEL
          </button>
        </div>
      </div>
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
