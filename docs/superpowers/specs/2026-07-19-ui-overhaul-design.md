# UI Overhaul: Light-Mode Rebrand + Navigation — Design Spec

Date: 2026-07-19
Status: Approved by user, pending implementation plan

## Context

Studio Deny (CTRL streetwear brand) is moving to a single light-mode theme matching
a reference poster (light-gray gradient background, near-black text, red accent,
graffiti-style display type), plus a full navigation overhaul (new navbar, nested
mobile menu, and real category hierarchy). This is phase 1 of a larger set of
planned changes; more will follow in later specs.

Current relevant state (from codebase investigation):

- Theme: `src/context/ThemeContext.tsx` (dark/light toggle, defaults to dark,
  persisted to `localStorage["sd_theme"]`), tokens defined in `src/styles.css`
  via Tailwind v4 `@theme inline` (no `tailwind.config.*` file exists).
- Fonts: Bebas Neue (`--font-display`) + Barlow (`--font-body`/`--font-mono`),
  loaded via `@import` at the top of `src/styles.css`.
- Navbar: single file `src/components/layout/Navbar.tsx` (276 lines) contains
  desktop nav, mobile hamburger dropdown, and inline search panel together.
  Mobile hamburger is currently a flat link list with no nesting.
  `src/components/layout/BottomNav.tsx` is a separate fixed mobile tab bar
  (Home/Shop/Cart/Wishlist/Account) — untouched by this spec.
- Categories: today the live site reads a flat, non-hierarchical store —
  `src/lib/catalog.ts` (`localStorage["sd_categories_v1"]`), independent of
  Supabase. `supabase/migrations/20250516000001_alter_existing_tables.sql`
  contains an `ALTER TABLE categories ADD COLUMN ... parent_id` intended to
  add hierarchy support, but **verified against the live database directly**:
  the `categories` table does not actually exist in production (the ALTER is
  wrapped in `DO $$ ... EXCEPTION WHEN undefined_table THEN NULL END $$`,
  which silently no-ops when the table is missing — confirmed via a live
  query returning `Could not find the table 'public.categories'`). `products`
  likewise has no `category_id` column live (`column products.category_id
  does not exist`). So there is no existing hierarchy to "wire up" — it needs
  to be created from scratch. Live data check: only 10 products exist total,
  with `category` values `Bottoms`/`Outerwear`/`Accessories`/`Tops` — **none
  tagged `Men` or `Women`**, so `/collections/men` and `/collections/women`
  currently render zero products in production; there is no existing
  Men/Women product data to preserve or re-map. A separate `navigation_menus`
  Supabase table (`admin.navigation.tsx`) also exists and is unused by the
  live navbar — out of scope for this spec (not being wired in), left as-is.
- Best Sellers: already a real, working feature — an admin-curated list of
  product slugs (`src/lib/homeSections.ts` `bestSellers.productSlugs`, managed
  via `src/routes/admin.best-sellers.tsx`), not computed from sales data.
- Account page (`src/routes/account.tsx`): already has Wishlist, Saved
  Addresses, Track Order, and Returns as quick-action tiles. **No changes
  needed here** — out of scope for this spec.
- Loading: no shared loading component. Grepping confirms the literal
  `LOADING…` text pattern appears ~28 times, but **all but two are in admin
  routes** (`admin.*.tsx`), which are out of scope per Non-goals below. The
  only two storefront (customer-facing) occurrences are `src/routes/account.tsx:74`
  and `src/routes/order.$id.tsx:23`. Separately, `src/routes/shop.tsx:64` and
  `src/routes/collections.$slug.tsx:46` fetch products via `listProducts()`/
  `productsInCategory()` into `useState` with **no loading indicator at
  all** — the grid is simply empty until data resolves; this is the real
  "unclear loading" gap on the customer-facing site. `src/components/ui/skeleton.tsx`
  exists but is unused by any route and has low contrast (`bg-primary/10`).
  `Preloader.tsx` and the homepage Loyalty section (`src/routes/index.tsx`
  lines ~491-559) are both hardcoded to dark colors regardless of theme.
- Hover: no shared convention — every component (product cards, buttons, nav
  links, image tiles) implements its own bespoke hover treatment (opacity
  fades, border brightening, `scale-105/110` image zooms).

## Goals

1. Single light theme matching the reference poster's palette; remove dark
   mode entirely (code, toggle, and all `.dark`/`dark:` styles).
2. Add a graffiti/street display font for specific high-impact usages, without
   hurting readability of body copy or long labels.
3. Replace scattered "LOADING…" text with one real, visible loading component.
4. Standardize hover animation to one subtle, consistent convention site-wide.
5. Fill the homepage Loyalty section's dead space with street-style doodles,
   and make it respect the light theme.
6. Rebuild the desktop navbar and mobile menu around a new nav structure, and
   back it with a real Supabase category hierarchy (replacing the
   localStorage-based flat category store for storefront navigation).

## Non-goals

- No changes to Account page, checkout, cart, product detail pages, admin
  panel UI, or `BottomNav.tsx` beyond removing its Wishlist icon reference if
  it currently duplicates one already covered elsewhere (verify during
  implementation; only touch if it does).
- No move to computed/real sales-based Best Sellers — keep the existing
  curated mechanism, just gender-filter it.
- No change to `navigation_menus` Supabase table or `admin.navigation.tsx` —
  remains unused/dead, not part of this effort.
- Admin panel changes are limited to what's required for the storefront nav
  to function: the product-edit category picker (currently sourced from
  `catalog.ts`) must be updated to assign the new Supabase category rows to
  products (see section 6), since without it admins have no way to populate
  the new hierarchy. No other admin panel changes are in scope.

## 1. Theme — light-mode only

- Remove `src/context/ThemeContext.tsx` (or reduce to nothing consumed) and
  the toggle buttons in `Navbar.tsx` (desktop lines ~140-148, mobile
  ~261-268). Delete `.dark`/`dark:` rules in `src/styles.css`.
- Replace the current light-mode cream palette values in `src/styles.css`
  with a gray/black/red palette matching the reference poster:
  - `--color-background`: light gray, subtle diagonal gradient (tuned during
    build from roughly `#F3F3F3` → `#E6E6E6`), replacing the current cream
    gradient (`#FAF8F4 → ... → #F7F3EE`).
  - `--color-foreground`: near-black (`#111111`), replacing `#0D0B09`.
  - New accent token `--color-accent` (red, tuned from the reference's CTRL
    lettering, roughly `#E0202A`) — used for badges, active/underline states,
    and small accent details. Does not replace `--color-primary` (which stays
    near-black/white as the main ink/inverse-ink pair); it's additive.
  - `--color-surface`, `--color-border`, `--color-muted*` re-derived from the
    same gray scale for contrast consistency (exact steps tuned during
    build/visual QA, not hard-coded sight-unseen).
- Fix hardcoded-dark spots so nothing reads as a leftover dark section:
  - `Preloader.tsx`: replace `bg-[#0a0a0a]` + white text with the new light
    background + near-black text (or a suitable inverse if the splash design
    calls for a brief high-contrast moment — decide during build, default to
    matching the site's light background).
  - Loyalty section (`src/routes/index.tsx` ~491-559): replace `bg-[#050505]`
    with a light treatment; re-balance so it doesn't read as a dark rectangle
    against lighter sections above/below.

## 2. Typography

- Keep Bebas Neue (`--font-display`) and Barlow (`--font-body`/mono) exactly
  as they are today — no regression to existing headings/labels.
- Add **Bungee** (Google Font) as a new `--font-street` token, loaded via the
  same `@import` mechanism already in `src/styles.css` (this codebase
  previously hit a bug where `head()`-based font links didn't work in
  TanStack Start, per commit `85c3a45` — stick with `@import`, don't
  reintroduce `head()` font links).
- Apply `--font-street` (Bungee) only to:
  - Hero/campaign headlines (e.g. homepage hero, campaign banners).
  - Section titles site-wide (e.g. "NEW ARRIVALS", "BEST SELLERS", "LOYALTY
    HAS ITS REWARDS.").
  - Product badges ("NEW", "SALE", "LIMITED", etc.).
- Do NOT apply it to: the logo/wordmark, body copy, nav links, buttons, form
  labels, or the existing `.text-mono` tracked-letter-spacing labels — those
  keep Barlow/Bebas as today.

## 3. Loading states

Scope is the storefront only, per Non-goals (admin panel UI is out of scope):

- Add one shared `<Loading>` component (real spinner, not plain text),
  styled for clear visibility against the new light background.
- Replace the two storefront literal `LOADING…` text instances —
  `src/routes/account.tsx:74` and `src/routes/order.$id.tsx:23` — with
  `<Loading>`.
- Fix `src/components/ui/skeleton.tsx` contrast (currently `bg-primary/10`,
  too faint on a light background) and add a loading state to
  `src/routes/shop.tsx` and `src/routes/collections.$slug.tsx`, which
  currently show a blank grid with no indicator at all while
  `listProducts()`/`productsInCategory()` resolve — render a skeleton grid
  during that window instead.
- Admin routes (all ~26 other `LOADING…` instances, plus existing
  `Loader2`/`RefreshCw` spinners) are untouched — out of scope.

## 4. Hover animations

- Standardize on one convention applied consistently: `scale-[1.02]` to
  `scale-[1.03]` transform (kept intentionally minimal per the request) at
  ~200ms, combined with the existing opacity/color-fade treatments already in
  use — replacing today's inconsistent per-component bespoke hover logic
  (product cards' current 600ms/scale-1.06 image-swap effect is a special
  case and stays as-is; this standardization targets simpler elements: nav
  links, buttons, section/CTA tiles, image-reveal tiles that currently use ad
  hoc `scale-105`/`scale-110`).

## 5. Loyalty section doodles

- Generate a small AI-illustrated doodle/sticker set (stars, flame, drip,
  tag/sticker shapes) matching the graffiti vibe, used as background
  decoration to fill the dead space identified in the right column (tier
  strip finishes shorter than the left column's stacked headline+copy+2 CTAs).
- Doodles are decorative background layer only — do not overlap or reduce
  legibility of the existing headline/copy/CTA/tier-strip content.

## 6. Navigation — category data model

- New category hierarchy, stored in a freshly-created Supabase `categories`
  table (the table does not exist live today — see Context above) with a
  `parent_id` self-reference column:
  - Top-level: **Men**, **Women**, **Accessories**, **Sneakers**.
  - Children of Accessories only: **Rings**, **Chains**, **Socks**.
  - Men and Women have no category children — their "New Arrivals" and "Best
    Sellers" entries are views, not categories (see below).
- **New Arrivals** (under Men/Women in nav): not a category row. Computed as
  products where `category_id` resolves to that gender (directly or via a
  future child) AND `created_at` is within the last 30 days, sorted newest
  first.
- **Best Sellers** (under Men/Women in nav, and the existing top-level nav
  item): not a category row. Reuses the existing curated
  `homeSections.bestSellers.productSlugs` list; the Men/Women submenu entries
  filter that same curated list to products whose category resolves to that
  gender. No change to how admins curate the list today
  (`admin.best-sellers.tsx`).
- Storefront category-driven pages (`/collections/$slug`, via
  `productsInCategory`/`findCategoryBySlug` in `src/lib/catalog.ts`) move from
  the localStorage `sd_categories_v1` store to querying the Supabase
  `categories` table (with `parent_id`) instead. `catalog.ts`'s public
  functions are re-implemented against Supabase rather than localStorage;
  callers (`collections.$slug.tsx` and others) should not need to change
  their call signatures.
- Migration: a new Supabase migration creates the `categories` table
  (`id uuid pk`, `name text`, `slug text unique`, `parent_id uuid
  references categories(id)`, `is_active boolean default true`, `created_at
  timestamptz default now()`), adds `category_id uuid references
  categories(id)` to `products`, and inserts the Men/Women/Accessories/
  Sneakers/Rings/Chains/Socks rows with correct `parent_id` links.
- Existing product data (verified live: only 10 products, categories
  `Bottoms`/`Outerwear`/`Accessories`/`Tops`, none tagged Men/Women) needs no
  complex re-mapping — the migration also creates matching flat category rows
  for `Bottoms`/`Outerwear`/`Tops` (top-level, no parent) so the existing
  `Accessories`-tagged products can be re-pointed at the new `Accessories`
  category row by name match; `Bottoms`/`Outerwear`/`Tops` products are left
  with `category_id` null (admin re-assigns manually — there's no gender
  signal in the current data to infer from).
- The admin category picker in `src/routes/admin.products.new.tsx` and
  `src/routes/admin.products.index.tsx` (both currently call
  `listCategories()` from `catalog.ts`) needs updating to read from the new
  Supabase-backed hierarchy instead, so admins can assign `category_id` to
  products. `src/routes/admin.catalog.tsx` (the category management screen
  itself) also needs updating to manage Supabase categories instead of the
  localStorage store.

## 7. Navbar (desktop)

New left-to-right order in `Navbar.tsx`:

`Logo` → `Search bar` → `Men` `Women` `Accessories` `Sneakers` `New` `Best Sellers` → `Account`

- Search: keep the existing inline debounced search panel behavior (lines
  ~171-244 today), just relocated in the layout order.
- Wishlist icon is removed from the navbar (Wishlist remains reachable only
  via the Account page, which already has it).
- Cart icon is retained, positioned after Account (unchanged from today's
  general area, adjusted for the new item order).
- SHOP, LOOKBOOK, ABOUT, CONTACT, and the REWARDS pill are removed from the
  navbar entirely (confirmed decision). These pages are not deleted — they
  remain reachable via the footer (`src/components/layout/Footer.tsx`) or
  direct links — only the navbar/mobile-menu entries are removed.

## 8. Mobile menu

- Same removal as desktop: LOOKBOOK, ABOUT, CONTACT drop out of the mobile
  menu too, for consistency (today they appear in the flat mobile dropdown
  alongside Men/Women/Accessories).
- Convert the flat hamburger link list into an accordion:
  - Tapping **Men** or **Women** expands in place to reveal **New Arrivals**
    and **Best Sellers** as sub-items (no page navigation on the parent tap).
  - Tapping **Accessories** expands to reveal **Rings**, **Chains**, **Socks**.
  - **Sneakers** has no children — tapping it navigates straight to its
    collection page, same as today's flat items.
  - Only one section expanded at a time (accordion, not independent toggles),
    consistent with typical mobile nav patterns — confirm this default is
    acceptable during implementation if it becomes contentious.
- This is net-new interaction work — no existing expand/accordion behavior
  exists in `Navbar.tsx` today to build on.

## Testing / verification approach

- Visual QA against the reference poster for palette accuracy (background
  gradient, text contrast, accent red) across key pages: home, collection
  page, account, loyalty section.
- Manual click-through of desktop nav (all new items resolve to a real page)
  and mobile accordion (expand/collapse, correct children, Sneakers direct
  nav) on a real mobile viewport.
- Confirm no dark-mode remnants: grep for `dark:`/`.dark` classes and the
  removed `ThemeContext` import to ensure nothing still references them.
- Confirm `/collections/$slug` still renders correctly for `bottoms`,
  `outerwear`, `tops`, and `accessories` after the migration (existing live
  product data), and that the new `men`/`women`/`sneakers`/`rings`/`chains`/
  `socks` slugs render (empty-state is expected/correct for these until
  products are assigned).
