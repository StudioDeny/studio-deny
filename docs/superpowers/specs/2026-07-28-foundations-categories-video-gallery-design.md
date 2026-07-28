# Phase 1 — Foundations: Categories Migration, Media-Library Video Upload, Per-Image Gallery Layout

Date: 2026-07-28
Status: Approved by user, pending implementation plan

## Context

This is Phase 1 of a larger, user-approved multi-phase redesign (Navbar → Homepage →
PDP → Admin CMS unification will follow as separate specs). Phase 1 exists because
later phases depend on three pieces of groundwork that don't have obvious homes in
any single later phase:

1. The navbar rebuild (Phase 2) and the homepage's Men/Accessories/Women routing
   (Phase 3) both need a real category hierarchy to link to `/men`, `/women`,
   `/accessories`.
2. The homepage carousels (Phase 3) and the bug-fix requests (admin media/video
   upload) both need a working video-upload path in the general media library.
3. The PDP rebuild (Phase 4) needs a per-image layout field on the product gallery
   to already exist in the data model before it can render standalone/half-width
   images.

**Superseded prior spec:** `docs/superpowers/specs/2026-07-19-ui-overhaul-design.md`
("Approved, pending implementation") designed a conflicting navbar and an unrelated
light-mode/typography/loading bundle. Per user decision (2026-07-28), that spec is
now superseded — its navbar/theme/typography sections are dead. Its categories
data-model design (Men/Women/Accessories top-level, Rings/Chains/Socks under
Accessories) is reused below, **minus** the `Sneakers` top-level category it also
proposed (not part of the current navbar spec, zero live product data, dropped by
user decision).

**Key corrected facts** (verified by reading the actual source, not the old spec's
description of it — see `project_studio_deny.md` memory for the full correction):

- `src/lib/catalog.ts` is **already fully written against Supabase** for categories
  (`listCategories`, `listTopLevelCategories`, `listChildCategories`,
  `findCategoryBySlug`, `upsertCategory`, `deleteCategory`, `productsInCategory`) —
  it is not localStorage-backed. Only `Brand`s in that same file are
  localStorage-backed (`sd_brands_v1`, untouched by this spec).
- `src/lib/productsStore.ts`'s `Product` type already has `categoryId`, already
  maps `category_id ↔ categoryId`.
- `admin.catalog.tsx` (category management screen) and `admin.products.new.tsx`
  (product category picker) already call the Supabase-backed functions above.
- **The only actual gap is the missing migration** — the `categories` table and
  `products.category_id` column don't exist live (confirmed via direct REST query:
  `Could not find the table 'public.categories'`, `column products.category_id
  does not exist`). Zero frontend/admin code changes are needed for the category
  hierarchy to start working once the table exists.
- `uploadVideoToCloudinary` already exists in `src/lib/cloudinary.ts` (posts to
  Cloudinary's `/video/upload` endpoint using the same unsigned preset as image
  uploads) and is already used by `admin.influencer-picks.tsx`. It is not
  currently used by `admin.media.tsx` (the general media library), which is
  hardcoded `accept="image/*"` and only calls `uploadToCloudinary`.
- The unsigned Cloudinary preset is currently configured image-only account-side
  (verified live: uploading an mp4 fails with "Image file format mp4 not allowed").
  **User will reconfigure the preset in the Cloudinary dashboard themselves** —
  this spec's code assumes that reconfiguration happens; no code change can fix an
  account-level preset restriction.
- `products.gallery` is a plain `text[]` of URLs today (DB column + admin upload
  UI in `admin.products.new.tsx`, capped at 8 photos, no reorder, no per-image
  metadata). The PDP (`product.$slug.tsx`) already renders it as a vertical stack
  (`image` + `hover_image` + `gallery[]`, deduplicated), one `4:5` block each.

## Goals

1. Create the real `categories` table + `products.category_id` column live, seeded
   with Men/Women/Accessories (+ Rings/Chains/Socks under Accessories) and flat
   rows for the existing `Bottoms`/`Outerwear`/`Tops` text values, with existing
   products re-pointed where a name match exists.
2. Let admins upload video files (not just images) in the general media library,
   reusing the existing `uploadVideoToCloudinary` helper.
3. Change `products.gallery` from `text[]` to a `jsonb` array of
   `{ url, layout }` objects (`layout: "standalone" | "half"`), and add a
   Standalone/Half toggle to the admin gallery-upload UI.

## Non-goals

- No navbar, homepage, or PDP UI changes — those are Phases 2–4. This phase does
  not render category dropdowns, does not build the 3-card Men/Accessories/Women
  section, and does not make the PDP render gallery images by layout — it only
  lands the data + admin-input side of each.
- No changes to `admin.catalog.tsx`'s UI or `catalog.ts`'s function signatures —
  they already work against Supabase; nothing to change there.
- No wiring of video-upload/paste-URL into the Hero, 3-card, or full-screen
  category carousel admin editors (`admin.website-sections.tsx`) — that happens
  in Phase 3 when those editors are rebuilt anyway, using the media-library
  video-upload work landed here as the reusable pattern.
- No change to `admin.influencer-picks.tsx` (already has working video upload).
- Brands (`sd_brands_v1`, localStorage) are untouched.
- `Sneakers` is not added as a category (see Context).

## 1. Categories migration

New migration file (`supabase/migrations/<timestamp>_create_categories_hierarchy.sql`):

```sql
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products add column if not exists category_id uuid references categories(id);
```

Seed (top-level: Men, Women, Accessories, Bottoms, Outerwear, Tops; children of
Accessories: Rings, Chains, Socks):

- Insert the 3 new top-level rows (`men`, `women`, `accessories`) with
  `parent_id = null`.
- Insert `rings`, `chains`, `socks` with `parent_id` = the `accessories` row's id.
- Insert flat top-level rows for `bottoms`, `outerwear`, `tops` (matching the
  existing `products.category` text values verbatim, slugified), `parent_id = null`.
- Update `products set category_id = (select id from categories where slug =
  lower(products.category))` for the exact-name matches — this covers the
  existing `Accessories`/`Bottoms`/`Outerwear`/`Tops`-tagged products. No product
  currently has a Men/Women signal, so none get auto-assigned to those two rows;
  admins assign manually via the already-working product-edit category picker.
- RLS: mirror the existing pattern used for other public-read/admin-write tables
  in this repo (e.g. `announcement_bars`) — public `select` where `is_active`,
  admin-role `insert`/`update`/`delete`.

No application code changes — verify by:
- Direct REST query confirming the table/column/rows exist and row counts match
  (9 category rows total: men, women, accessories, rings, chains, socks, bottoms,
  outerwear, tops).
- `admin.catalog.tsx` loads and lists all 9 categories with correct parent
  nesting, can add/edit/deactivate a category.
- `admin.products.new.tsx`'s category picker shows the hierarchy and assigning a
  category persists `category_id` on save.
- `/collections/bottoms`, `/collections/outerwear`, `/collections/tops`,
  `/collections/accessories` render the same products they did before the
  migration (using `products.category` text matching today; confirm
  `productsInCategory` via `category_id` returns the same set post-migration).
- `/collections/men`, `/collections/women`, `/collections/rings`,
  `/collections/chains`, `/collections/socks` resolve (empty state is correct —
  no products assigned yet).

## 2. Media library video upload

`admin.media.tsx` changes:
- File input `accept` changes from `"image/*"` to `"image/*,video/*"`.
- On upload, branch by `file.type.startsWith("video/")`: call
  `uploadVideoToCloudinary` (video) vs the existing `uploadToCloudinary` (image) —
  both already exist in `src/lib/cloudinary.ts`, no new upload logic needed.
- `media_assets` table needs a way to distinguish videos from images for the
  library grid to render a play icon instead of an `<img>`. Add a migration:
  `alter table media_assets add column if not exists resource_type text not null
  default 'image';` populated from the branch above (`'video'` or `'image'`) at
  insert time. (Cloudinary's own API response already has a `format` field —
  `resource_type` is simpler to filter/display on than inferring from format.)
- Grid preview: video rows render a muted, non-autoplaying `<video>` thumbnail
  with native controls on click (matches the "playback preview" bug-fix ask);
  image rows unchanged.
- Existing search/filter-by-folder, copy-URL, and delete behavior extends to
  video rows unchanged (they're just another `media_assets` row).

Verification: with the Cloudinary preset already reconfigured by the user, upload
an mp4 through `admin.media.tsx`, confirm it appears in the grid with a working
preview, confirm `copy URL` gives back a playable Cloudinary video URL, confirm
delete removes the row.

## 3. Per-image gallery layout field

Data model change — `products.gallery` goes from `text[]` to `jsonb`:

```sql
alter table products add column if not exists gallery_v2 jsonb not null default '[]';
update products set gallery_v2 = (
  select coalesce(jsonb_agg(jsonb_build_object('url', g, 'layout', 'standalone')), '[]'::jsonb)
  from unnest(gallery) as g
);
alter table products drop column gallery;
alter table products rename column gallery_v2 to gallery;
```

(Single migration, single pass — only ~10 live products, no dual-column
transition period needed.)

`Product` type (`productsStore.ts`) changes `gallery: string[]` to
`gallery: { url: string; layout: "standalone" | "half" }[]`.

`admin.products.new.tsx` gallery UI: each uploaded image gets a
Standalone/Half toggle (segmented control or small dropdown) shown directly
under its thumbnail, defaulting to Standalone on upload. Existing
add/remove/8-photo-cap behavior is unchanged, just each entry now carries
`{url, layout}` instead of a bare string.

`product.$slug.tsx` (PDP): **not touched in this phase** — it currently maps
over `gallery` as a flat string list; that mapping needs to change to read
`.url` per entry to avoid breaking (since the type changes), but the *layout*
rendering behavior itself (actually laying out "half" images side by side) is
Phase 4 scope. This phase's PDP change is the minimum needed to not crash: map
`gallery.map(g => g.url)` (or equivalent) so today's vertical-stack rendering
continues to work unchanged until Phase 4 rebuilds it properly.

Verification: existing 10 products' galleries survive the migration with the
same image URLs, all defaulted to `"standalone"`; admin can upload a new gallery
image and set it to "Half"; the value persists on reload; the PDP still renders
all gallery images (unchanged visual behavior, just no crash from the type change).

## Testing / verification approach

- Run the categories migration and gallery migration directly against the live
  Supabase project (per user decision — no staging environment, low live-data
  volume). Take a row-count snapshot of `products` and `categories` before/after
  each migration as a manual sanity check.
- No automated test suite exists in this repo for Supabase migrations (verify via
  direct REST queries, as done for the original drift investigation).
- Manual click-through: `admin.catalog.tsx`, `admin.products.new.tsx` category
  picker, `admin.media.tsx` video upload, `admin.products.new.tsx` gallery
  layout toggle, and the 4 existing + 5 new `/collections/$slug` routes.
