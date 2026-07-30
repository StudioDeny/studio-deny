import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { upsertProduct, type Product, type GalleryItem } from "@/lib/productsStore";
import { listCategories, listBrands, type Category } from "@/lib/catalog";
import { toast } from "sonner";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { MediaField, type MediaValue } from "@/components/admin/MediaField";

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
  const [brands, setBrands] = useState(() => listBrands());

  useEffect(() => {
    const refresh = () => {
      listCategories().then(setCats);
      setBrands(listBrands());
    };
    refresh();
    // Re-read on window focus so categories added in Catalog tab appear immediately
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const [p, setP] = useState<Product>(
    initial ?? {
      slug: "",
      name: "",
      category: "",
      brand: listBrands()[0]?.name,
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

        <Field label="SIZES (comma separated)">
          <input
            value={p.sizes.join(", ")}
            onChange={(e) =>
              set(
                "sizes",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            className="inp"
            placeholder="S, M, L, XL"
          />
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
