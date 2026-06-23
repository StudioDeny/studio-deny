import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { upsertProduct, type Product } from "@/lib/productsStore";
import { listCategories, listBrands } from "@/lib/catalog";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

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
  const cats = listCategories();
  const brands = listBrands();
  const [p, setP] = useState<Product>(
    initial ?? {
      slug: "",
      name: "",
      category: cats[0]?.name ?? "Tops",
      brand: brands[0]?.name,
      price: 0,
      image: "",
      hoverImage: "",
      sizes: ["S", "M", "L", "XL"],
      colors: [{ name: "Black", hex: "#0a0a0a" }],
      description: "",
      material: "",
      stock: 10,
    }
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingHover, setUploadingHover] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const hoverRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP({ ...p, [k]: v });
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleImageUpload = async (
    file: File,
    field: "image" | "hoverImage",
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      set(field, result.secure_url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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
            <select
              value={p.category}
              onChange={(e) => set("category", e.target.value)}
              className="inp"
            >
              {cats.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
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

        {/* IMAGE UPLOAD */}
        <Field label="PRODUCT IMAGE">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              {p.image ? (
                <div className="relative w-24 h-24 border border-border">
                  <img
                    src={p.image}
                    alt="product"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set("image", "")}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <input
                  value={p.image}
                  onChange={(e) => set("image", e.target.value)}
                  className="inp"
                  placeholder="Paste URL or upload →"
                />
              )}
            </div>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "image", setUploadingImg);
              }}
            />
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              disabled={uploadingImg}
              className="border border-border h-10 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingImg ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              UPLOAD
            </button>
          </div>
        </Field>

        {/* HOVER IMAGE UPLOAD */}
        <Field label="HOVER IMAGE">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              {p.hoverImage ? (
                <div className="relative w-24 h-24 border border-border">
                  <img
                    src={p.hoverImage}
                    alt="hover"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set("hoverImage", "")}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <input
                  value={p.hoverImage}
                  onChange={(e) => set("hoverImage", e.target.value)}
                  className="inp"
                  placeholder="Paste URL or upload →"
                />
              )}
            </div>
            <input
              ref={hoverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "hoverImage", setUploadingHover);
              }}
            />
            <button
              type="button"
              onClick={() => hoverRef.current?.click()}
              disabled={uploadingHover}
              className="border border-border h-10 px-3 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingHover ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              UPLOAD
            </button>
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

        <Field label="MATERIAL">
          <input
            value={p.material}
            onChange={(e) => set("material", e.target.value)}
            className="inp"
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
