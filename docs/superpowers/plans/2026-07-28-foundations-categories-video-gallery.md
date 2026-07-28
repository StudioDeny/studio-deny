# Phase 1 (Foundations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the three pieces of groundwork later redesign phases (navbar, homepage, PDP) depend on: a real product-category hierarchy, video upload in the media library, and a per-image gallery layout field — plus remove the dead `fit` product field, per user decision during scoping.

**Architecture:** Four independent, ordered tasks. Each schema-changing task produces exact SQL, but this repo has **no way to apply DDL programmatically** (no Supabase CLI installed, `.env` has only the anon key, `supabase/config.toml` points at a stale/dead project ref) — per user decision, **the user pastes each migration's SQL into the Supabase Dashboard SQL Editor for project `ablejcrtuiohdrapgacb` themselves**, then whoever is executing this plan verifies the result with a read-only REST call (works fine with just the anon key). **This repo has no test framework installed** (`package.json` has no `test` script, no vitest/jest/testing-library in `package.json`) — verification instead uses `npx tsc --noEmit` for type safety, direct REST queries for DB state, and manual dev-server click-through for UI behavior. Do not add a test framework as part of this plan — out of scope.

**Tech Stack:** TanStack Start + TanStack Router, React 19, Tailwind v4, Supabase (Postgres + RLS), Cloudinary (unsigned uploads).

## Global Constraints

- Supabase project: `ablejcrtuiohdrapgacb` (`https://ablejcrtuiohdrapgacb.supabase.co`). Anon key is in `.env` as `VITE_SUPABASE_ANON_KEY`.
- Migration files live in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql` (existing convention).
- No dual-column/backwards-compat shims — this is a low-traffic internal CMS with ~10 live products; replace fields outright rather than keeping old + new side by side.
- No new dependencies — reuse `src/lib/cloudinary.ts`'s existing `uploadToCloudinary`/`uploadVideoToCloudinary`, no new upload library.
- `Sneakers` is explicitly NOT part of the category hierarchy for this phase (user decision — the new navbar spec only names Men/Women/Accessories).
- Every schema-changing task requires a **manual pause**: present the SQL to the user, wait for them to confirm they've run it in the Supabase SQL Editor, before verifying and continuing. Do not attempt `supabase db push` or any other automated DDL execution.

---

### Task 1: Fix and apply the categories hierarchy migration

**Files:**
- Modify: `supabase/migrations/20260719000001_create_categories_hierarchy.sql`

**Interfaces:**
- Produces: live Supabase `categories` table (columns `id, name, slug, parent_id, is_active, created_at`) and `products.category_id uuid`, seeded with 8 rows (`men`, `women`, `accessories`, `rings`, `chains`, `socks`, `tops`, `bottoms`, `outerwear`). No code in this repo needs to change to consume this — `src/lib/catalog.ts` and `src/lib/productsStore.ts` already query these tables/columns.

This file already exists (written for the now-superseded 2026-07-19 spec) and is syntactically correct, but includes a `Sneakers` category that's out of scope now, and was never actually applied to the live database (the old plan tried to push it via a dead project ref).

- [ ] **Step 1: Remove the Sneakers category from the migration file**

In `supabase/migrations/20260719000001_create_categories_hierarchy.sql`, change:

```sql
-- Seed hierarchy: Men, Women, Accessories (-> Rings, Chains, Socks), Sneakers.
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Men', 'men', NULL),
  ('Women', 'women', NULL),
  ('Sneakers', 'sneakers', NULL),
  ('Accessories', 'accessories', NULL)
ON CONFLICT (slug) DO NOTHING;
```

to:

```sql
-- Seed hierarchy: Men, Women, Accessories (-> Rings, Chains, Socks).
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Men', 'men', NULL),
  ('Women', 'women', NULL),
  ('Accessories', 'accessories', NULL)
ON CONFLICT (slug) DO NOTHING;
```

Leave every other line in the file unchanged (the `Rings`/`Chains`/`Socks`/`Tops`/`Bottoms`/`Outerwear` inserts and the `UPDATE products` re-pointing statement are all still correct as written).

- [ ] **Step 2: Present the SQL to the user and wait for confirmation**

Read the full updated file and paste its contents into the conversation. Ask the user to open the Supabase Dashboard for project `ablejcrtuiohdrapgacb` → SQL Editor, paste the SQL, and run it. **Do not proceed to Step 3 until the user confirms they ran it.**

- [ ] **Step 3: Verify the table, column, and seed rows exist live**

Run (uses the anon key, safe to include verbatim — it's a publishable key, not a secret):

```bash
curl -s "https://ablejcrtuiohdrapgacb.supabase.co/rest/v1/categories?select=slug,name,parent_id&order=slug" \
  -H "apikey: sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB" \
  -H "Authorization: Bearer sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB"
```

Expected: a JSON array of exactly 9 rows — `men`, `women`, `accessories`, `rings`, `chains`, `socks`, `tops`, `bottoms`, `outerwear`. If the count or names don't match, stop and investigate before continuing — do not proceed to Task 2 with a partially-applied migration.

- [ ] **Step 4: Verify existing products got re-pointed**

```bash
curl -s "https://ablejcrtuiohdrapgacb.supabase.co/rest/v1/products?select=slug,category,category_id&is_active=eq.true" \
  -H "apikey: sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB" \
  -H "Authorization: Bearer sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB"
```

Expected: every product whose `category` is `Bottoms`/`Outerwear`/`Accessories`/`Tops` (case-insensitive) now has a non-null `category_id` matching the corresponding row from Step 3.

- [ ] **Step 5: Manual click-through verification (dev server)**

Run `npm run dev`, then:
- Visit `/admin/catalog` — confirm it lists 9 categories with correct parent nesting (Rings/Chains/Socks shown under Accessories), and no Sneakers row.
- Visit `/admin/products/new` — confirm the CATEGORY dropdown shows the same hierarchy, select one, save a test product, confirm it persists on reload.
- Visit `/collections/bottoms`, `/collections/outerwear`, `/collections/accessories` — confirm the same products render as before the migration.
- Visit `/collections/men`, `/collections/women`, `/collections/rings` — confirm each resolves (empty product grid is correct — no products assigned to these yet).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260719000001_create_categories_hierarchy.sql
git commit -m "fix(db): drop Sneakers from categories seed, apply categories hierarchy migration"
```

---

### Task 2: Media library video upload

**Files:**
- Create: `supabase/migrations/20260728000001_add_media_resource_type.sql`
- Modify: `src/types/database.ts:312-323` (`MediaAsset` type)
- Modify: `src/routes/admin.media.tsx`

**Interfaces:**
- Consumes: `uploadVideoToCloudinary(file: File): Promise<CloudinaryResult>` and `uploadToCloudinary(file: File): Promise<CloudinaryResult>`, both already exported from `src/lib/cloudinary.ts` (`CloudinaryResult = { public_id, secure_url, width, height, bytes, format, folder }`).
- Produces: `media_assets.resource_type` column (`'image' | 'video'`), used by later phases (Hero/carousel admin editors in Phase 3) to tell videos apart from images in any media picker built on top of this table.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260728000001_add_media_resource_type.sql
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'image';

CREATE INDEX IF NOT EXISTS media_assets_resource_type_idx ON media_assets (resource_type);
```

- [ ] **Step 2: Present the SQL to the user and wait for confirmation**

Paste the migration into the conversation, ask the user to run it in the Supabase SQL Editor for `ablejcrtuiohdrapgacb`. **Do not proceed until confirmed.**

- [ ] **Step 3: Verify the column exists**

```bash
curl -s "https://ablejcrtuiohdrapgacb.supabase.co/rest/v1/media_assets?select=id,resource_type&limit=1" \
  -H "apikey: sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB" \
  -H "Authorization: Bearer sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB"
```

Expected: no error; if any rows exist, each has `"resource_type": "image"`.

- [ ] **Step 4: Add `resource_type` to the `MediaAsset` type**

In `src/types/database.ts`, change:

```ts
export type MediaAsset = {
  id: string;
  public_id: string;
  secure_url: string;
  alt_text: string | null;
  folder: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  created_at: string;
};
```

to:

```ts
export type MediaResourceType = "image" | "video";

export type MediaAsset = {
  id: string;
  public_id: string;
  secure_url: string;
  alt_text: string | null;
  folder: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  resource_type: MediaResourceType;
  created_at: string;
};
```

- [ ] **Step 5: Run typecheck to confirm nothing else references `MediaAsset` incompatibly**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors (the only other consumer, `admin.media.tsx`, gets updated in the next step).

- [ ] **Step 6: Update `admin.media.tsx` to accept and upload video files**

In `src/routes/admin.media.tsx`, change the import line:

```ts
import { uploadToCloudinary } from "@/lib/cloudinary";
```

to:

```ts
import { uploadToCloudinary, uploadVideoToCloudinary } from "@/lib/cloudinary";
```

Change the `handleUpload` function:

```ts
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadToCloudinary(file);
        await supabase.from("media_assets").insert({
          public_id: result.public_id,
          secure_url: result.secure_url,
          alt_text: null,
          folder: result.folder || null,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      }
      toast.success(`${files.length} file(s) uploaded`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
```

to:

```ts
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const result = isVideo ? await uploadVideoToCloudinary(file) : await uploadToCloudinary(file);
        await supabase.from("media_assets").insert({
          public_id: result.public_id,
          secure_url: result.secure_url,
          alt_text: null,
          folder: result.folder || null,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
          resource_type: isVideo ? "video" : "image",
        });
      }
      toast.success(`${files.length} file(s) uploaded`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
```

Change the file input's `accept`:

```tsx
<input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
```

to:

```tsx
<input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
```

Change the grid thumbnail button to render a muted video preview for video assets instead of an `<img>`:

```tsx
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setEditingAlt(a.alt_text ?? null); }}
                  className={`group relative aspect-square overflow-hidden border-2 ${selected?.id === a.id ? "border-primary" : "border-border hover:border-primary/50"} bg-surface`}
                >
                  <img src={a.secure_url} alt={a.alt_text ?? ""} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-1 opacity-0 group-hover:opacity-100">
                    <span className="text-mono text-[9px] tracking-widest text-white bg-black/70 px-1">{a.format?.toUpperCase()}</span>
                  </div>
                </button>
```

to:

```tsx
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setEditingAlt(a.alt_text ?? null); }}
                  className={`group relative aspect-square overflow-hidden border-2 ${selected?.id === a.id ? "border-primary" : "border-border hover:border-primary/50"} bg-surface`}
                >
                  {a.resource_type === "video" ? (
                    <video src={a.secure_url} muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={a.secure_url} alt={a.alt_text ?? ""} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-1 opacity-0 group-hover:opacity-100">
                    <span className="text-mono text-[9px] tracking-widest text-white bg-black/70 px-1">{a.format?.toUpperCase()}</span>
                  </div>
                </button>
```

Change the selected-asset detail preview:

```tsx
            <img src={selected.secure_url} alt={selected.alt_text ?? ""} className="w-full aspect-square object-contain bg-muted" />
```

to:

```tsx
            {selected.resource_type === "video" ? (
              <video src={selected.secure_url} controls className="w-full aspect-square object-contain bg-muted" />
            ) : (
              <img src={selected.secure_url} alt={selected.alt_text ?? ""} className="w-full aspect-square object-contain bg-muted" />
            )}
```

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 8: Manual click-through verification**

Run `npm run dev`, visit `/admin/media`. **This requires the Cloudinary unsigned preset to already allow video** (user-owned dashboard change, tracked separately — if it's not done yet, skip the live-upload check and only verify the code compiles/renders, noting the gap to the user).
- Upload an image — confirm it still works exactly as before.
- Upload an mp4 — confirm it uploads, appears in the grid as a muted video thumbnail (not broken `<img>`), clicking it shows a playable `<video controls>` in the detail panel, copy-URL and delete both work on it.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260728000001_add_media_resource_type.sql src/types/database.ts src/routes/admin.media.tsx
git commit -m "feat(admin): support video uploads in the media library"
```

---

### Task 3: Gallery per-image layout field

**Files:**
- Create: `supabase/migrations/20260728000002_gallery_jsonb_layout.sql`
- Modify: `src/types/database.ts:1-13` (add `GalleryItem`, change `DBProduct.gallery`)
- Modify: `src/lib/productsStore.ts` (`Product.gallery`, `DBProduct.gallery`, `fromDB`, `toDB`)
- Modify: `src/routes/admin.products.new.tsx` (gallery upload UI)
- Modify: `src/routes/product.$slug.tsx:89` (gallery image list construction)

**Interfaces:**
- Produces: `GalleryItem = { url: string; layout: "standalone" | "half" }`, exported from `src/types/database.ts`. `Product.gallery` becomes `GalleryItem[] | undefined`. Later phases (PDP rebuild) read `.layout` per item to decide rendering width — not built in this task.
- Consumes: nothing new — same Cloudinary upload helpers as before.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260728000002_gallery_jsonb_layout.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_v2 jsonb NOT NULL DEFAULT '[]';

UPDATE products SET gallery_v2 = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', g, 'layout', 'standalone')), '[]'::jsonb)
  FROM unnest(gallery) AS g
);

ALTER TABLE products DROP COLUMN gallery;
ALTER TABLE products RENAME COLUMN gallery_v2 TO gallery;
```

- [ ] **Step 2: Present the SQL to the user and wait for confirmation**

Paste the migration, ask the user to run it in the Supabase SQL Editor for `ablejcrtuiohdrapgacb`. **Do not proceed until confirmed.**

- [ ] **Step 3: Verify existing product galleries survived the migration**

```bash
curl -s "https://ablejcrtuiohdrapgacb.supabase.co/rest/v1/products?select=slug,gallery&is_active=eq.true" \
  -H "apikey: sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB" \
  -H "Authorization: Bearer sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB"
```

Expected: `gallery` on each product is now an array of `{"url": "...", "layout": "standalone"}` objects (empty array `[]` for products that had no gallery photos before), with the same URLs and same count as before the migration. If any product's gallery came back empty when it previously had photos, stop — do not proceed.

- [ ] **Step 4: Add `GalleryItem` type and update `DBProduct.gallery`**

In `src/types/database.ts`, change:

```ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type DBProduct = {
  slug: string;
  name: string;
  category: string;
  category_id: string | null;
  brand: string | null;
  price: number;
  compare_at: number | null;
  image: string;
  hover_image: string;
  gallery: string[];
  badge: string | null;
  fit: string | null;
```

to:

```ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type GalleryItem = { url: string; layout: "standalone" | "half" };

export type DBProduct = {
  slug: string;
  name: string;
  category: string;
  category_id: string | null;
  brand: string | null;
  price: number;
  compare_at: number | null;
  image: string;
  hover_image: string;
  gallery: GalleryItem[];
  badge: string | null;
  fit: string | null;
```

- [ ] **Step 5: Update `src/lib/productsStore.ts`**

Change the imports and `Product`/`DBProduct` types:

```ts
import { supabase } from "./supabase";

export type Color = { name: string; hex: string };

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryId?: string;
  createdAt?: string;
  brand?: string;
  price: number;
  compareAt?: number;
  image: string;
  hoverImage: string;
  gallery?: string[];
  badge?: "NEW DROP" | "LAST PIECE" | "SALE" | "SOLD OUT";
```

to:

```ts
import { supabase } from "./supabase";
import type { GalleryItem } from "@/types/database";

export type Color = { name: string; hex: string };
export type { GalleryItem };

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryId?: string;
  createdAt?: string;
  brand?: string;
  price: number;
  compareAt?: number;
  image: string;
  hoverImage: string;
  gallery?: GalleryItem[];
  badge?: "NEW DROP" | "LAST PIECE" | "SALE" | "SOLD OUT";
```

Change the local `DBProduct` type's gallery field:

```ts
  image: string;
  hover_image: string;
  gallery: string[] | null;
  badge: string | null;
```

to:

```ts
  image: string;
  hover_image: string;
  gallery: GalleryItem[] | null;
  badge: string | null;
```

Change `fromDB`:

```ts
    gallery: (r.gallery as string[]) ?? [],
```

to:

```ts
    gallery: (r.gallery as GalleryItem[]) ?? [],
```

Change `toDB`:

```ts
    gallery: p.gallery ?? [],
```

stays exactly as-is (already just passes the array through — no change needed since both sides are now `GalleryItem[]`).

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors in `admin.products.new.tsx` and `product.$slug.tsx` only (both still treat gallery entries as strings) — fixed in the next two steps. No errors anywhere else.

- [ ] **Step 7: Update `admin.products.new.tsx` gallery upload UI**

Change the initial state's `gallery: []` (line 57) — no change needed, `[]` satisfies `GalleryItem[] | undefined` too.

Change `handleGalleryUpload`:

```ts
  const handleGalleryUpload = async (files: FileList) => {
    setUploadingGallery(true);
    try {
      const uploads = await Promise.all(Array.from(files).map((f) => uploadToCloudinary(f)));
      const urls = uploads.map((r) => r.secure_url);
      set("gallery", [...(p.gallery ?? []), ...urls]);
      toast.success(`${urls.length} image(s) added to gallery`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };
```

to:

```ts
  const handleGalleryUpload = async (files: FileList) => {
    setUploadingGallery(true);
    try {
      const uploads = await Promise.all(Array.from(files).map((f) => uploadToCloudinary(f)));
      const items: GalleryItem[] = uploads.map((r) => ({ url: r.secure_url, layout: "standalone" as const }));
      set("gallery", [...(p.gallery ?? []), ...items]);
      toast.success(`${items.length} image(s) added to gallery`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };

  const setGalleryLayout = (idx: number, layout: GalleryItem["layout"]) => {
    set("gallery", (p.gallery ?? []).map((item, i) => (i === idx ? { ...item, layout } : item)));
  };
```

Add the `GalleryItem` import — change:

```ts
import { upsertProduct, type Product } from "@/lib/productsStore";
```

to:

```ts
import { upsertProduct, type Product, type GalleryItem } from "@/lib/productsStore";
```

Change the gallery rendering block:

```tsx
            <div className="flex flex-wrap gap-2">
              {(p.gallery ?? []).map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 border border-border shrink-0">
                  <img src={url} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
```

to:

```tsx
            <div className="flex flex-wrap gap-2">
              {(p.gallery ?? []).map((item, idx) => (
                <div key={idx} className="relative w-20 shrink-0">
                  <div className="relative w-20 h-20 border border-border">
                    <img src={item.url} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  <select
                    value={item.layout}
                    onChange={(e) => setGalleryLayout(idx, e.target.value as GalleryItem["layout"])}
                    className="w-full mt-1 bg-background border border-border text-mono text-[9px] tracking-widest h-6 px-1"
                  >
                    <option value="standalone">STANDALONE</option>
                    <option value="half">HALF</option>
                  </select>
                </div>
              ))}
            </div>
```

- [ ] **Step 8: Update `product.$slug.tsx`'s gallery list construction**

Change:

```ts
  // Full gallery, in order: base image, hover image, then any extra gallery photos — deduped.
  const galleryImages = Array.from(new Set([product.image, product.hoverImage, ...(product.gallery ?? [])].filter(Boolean)));
```

to:

```ts
  // Full gallery, in order: base image, hover image, then any extra gallery photos — deduped.
  const galleryImages = Array.from(new Set([product.image, product.hoverImage, ...(product.gallery ?? []).map((g) => g.url)].filter(Boolean)));
```

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 10: Manual click-through verification**

Run `npm run dev`.
- Visit `/admin/products` and open an existing product with gallery photos — confirm they render, each with a STANDALONE/HALF dropdown defaulted to STANDALONE, and switching one to HALF and saving persists on reload.
- Upload a new gallery image — confirm it defaults to STANDALONE and can be removed.
- Visit that product's PDP (`/product/$slug`) — confirm all gallery images still render exactly as before (vertical stack, unchanged visually — layout-aware rendering is Phase 4, not this task).

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260728000002_gallery_jsonb_layout.sql src/types/database.ts src/lib/productsStore.ts src/routes/admin.products.new.tsx src/routes/product.$slug.tsx
git commit -m "feat(products): add per-image gallery layout field (standalone/half)"
```

---

### Task 4: Remove the `fit` product field

**Files:**
- Create: `supabase/migrations/20260728000003_remove_product_fit.sql`
- Modify: `src/types/database.ts` (`DBProduct`)
- Modify: `src/lib/productsStore.ts` (`Product`, `DBProduct`, `fromDB`, `toDB`)
- Modify: `src/routes/admin.products.new.tsx` (remove FIT field)

**Interfaces:**
- Removes: `Product.fit`, `DBProduct.fit`, the FIT `<select>` in the product form. No other file in the repo references `fit` (verified — only `database.ts`, `productsStore.ts`, and `admin.products.new.tsx` do).

This resolves the scoping decision that "remove Shop By Fit" (no such section exists) should instead mean removing the standalone product `fit` dropdown field, since that's the closest real match to the instruction.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260728000003_remove_product_fit.sql
ALTER TABLE products DROP COLUMN IF EXISTS fit;
```

- [ ] **Step 2: Present the SQL to the user and wait for confirmation**

Paste the migration, ask the user to run it in the Supabase SQL Editor for `ablejcrtuiohdrapgacb`. **Do not proceed until confirmed.**

- [ ] **Step 3: Verify the column is gone**

```bash
curl -s "https://ablejcrtuiohdrapgacb.supabase.co/rest/v1/products?select=slug&limit=1&fit=not.is.null" \
  -H "apikey: sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB" \
  -H "Authorization: Bearer sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB"
```

Expected: an error response mentioning `column products.fit does not exist` (confirms the column is gone — a successful empty-array response would mean the drop didn't take effect).

- [ ] **Step 4: Remove `fit` from `DBProduct` in `src/types/database.ts`**

Change:

```ts
  gallery: GalleryItem[];
  badge: string | null;
  fit: string | null;
  sizes: string[];
```

to:

```ts
  gallery: GalleryItem[];
  badge: string | null;
  sizes: string[];
```

- [ ] **Step 5: Remove `fit` from `src/lib/productsStore.ts`**

Remove `fit?: string;` from the `Product` type, `fit: string | null;` from the local `DBProduct` type, `fit: r.fit ?? undefined,` from `fromDB`, and `fit: p.fit ?? null,` from `toDB`.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: an error in `admin.products.new.tsx` where `fit` is still set/read — fixed next.

- [ ] **Step 7: Remove the FIT field from `admin.products.new.tsx`**

Remove the initial-state line:

```ts
      category: "",
      brand: listBrands()[0]?.name,
      fit: "",
      price: 0,
```

becomes:

```ts
      category: "",
      brand: listBrands()[0]?.name,
      price: 0,
```

Remove the whole FIT field block:

```tsx
        <Field label="FIT">
          <select
            value={p.fit ?? ""}
            onChange={(e) => set("fit", e.target.value || undefined)}
            className="inp"
          >
            <option value="">— NONE —</option>
            <option value="slim-fit">Slim Fit</option>
            <option value="regular-fit">Regular Fit</option>
            <option value="relaxed-fit">Relaxed Fit</option>
            <option value="oversized">Oversized</option>
          </select>
        </Field>

```

(the blank line immediately after the closing `</Field>` is removed along with it, so the BADGE grid and the Best Seller checkbox end up directly adjacent).

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 9: Manual click-through verification**

Run `npm run dev`, visit `/admin/products/new` and an existing product's edit page — confirm no FIT field appears anywhere, saving still works.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260728000003_remove_product_fit.sql src/types/database.ts src/lib/productsStore.ts src/routes/admin.products.new.tsx
git commit -m "chore(products): remove unused fit field"
```
