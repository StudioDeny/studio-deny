# Light-Mode UI Overhaul + Navigation Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Studio Deny's storefront to a single light theme matching the
reference poster, add street-style typography/loading/hover polish, and
rebuild the navbar + mobile menu around a real Supabase-backed category
hierarchy.

**Architecture:** Pure frontend/styling changes for theme, type, loading, and
hover work (Tasks 1-6); one new Supabase migration plus a rewrite of the
localStorage-backed `catalog.ts` to query Supabase for the category/nav work
(Tasks 7-12).

**Tech Stack:** TanStack Start (React 19, Vite, TanStack Router), Tailwind v4
(`@theme inline` in `src/styles.css`, no separate config file), Supabase
(`@supabase/supabase-js`), Framer Motion, shadcn/radix components
(`@radix-ui/react-accordion` already installed and already has a shadcn
wrapper at `src/components/ui/accordion.tsx`), Lucide icons.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-ui-overhaul-design.md` — every
  task below implements one or more numbered sections of that spec.
- **No test framework exists in this repo** (no vitest/jest, no `test` script
  in `package.json`). Every task's "verify" step is: (1) `npx tsc --noEmit`
  must produce no output (no type errors), and (2) a manual check via
  `npm run dev` describing exactly what to look at/click. Do not invent a
  test framework as part of this work — out of scope.
- Dark mode is being removed entirely, not hidden — delete the code, don't
  add a flag.
- Admin panel UI/UX changes are out of scope **except** where a task below
  explicitly says otherwise (the category picker changes in Task 9 are
  required for the new nav to function, not optional polish).
- Color/typography values below are concrete starting points; nudge exact hex
  values during visual QA against the reference poster if needed, but the
  token names and structure must not change.
- New Supabase migration files go in `supabase/migrations/` and must follow
  the existing naming convention `YYYYMMDDHHMMSS_description.sql`.

---

### Task 1: Light-only palette + fix hardcoded-dark spots

**Files:**
- Modify: `src/styles.css:28-91`
- Modify: `src/components/layout/Preloader.tsx:39,48-49`

**Interfaces:**
- Produces: CSS custom properties `--background`, `--foreground`, `--surface`,
  `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`,
  `--muted`, `--muted-foreground`, `--border`, and a new `--color-accent`
  Tailwind token — consumed by every component via existing Tailwind classes
  (`bg-background`, `text-foreground`, etc.) and by Task 6 (Loyalty section)
  via the new `bg-accent`/`text-accent` classes.

- [ ] **Step 1: Replace the theme color blocks in `src/styles.css`**

Replace lines 28-59 (the `:root, .dark` and `.light` blocks) with a single
light palette (no `.dark`/`.light` class distinction anymore):

```css
:root {
  color-scheme: light;

  --background: #F2F2F0;
  --foreground: #111111;
  --surface: #E6E6E3;

  --primary: #111111;
  --primary-foreground: #F2F2F0;
  --secondary: #D8D8D4;
  --secondary-foreground: #111111;

  --muted: #DCDCD8;
  --muted-foreground: #55534E;
  --border: rgba(0, 0, 0, 0.14);

  --accent: #E0202A;
  --accent-foreground: #FFFFFF;
}
```

Replace the `@theme inline` block (lines 10-26) to add the accent token:

```css
@theme inline {
  --font-display: 'Bebas Neue', system-ui, sans-serif;
  --font-body: 'Barlow', system-ui, sans-serif;
  --font-mono: 'Barlow', system-ui, sans-serif;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);

  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
}
```

Remove the two `@custom-variant dark`/`@custom-variant light` lines (7-8) —
they're no longer needed since there's only one theme.

Replace the light-mode gradient block (lines 79-91, currently scoped under
`.light body`) so it applies to `body` directly (no class needed):

```css
  body {
    background: linear-gradient(
      150deg,
      #F7F7F5 0%,
      #F2F2F0 20%,
      #E9E9E6 50%,
      #EDEDEA 75%,
      #F5F5F3 100%
    );
    background-attachment: fixed;
    background-color: #F2F2F0;
    color: var(--foreground);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
```

Also change `html { color-scheme: dark; ... }` (line 67) to
`color-scheme: light;`.

- [ ] **Step 2: Fix the Preloader's hardcoded dark background**

In `src/components/layout/Preloader.tsx`, change line 39 from:
```tsx
          className="fixed inset-0 z-[1000] bg-[#0a0a0a] flex flex-col items-center justify-center pointer-events-none"
```
to:
```tsx
          className="fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center pointer-events-none"
```

Change line 48 from:
```tsx
              <h1 className="text-display text-5xl md:text-[10rem] leading-none text-white tracking-tighter uppercase text-center">
```
to:
```tsx
              <h1 className="text-display text-5xl md:text-[10rem] leading-none text-foreground tracking-tighter uppercase text-center">
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output (no errors).

Run: `npm run dev`, open the homepage in a browser. Expected: light-gray
gradient background, near-black text, the preloader splash (visible for the
first ~2.8s on load) matches the same light background instead of flashing
black.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/components/layout/Preloader.tsx
git commit -m "style: replace theme palette with single light gray/black/red scheme"
```

---

### Task 2: Remove dark mode plumbing

**Files:**
- Delete: `src/context/ThemeContext.tsx`
- Modify: `src/components/layout/Navbar.tsx` (remove theme toggle + `isLight` branching)
- Modify: `src/routes/__root.tsx` (remove `ThemeProvider` wrapper)
- Modify: `src/routes/index.tsx` (remove `useTheme`/`isLight`, lines 82-83 + 7 usage sites)
- Modify: `src/routes/rewards.tsx` (remove `useTheme`/`isLight`, lines 30-31 + 1 usage site)
- Modify: `src/components/home/WhyUsSection.tsx` (remove `useTheme`/`isLight`, lines 30-31 + 1 usage site)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: no file in the repo imports `useTheme`/`ThemeContext` anymore;
  every `isLight ? X : Y` conditional collapses to just `X` (the light-mode
  branch), since there's only one theme now. This is why Task 2 runs before
  Task 3 (which touches some of the same heading lines in `index.tsx`) — do
  these files in the order written so Task 3 edits the already-simplified
  className strings, not the original ternaries.

**Grep confirms exactly 4 files import `useTheme`** (besides
`ThemeContext.tsx` itself): `Navbar.tsx`, `index.tsx`, `rewards.tsx`,
`WhyUsSection.tsx`. All 4 must be fixed in this task or `npx tsc --noEmit`
will fail with "cannot find module '@/context/ThemeContext'" after Step 2.

- [ ] **Step 1: Find and remove the `ThemeProvider` wrapper**

Read `src/routes/__root.tsx`, find the `<ThemeProvider>` wrapper (reported at
line 64-66 by prior investigation) and remove the wrapping tag, keeping its
children in place, and remove the `import { ThemeProvider } from "@/context/ThemeContext"` import line.

- [ ] **Step 2: Delete the ThemeContext file**

```bash
rm src/context/ThemeContext.tsx
```

- [ ] **Step 3: Strip theme branching out of Navbar.tsx**

In `src/components/layout/Navbar.tsx`:

Remove the import line:
```tsx
import { useTheme } from "@/context/ThemeContext";
```

Remove line 18-19:
```tsx
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
```

Every conditional that reads `isLight ? A : B` collapses to just `A`
(the light branch). Concretely:

- Line 89-97 (`motion.nav` className): replace
  ```tsx
        className={`fixed top-0 left-0 right-0 z-[100] flex flex-col transition-[background,backdrop-filter] duration-300 ${
          navUseSolidBar
            ? isLight
              ? "bg-white/95 backdrop-blur-md border-b border-black/[0.08]"
              : "bg-[rgba(10,10,10,0.95)] backdrop-blur-md border-b border-white/[0.06]"
            : isLight
            ? "bg-transparent"
            : "mix-blend-difference"
        }`}
  ```
  with
  ```tsx
        className={`fixed top-0 left-0 right-0 z-[100] flex flex-col transition-[background,backdrop-filter] duration-300 ${
          navUseSolidBar
            ? "bg-white/95 backdrop-blur-md border-b border-black/[0.08]"
            : "bg-transparent"
        }`}
  ```
- Line 100: replace
  ```tsx
        <div className={`flex w-full items-center justify-between px-4 sm:px-8 lg:px-16 py-4 sm:py-6 ${isLight && navUseSolidBar ? "text-foreground" : "text-white"}`}>
  ```
  with
  ```tsx
        <div className="flex w-full items-center justify-between px-4 sm:px-8 lg:px-16 py-4 sm:py-6 text-foreground">
  ```
- Line 180: replace `style={{ background: isLight ? "rgba(255,255,255,0.98)" : "rgba(10,10,10,0.98)" }}`
  with `style={{ background: "rgba(255,255,255,0.98)" }}`.
- Remove the entire theme-toggle `<button>` block at lines 140-148 (desktop)
  and lines 261-268 (mobile) — both start with
  `onClick={toggleTheme}` / `onClick={() => { toggleTheme(); ... }}`.
  (The mobile one is replaced entirely by Task 12's accordion rebuild anyway;
  removing it here just means Task 12 doesn't have to deal with it.)
- Remove the now-unused `Sun, Moon` entries from the `lucide-react` import
  on line 4 if nothing else in the file uses them after the above removals
  (check with a search after editing — `Trophy` is also removed by Task 11,
  but that's a separate task; for this task only remove `Sun`/`Moon` if no
  other reference remains).

- [ ] **Step 4: Strip theme branching out of `index.tsx`**

In `src/routes/index.tsx`, remove the import line
`import { useTheme } from "@/context/ThemeContext";` (line 9) and remove
lines 82-83 (`const { theme } = useTheme(); const isLight = theme === "light";`).

Collapse each `isLight ? A : B` to `A`:
- Line 162: `filter: isLight ? "brightness(0.55)" : "brightness(0.35)",` → `filter: "brightness(0.55)",`
- Line 170: `style={{ filter: isLight ? "brightness(0.55)" : "brightness(0.35)", transform: ...}}` → `style={{ filter: "brightness(0.55)", transform: ...}}` (keep the rest of the style object unchanged)
- Line 176: `{isLight && <div className="absolute inset-0 z-[1] bg-[#F4F0EA]/40 pointer-events-none" />}` → keep this div unconditionally, but update its color to match the new palette: `<div className="absolute inset-0 z-[1] bg-[#F2F2F0]/40 pointer-events-none" />`
- Line 178: `` `relative z-10 max-w-[1320px] mx-auto w-full ${isLight ? "text-foreground" : "text-white"}` `` → `"relative z-10 max-w-[1320px] mx-auto w-full text-foreground"`
- Line 180: `` `text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display ${isLight ? "text-foreground" : "text-white"}` `` → `"text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display text-foreground"` (Task 3 will later append `text-street` to this same string — that's fine, it's additive)
- Line 183: `` `text-base sm:text-lg leading-relaxed max-w-xl text-mono ${isLight ? "text-foreground/75" : "text-white/80"}` `` → `"text-base sm:text-lg leading-relaxed max-w-xl text-mono text-foreground/75"`
- Line 188: drop the ternary, keep the light branch: `` `group relative overflow-hidden px-8 py-3 min-h-11 border transition-colors duration-300 inline-flex items-center justify-center gap-2 text-mono text-sm tracking-[0.14em] border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground` ``
- Line 192: same treatment: `` `px-8 py-3 min-h-11 border text-sm tracking-[0.14em] transition-colors duration-300 inline-flex items-center justify-center text-mono border-foreground/40 text-foreground hover:border-foreground hover:bg-foreground/10` ``
- Line 199: `` `absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-center ${isLight ? "text-foreground" : "text-white"}` `` → `"absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-center text-foreground"`
- Line 289: `style={{ WebkitTextStroke: isLight ? "2px rgba(0,0,0,0.55)" : "1px rgba(255,255,255,0.35)" }}` → `style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)" }}`

- [ ] **Step 5: Strip theme branching out of `rewards.tsx`**

In `src/routes/rewards.tsx`, remove the `useTheme` import and lines 30-31
(same pattern as Step 4). Line 58: `style={{ WebkitTextStroke: isLight ? "2px rgba(0,0,0,0.55)" : "1px rgba(255,255,255,0.4)" }}` → `style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)" }}`.

- [ ] **Step 6: Strip theme branching out of `WhyUsSection.tsx`**

In `src/components/home/WhyUsSection.tsx`, remove the `useTheme` import and
lines 30-31. Line 70: `style={{ WebkitTextStroke: isLight ? "2px rgba(0,0,0,0.55)" : "1px rgba(255,255,255,0.35)" }}` → `style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)" }}`.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no output. (If `isLight` or `useTheme` references remain anywhere
in the repo, this will fail with "cannot find name" or "cannot find module"
— fix any missed spot before proceeding.)

Run: `npm run dev`, load the homepage, `/rewards`, and any page rendering
`WhyUsSection`. Expected: no toggle button visible anywhere, all previously
theme-conditional styling now shows the light-mode look permanently, no
console errors about missing `ThemeContext`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove dark mode — theme is now light-only"
```

---

### Task 3: Add Bungee font + apply to hero/section titles/badges

**Files:**
- Modify: `src/styles.css` (font import + new token + utility class)
- Modify: `src/routes/index.tsx` (hero h1, section h2 titles)
- Modify: `src/routes/collections.$slug.tsx` (collection h1)
- Modify: `src/components/product/ProductCard.tsx` (badge span)

**Interfaces:**
- Produces: `--font-street` CSS var and `.text-street` utility class, usable
  by any future component that needs the graffiti-style font.

- [ ] **Step 1: Add the Bungee font import and token**

In `src/styles.css` line 1, change the existing `@import` to also pull Bungee:

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bungee&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');
```

In the `@theme inline` block (edited in Task 1), add:
```css
  --font-street: 'Bungee', 'Bebas Neue', system-ui, sans-serif;
```

In the `@layer utilities` block, add:
```css
  .text-street { font-family: var(--font-street); }
```

- [ ] **Step 2: Apply to the homepage hero headline**

In `src/routes/index.tsx`, by this point Task 2 (Step 4) has already
simplified the hero `h1`'s className to
`"text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display text-foreground"`
(no more `isLight` ternary — it's a plain string now, not a template
literal). Add `text-street` to it (Bungee overrides Bebas via CSS cascade
since it's later in the class list / same specificity — Tailwind v4 applies
classes in the order they're defined in `@layer utilities`, so put
`text-street` after `text-display` to make it win):
```tsx
          <h1 className="text-[clamp(3.5rem,15vw,10rem)] leading-[0.88] tracking-[-0.04em] uppercase max-w-5xl text-display text-street text-foreground">
```

- [ ] **Step 3: Apply to homepage section titles**

Note: the line numbers below are from the pre-Task-2 file. Task 2 (Step 4)
deletes 3 lines from `index.tsx` (the `useTheme` import plus lines 82-83),
shifting everything below by -3. Locate each heading by its unique text
content, not by trusting these raw numbers.

Add `text-street` next to `text-display` (same "append to className"
pattern as Step 2) on each of these `h2` section titles, identified by the
unique string each one renders/contains — originally at: line 235
(`hs.bestSellers.title`, the Best Sellers heading), line 330 (literal
`SHOP BY FIT`), line 362 (community band heading — search for the
surrounding `text-white` `h2` near the community photo band), line 385
(`hs.influencerPicks.title`), line 426 (literal `LOOKBOOK`), line 452
(`hs.community.title`), line 565 (literal `WORN IN` / `EVERY CITY`), line
605 (literal `CONTACT SUPPORT`). Skip the Loyalty heading (originally line
510, literal `LOYALTY` / `HAS ITS` / `REWARDS.`) — that one is handled by
Task 6, not here, to avoid a duplicate edit. Leave the fabric/story heading
(originally line 286) and the `h4` sub-labels (originally line 315) as
`text-display` only — those read as body-level section labels, not primary
section titles.

- [ ] **Step 4: Apply to the collection page title**

In `src/routes/collections.$slug.tsx` line 126, change:
```tsx
          <h1 className="text-display text-5xl md:text-7xl">{cat?.name?.toUpperCase() ?? slug.toUpperCase()}.</h1>
```
to:
```tsx
          <h1 className="text-display text-street text-5xl md:text-7xl">{cat?.name?.toUpperCase() ?? slug.toUpperCase()}.</h1>
```

- [ ] **Step 5: Apply to product badges**

In `src/components/product/ProductCard.tsx`, the badge `<span>` (lines
84-97) currently has no font override (inherits body font from context).
Add `text-street` to its className (line 85):
```tsx
              className={`absolute top-2.5 left-2.5 text-street font-semibold px-2 py-1 ${
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev`, check the homepage hero headline and section titles
render in Bungee (noticeably blockier/heavier than the Bebas Neue body
headings), and that a product card with a badge (e.g. any seeded product
with `badge: "SALE"`) shows the badge text in Bungee.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/routes/index.tsx src/routes/collections.\$slug.tsx src/components/product/ProductCard.tsx
git commit -m "feat: add Bungee display font for hero/section titles and badges"
```

---

### Task 4: Shared Loading component + Skeleton fix + wire into gaps

**Files:**
- Create: `src/components/ui/loading.tsx`
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/routes/account.tsx:74`
- Modify: `src/routes/order.$id.tsx:23`
- Modify: `src/routes/shop.tsx`
- Modify: `src/routes/collections.$slug.tsx`

**Interfaces:**
- Produces: `<Loading />` component (no props needed — a centered spinner),
  exported from `src/components/ui/loading.tsx`.
- Produces: `<Skeleton />` unchanged export signature, just fixed contrast.

- [ ] **Step 1: Create the shared Loading component**

```tsx
// src/components/ui/loading.tsx
import { Loader2 } from "lucide-react";

export function Loading({ className = "min-h-[40vh]" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="size-6 animate-spin text-foreground" strokeWidth={1.75} />
    </div>
  );
}
```

- [ ] **Step 2: Fix Skeleton contrast**

In `src/components/ui/skeleton.tsx`, change:
```tsx
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
```
to:
```tsx
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
```
(`--muted: #DCDCD8` from Task 1 gives clear, visible contrast against the
`#F2F2F0` background, vs. the old 10%-opacity-of-near-black trick.)

- [ ] **Step 3: Replace account.tsx's LOADING text**

In `src/routes/account.tsx`, add the import:
```tsx
import { Loading } from "@/components/ui/loading";
```
Change line 74 from:
```tsx
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-mono text-xs tracking-widest text-muted-foreground">LOADING…</div>;
```
to:
```tsx
  if (loading) return <Loading className="min-h-[60vh]" />;
```

- [ ] **Step 4: Replace order.$id.tsx's LOADING text**

In `src/routes/order.$id.tsx`, add the same import, then change line 23 from:
```tsx
  if (loading) return <div className="px-8 py-24 text-mono text-xs">LOADING…</div>;
```
to:
```tsx
  if (loading) return <Loading className="py-24" />;
```

- [ ] **Step 5: Add a skeleton grid to shop.tsx while products load**

In `src/routes/shop.tsx`, add a `loaded` flag next to the existing
`products` state (near line 60):
```tsx
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
```
Change the fetch effect (line 64) to:
```tsx
  useEffect(() => { listProducts().then((p) => { setProducts(p); setLoaded(true); }); }, []);
```
Import `Skeleton`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```
In the grid-rendering branch (around line 302-306, the `<>` block that
renders `items.map(...)`), wrap with a `!loaded` check — change:
```tsx
            <>
              <div className={`grid grid-cols-2 gap-3 md:gap-4 ${filterOpen ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                {items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}
              </div>
```
to:
```tsx
            <>
              {!loaded ? (
                <div className={`grid grid-cols-2 gap-3 md:gap-4 ${filterOpen ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] w-full" />
                  ))}
                </div>
              ) : (
                <div className={`grid grid-cols-2 gap-3 md:gap-4 ${filterOpen ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                  {items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}
                </div>
              )}
```

- [ ] **Step 6: Same skeleton treatment for collections.$slug.tsx**

In `src/routes/collections.$slug.tsx`, add a `loaded` flag alongside `items`
(near line 37):
```tsx
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
```
Change the fetch effect (line 45-48) to:
```tsx
  useEffect(() => {
    setLoaded(false);
    productsInCategory(slug).then((r) => { setItems(r); setLoaded(true); });
    setSelSizes([]); setMaxPrice(""); setOnSale(false); setInStock(false); setSort("new");
  }, [slug]);
```
Import `Skeleton`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```
Change the rendering branch (lines 148-158) from:
```tsx
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-border bg-surface">
              <p className="text-muted-foreground text-sm">No products match.</p>
              <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary">VIEW ALL →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </div>
```
to:
```tsx
        <div>
          {!loaded ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-border bg-surface">
              <p className="text-muted-foreground text-sm">No products match.</p>
              <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary">VIEW ALL →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </div>
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev`. Visit `/account` while logged out then log in (or throttle
network in devtools) to see the spinner briefly. Visit `/shop` and
`/collections/men` with network throttled to "Slow 3G" in devtools to see
the gray skeleton tiles render before real products/empty-state appears.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/loading.tsx src/components/ui/skeleton.tsx src/routes/account.tsx src/routes/order.\$id.tsx src/routes/shop.tsx src/routes/collections.\$slug.tsx
git commit -m "feat: add visible loading spinner and skeleton states to storefront"
```

---

### Task 5: Standardize hover scale animation

**Files:**
- Modify: `src/styles.css` (new utility class)
- Modify: `src/routes/index.tsx` (5 image-tile hover sites)
- (`src/components/layout/Navbar.tsx` nav links get `hover-scale` too, but
  as part of Task 11's full rebuild of that block, not here — see Step 3.)

**Interfaces:**
- Produces: `.hover-scale` utility class (`hover:scale-[1.03]
  transition-transform duration-200`), used anywhere a subtle hover-lift is
  wanted going forward.

- [ ] **Step 1: Add the utility class**

In `src/styles.css`'s `@layer utilities` block, add:
```css
  .hover-scale {
    transition: transform 200ms ease;
  }
  .hover-scale:hover {
    transform: scale(1.02);
  }
```

- [ ] **Step 2: Downgrade the 5 existing ad hoc `scale-105` hover tiles in index.tsx**

Change each of the following from `group-hover:scale-105` /
`group-hover/item:scale-105` to `group-hover:scale-[1.03]` /
`group-hover/item:scale-[1.03]` (keep everything else in each className
identical) — lines 337, 393, 434, 460, 483. Do not touch line 356 (a static
`scale-105`, not a hover effect).

Example for line 337, before:
```tsx
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
```
after:
```tsx
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]"
```
Apply the same substitution pattern (only the scale value changes, keep
`group-hover:` vs `group-hover/item:` prefix as-is per line) to lines 393,
434, 460, 483.

- [ ] **Step 3: Nav link hover treatment — deferred to Task 11**

Skip editing `Navbar.tsx` in this task. Task 11 replaces the entire desktop
nav block wholesale (different link set, different order), and its
replacement code already includes `hover-scale` on every link. Editing the
current nav links here would just be overwritten six tasks later — nothing
to do in this step, it exists only to document why `Navbar.tsx` isn't
touched in this task despite being mentioned in the spec.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev`, hover over homepage image tiles (fabric/fit section,
lookbook tiles, community grid) and confirm a subtle ~1.03x zoom instead of
the previous more aggressive 1.05-1.1x. (Nav link hover treatment is
verified later, in Task 11, once those links exist in their final form.)

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/routes/index.tsx
git commit -m "style: standardize hover animations to a subtle 1.02-1.03x scale"
```

---

### Task 6: Loyalty section — light theme, rebalance, doodles

**Files:**
- Modify: `src/routes/index.tsx:491-559`
- Create: doodle image assets (generated, see Step 2) under `src/assets/doodles/`

**Interfaces:**
- Consumes: `--color-accent`/`--color-accent-foreground` from Task 1.

- [ ] **Step 1: Restyle the section for the light theme**

In `src/routes/index.tsx`, replace the section wrapper (line 494) from:
```tsx
          <section className="py-20 sm:py-28 px-4 sm:px-8 lg:px-16 border-y border-border bg-[#050505] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
```
to:
```tsx
          <section className="py-20 sm:py-28 px-4 sm:px-8 lg:px-16 border-y border-border bg-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
```
(`bg-foreground` = the new near-black `#111111` token — this keeps the
section's intentional dark-panel-on-light-page contrast, but now it's driven
by the theme token instead of a hardcoded hex that would be wrong if the
palette changes again later. All the section's existing `text-white`/
`border-white/*` children already work correctly against this background —
no further per-element changes needed for the theme fix itself.)

Add `text-street` to the "LOYALTY HAS ITS REWARDS." heading (line 510),
alongside the `text-display` class already there — Task 3 (Step 3)
deliberately skips this line and defers it to this task, so this is the only
place that edit happens.

- [ ] **Step 2: Generate the doodle set**

Using whichever AI image-generation capability is available in the
execution environment, generate 4 individual transparent-background PNG (or
SVG) doodle assets in a loose, hand-drawn streetwear/graffiti style, white or
light-gray line art (so they sit subtly against the section's dark
`bg-foreground` panel):

1. `star-scribble.png` — prompt: "a single hand-drawn scribbly 4-point star
   doodle, white ink linework, transparent background, graffiti sketch
   style, no color fill, simple and loose"
2. `flame.png` — prompt: "a single hand-drawn flame doodle, white ink
   linework, transparent background, graffiti sketch style, no color fill"
3. `drip.png` — prompt: "a single hand-drawn paint drip doodle dripping
   downward, white ink linework, transparent background, graffiti sketch
   style"
4. `tag-sticker.png` — prompt: "a single hand-drawn rough sticker/tag shape
   outline with a jagged edge, white ink linework, transparent background,
   graffiti sketch style"

Save all 4 under `src/assets/doodles/`.

- [ ] **Step 3: Composite the doodles into the section, filling the right column's dead space**

Import the assets at the top of `src/routes/index.tsx`:
```tsx
import starDoodle from "@/assets/doodles/star-scribble.png";
import flameDoodle from "@/assets/doodles/flame.png";
import dripDoodle from "@/assets/doodles/drip.png";
import tagDoodle from "@/assets/doodles/tag-sticker.png";
```

Find the right-column `motion.div` — it's the second of the two
`motion.div`s inside the `grid lg:grid-cols-2` content grid (the first
holds the "LOYALTY HAS ITS REWARDS." headline; this one holds the
QUALIFY/EARN POINTS/REDEEM list and, right after it, the 4-column tier-strip
grid `ROOKIE`/`RUNNER`/`RIOT`/`LEGEND`) — identified by its
`className="space-y-4"`. Add `relative` to that className so the doodles can
be absolutely positioned within it, then add the 4 doodle `<img>` tags
immediately after the tier-strip grid's closing `</div>` (the one that
closes the `grid grid-cols-4 gap-1.5 pt-2` block), still nested inside the
same `motion.div`, before that `motion.div`'s own closing tag:

```tsx
                  <img src={starDoodle} alt="" aria-hidden className="hidden lg:block absolute -right-6 -top-2 w-16 opacity-70 pointer-events-none" />
                  <img src={flameDoodle} alt="" aria-hidden className="hidden lg:block absolute right-10 bottom-0 w-12 opacity-60 pointer-events-none" />
                  <img src={dripDoodle} alt="" aria-hidden className="hidden lg:block absolute -right-2 bottom-16 w-10 opacity-50 pointer-events-none" />
                  <img src={tagDoodle} alt="" aria-hidden className="hidden lg:block absolute right-24 -bottom-8 w-14 opacity-40 pointer-events-none" />
```
(`hidden lg:block` keeps these decorative-only on desktop where the column
imbalance is visible; on mobile the columns stack and there's no dead space
to fill. `pointer-events-none` and empty `alt` keep them non-interactive and
accessible. Exact offsets are starting points — nudge during visual QA so
they fill the gap without overlapping the tier-strip boxes or headline
text.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output (verifies the image imports resolve as modules — Vite's
asset-import typing is already set up repo-wide since other components do
the same import pattern for images).

Run: `npm run dev`, scroll to the Loyalty section on the homepage at a
desktop viewport width. Expected: dark panel now uses the theme's
`--foreground` token, doodles visible in the right column filling the space
below the tier strip without overlapping text, section reads consistent with
the rest of the now-light page instead of looking like an orphaned dark
rectangle.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/assets/doodles
git commit -m "style: rebalance loyalty section for light theme, add streetwear doodles"
```

---

### Task 7: Supabase migration — categories table + hierarchy seed

**Files:**
- Create: `supabase/migrations/20260719000001_create_categories_hierarchy.sql`

**Interfaces:**
- Produces: `categories` table (`id uuid pk`, `name text`, `slug text
  unique`, `parent_id uuid references categories(id)`, `is_active boolean`,
  `created_at timestamptz`) and `products.category_id uuid references
  categories(id)` — consumed by Task 8 (`catalog.ts` rewrite) and Task 9
  (admin category picker).

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Migration: create categories table with parent/child hierarchy,
-- add products.category_id, seed the new nav hierarchy.
-- The categories table does not exist in production today (verified
-- live) — this creates it from scratch rather than altering it.
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  parent_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read active categories" ON categories
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage categories" ON categories
    FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed hierarchy: Men, Women, Accessories (-> Rings, Chains, Socks), Sneakers.
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Men', 'men', NULL),
  ('Women', 'women', NULL),
  ('Sneakers', 'sneakers', NULL),
  ('Accessories', 'accessories', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Rings', 'rings', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Chains', 'chains', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id)
SELECT 'Socks', 'socks', id FROM categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

-- Also seed top-level rows for the existing flat category strings already
-- in use by live product data, so existing products can be re-pointed at
-- category_id without losing their current grouping.
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Tops', 'tops', NULL),
  ('Bottoms', 'bottoms', NULL),
  ('Outerwear', 'outerwear', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Re-point existing products at their matching category by the old flat
-- `category` text column (case-insensitive match). Verified live: only
-- Bottoms/Outerwear/Accessories/Tops are in use today, so this is a
-- straightforward name match, not a fuzzy/heuristic mapping.
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE lower(p.category) = lower(c.name)
  AND p.category_id IS NULL;
```

- [ ] **Step 2: Verify migration syntax**

Run: `npx supabase db lint supabase/migrations/20260719000001_create_categories_hierarchy.sql`
if the Supabase CLI is available locally; otherwise skip straight to Step 3
(applying it against a real project is the real verification here — this
is DDL, not something `tsc` can check).

- [ ] **Step 3: Apply the migration and verify against the live project**

Run: `npx supabase db push` (requires the project to be linked — if not
already linked, run `npx supabase link --project-ref ylnulbqctvvvvygezyik`
first, matching the `project_id` in `supabase/config.toml`).

After pushing, verify with a quick read query (same pattern used during
spec research):
```bash
node -e "
const fs = require('fs');
const env = {};
fs.readFileSync('.env','utf8').split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['\"]|['\"]$/g,'');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
  const cats = await supabase.from('categories').select('name,slug,parent_id').order('name');
  console.log(JSON.stringify(cats, null, 2));
  const prods = await supabase.from('products').select('slug,category,category_id');
  console.log(JSON.stringify(prods, null, 2));
})();
"
```
Expected: 11 category rows returned (Men, Women, Sneakers, Accessories,
Rings, Chains, Socks, Tops, Bottoms, Outerwear), with Rings/Chains/Socks
showing a non-null `parent_id` matching Accessories' `id`; and the 10
existing products now show a non-null `category_id` wherever their
`category` was `Accessories`/`Tops`/`Bottoms`/`Outerwear`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260719000001_create_categories_hierarchy.sql
git commit -m "feat(db): create categories table with parent/child hierarchy, seed nav categories"
```

---

### Task 8: Rewrite catalog.ts against Supabase

**Files:**
- Modify: `src/lib/catalog.ts` (full rewrite of the category-facing functions; brand functions stay localStorage-backed, untouched)
- Modify: `src/lib/productsStore.ts` (add `category_id` to `Product`/`DBProduct`)

**Interfaces:**
- Consumes: `categories` table from Task 7.
- Produces (new shape, replaces the old flat one):
  ```ts
  export type Category = {
    id: string;
    slug: string;
    name: string;
    parentId: string | null;
  };
  export async function listCategories(): Promise<Category[]>;
  export async function listTopLevelCategories(): Promise<Category[]>;
  export async function listChildCategories(parentSlug: string): Promise<Category[]>;
  export async function findCategoryBySlug(slug: string): Promise<Category | undefined>;
  export async function productsInCategory(catSlug: string): Promise<Product[]>;
  ```
  All now `async` (previously `findCategoryBySlug`/`listCategories` were
  synchronous, localStorage-backed) — every caller must be updated to
  `await`/`.then()` accordingly. Callers identified: `collections.$slug.tsx`,
  `admin.catalog.tsx`, `admin.products.new.tsx`, `admin.products.index.tsx`
  (all handled in this task or Task 9).

- [ ] **Step 1: Add `category_id` to the Product type**

In `src/lib/productsStore.ts`, add to the `Product` type (after `category:
string;`, line 8):
```ts
  categoryId?: string;
```
Add to `DBProduct` (after `category: string;`, line 30):
```ts
  category_id: string | null;
```
In `fromDB` (after `category: r.category,`, line 55):
```ts
    categoryId: r.category_id ?? undefined,
```
In `toDB` (after `category: p.category,`, line 79):
```ts
    category_id: p.categoryId ?? null,
```

- [ ] **Step 2: Rewrite catalog.ts's category functions against Supabase**

Replace the whole file (brand functions kept as-is at the bottom):

```ts
// Catalog: categories (Supabase-backed, hierarchical) & brands (localStorage-backed).
import { listProducts } from "./productsStore";
import { supabase } from "./supabase";

const BRAND_KEY = "sd_brands_v1";

export type Category = { id: string; slug: string; name: string; parentId: string | null };
export type Brand = { slug: string; name: string };

export const DEFAULT_BRANDS: Brand[] = [
  { slug: "studio-deny", name: "Studio Deny" },
];

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type DBCategory = { id: string; slug: string; name: string; parent_id: string | null };
const fromDBCategory = (r: DBCategory): Category => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id });

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name,parent_id")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("listCategories:", error.message);
    return [];
  }
  return (data as DBCategory[]).map(fromDBCategory);
}

export async function listTopLevelCategories(): Promise<Category[]> {
  return (await listCategories()).filter((c) => c.parentId === null);
}

export async function listChildCategories(parentSlug: string): Promise<Category[]> {
  const all = await listCategories();
  const parent = all.find((c) => c.slug === parentSlug);
  if (!parent) return [];
  return all.filter((c) => c.parentId === parent.id);
}

export async function findCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await listCategories()).find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

export async function upsertCategory(input: { name: string; slug?: string; parentId?: string | null }): Promise<void> {
  const slug = input.slug ?? slugify(input.name);
  const { error } = await supabase
    .from("categories")
    .upsert({ name: input.name, slug, parent_id: input.parentId ?? null }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
}

export async function deleteCategory(slug: string): Promise<void> {
  const { error } = await supabase.from("categories").update({ is_active: false }).eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function productsInCategory(catSlug: string) {
  const cat = await findCategoryBySlug(catSlug);
  if (!cat) return [];
  const children = await listChildCategories(catSlug);
  const ids = new Set([cat.id, ...children.map((c) => c.id)]);
  const all = await listProducts();
  return all.filter((p) => p.categoryId && ids.has(p.categoryId));
}

// ── Brands (unchanged — still localStorage-backed) ─────────────────────
const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    if (raw === null) return fb;
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) && parsed.length > 0 ? parsed : fb) as T;
  } catch { return fb; }
};
const write = (k: string, v: unknown): boolean => {
  if (typeof window === "undefined") return false;
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

export function listBrands(): Brand[] {
  return read<Brand[]>(BRAND_KEY, DEFAULT_BRANDS);
}
export function saveBrands(list: Brand[]): boolean { return write(BRAND_KEY, list); }
export function upsertBrand(b: Brand): Brand[] {
  const list = [...listBrands()];
  const i = list.findIndex((x) => x.slug === b.slug);
  if (i >= 0) list[i] = b; else list.push(b);
  saveBrands(list);
  return list;
}
export function deleteBrand(slug: string): Brand[] {
  const list = listBrands().filter((b) => b.slug !== slug);
  saveBrands(list);
  return list;
}
```

- [ ] **Step 3: Update `collections.$slug.tsx` for the now-async `findCategoryBySlug`**

In `src/routes/collections.$slug.tsx`, `cat` is currently computed
synchronously (line 50: `const cat = useMemo(() => findCategoryBySlug(slug), [slug]);`)
and `all` (line 51: `const all = listCategories();`) is also synchronous.
Both are now async. Replace with state + effect:

```tsx
  const [cat, setCat] = useState<Category | undefined>(undefined);
  const [all, setAll] = useState<Category[]>([]);
  useEffect(() => { findCategoryBySlug(slug).then(setCat); }, [slug]);
  useEffect(() => { listCategories().then(setAll); }, []);
```
Add `import type { Category } from "@/lib/catalog";` alongside the existing
`catalog` import, and remove the now-unused `useMemo` import if nothing else
in the file uses it (check before removing).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output — this is the step that will catch any missed
sync-to-async caller (Task 9 handles the admin-side callers separately, but
if this step surfaces errors in `admin.catalog.tsx`/`admin.products.*.tsx`,
that's expected until Task 9 runs; note them and proceed, they're fixed
next).

Run: `npm run dev`, visit `/collections/accessories` (should show the
`Accessories`-tagged product from the seed data) and `/collections/men`
(should show the empty-state, since no products are tagged Men yet — this
is correct given live data, not a bug).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog.ts src/lib/productsStore.ts src/routes/collections.\$slug.tsx
git commit -m "feat: rewrite catalog.ts category functions against Supabase hierarchy"
```

---

### Task 9: Update admin category management + product category picker

**Files:**
- Modify: `src/routes/admin.catalog.tsx`
- Modify: `src/routes/admin.products.new.tsx`
- Modify: `src/routes/admin.products.index.tsx`

**Interfaces:**
- Consumes: async `listCategories`/`upsertCategory`/`deleteCategory` from Task 8.

- [ ] **Step 1: Update admin.catalog.tsx to manage the hierarchy**

Replace the categories half of `src/routes/admin.catalog.tsx` (brands half
stays as-is). Change the import line:
```tsx
import {
  upsertBrand, deleteBrand, listBrands,
  upsertCategory, deleteCategory, listCategories, slugify,
  type Brand, type Category,
} from "@/lib/catalog";
```
Change the load effect (lines 23-26) to handle the async category call and
add a parent picker to category creation:
```tsx
  useEffect(() => {
    listCategories().then(setCats);
    setBrands(listBrands());
  }, []);
```
Add a `newCatParent` select state and pass it through `addCat`:
```tsx
  const [newCatParent, setNewCatParent] = useState<string>("");
  ...
  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    await upsertCategory({ name, parentId: newCatParent || null });
    setCats(await listCategories());
    setNewCat("");
    setNewCatParent("");
    toast.success(`"${name}" added`);
  };
  const removeCat = async (slug: string) => {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(slug);
    setCats(await listCategories());
  };
```
In the CATEGORIES `<Panel>`, add a parent-select dropdown next to the
existing `AddRow` (top-level categories only, since only one level of
nesting exists):
```tsx
          <select value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}
            className="bg-background border border-border h-9 px-2 text-xs mb-2 w-full">
            <option value="">— Top level —</option>
            {cats.filter((c) => c.parentId === null).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
```
The existing `List` component's `items` prop maps `cats` to
`{slug, name}` — since `Category` still has both, this continues to work
unchanged; add a small parent-name annotation so nesting is visible, by
changing the `items` mapping (line 75) from:
```tsx
            items={cats.map((c) => ({ slug: c.slug, name: c.name }))}
```
to:
```tsx
            items={cats.map((c) => ({
              slug: c.slug,
              name: c.parentId ? `${c.name} (under ${cats.find((p) => p.id === c.parentId)?.name ?? "?"})` : c.name,
            }))}
```
(`saveEdit`'s `upsertCategory` call also needs `await` — update its
signature to `async` and the two call sites inside it accordingly, matching
the pattern already used in `addCat` above.)

- [ ] **Step 2: Update the product-edit category picker (admin.products.new.tsx)**

In `src/routes/admin.products.new.tsx`, change the import from
`listCategories, listBrands` (synchronous) to handle the new async shape.
Change the state initialization (lines 33-45):
```tsx
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState(() => listBrands());

  useEffect(() => {
    const refresh = () => {
      listCategories().then(setCats);
      setBrands(listBrands());
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
```
Add `import type { Category } from "@/lib/catalog";`.

Change the initial product state's category default (line 51) — since
`Product.category` (string) is being kept for backward display purposes but
`categoryId` is now the source of truth for filtering, initialize both once
`cats` loads (the initial synchronous default can't read `cats` before the
effect runs, so default to empty and let the picker below drive it):
```tsx
      category: "",
```
Find the category `<select>` in the form JSX (search the file for
`p.category` — the actual select markup wasn't in the excerpt read, so
locate it by that string) and change it to set both `category` (display
string, unchanged) and `categoryId` together on change:
```tsx
          <select
            value={p.categoryId ?? ""}
            onChange={(e) => {
              const chosen = cats.find((c) => c.id === e.target.value);
              setP({ ...p, categoryId: chosen?.id, category: chosen?.name ?? p.category });
            }}
            className="..."
          >
            <option value="">— Select category —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? `${cats.find((p2) => p2.id === c.parentId)?.name} / ${c.name}` : c.name}
              </option>
            ))}
          </select>
```
(Keep whatever wrapper/label markup already surrounds the existing select —
only the `<select>` internals and its value/onChange need to change to the
above.)

- [ ] **Step 3: Update admin.products.index.tsx if it also renders a category picker/filter**

Read `src/routes/admin.products.index.tsx`, find its usage of
`listCategories` (confirmed present by the earlier grep), and apply the same
async-load treatment as Step 2 (load into `useState` via `.then()` in a
`useEffect`, rather than calling it synchronously inline).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output — this is the final check that no synchronous
`listCategories()`/`findCategoryBySlug()` call sites remain anywhere in the
repo (Task 8 introduced the async signatures; this task's job is to be the
last caller to catch up).

Run: `npm run dev`, log in as admin, visit `/admin/catalog`, add a new
top-level category and a child category under Accessories, confirm both
appear correctly nested in the list. Visit `/admin/products/new`, confirm
the category dropdown shows the full hierarchy (children indented/labeled
with their parent), select one, save a product, and confirm
`/collections/<that-category-slug>` now shows it on the storefront.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.catalog.tsx src/routes/admin.products.new.tsx src/routes/admin.products.index.tsx
git commit -m "feat(admin): manage category hierarchy and assign categories to products"
```

---

### Task 10: New Arrivals / Best Sellers computed helpers

**Files:**
- Create: `src/lib/navCollections.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function newArrivalsForGender(genderSlug: "men" | "women"): Promise<Product[]>;
  export async function bestSellersForGender(genderSlug: "men" | "women"): Promise<Product[]>;
  ```
  Consumed by Task 12 (mobile accordion) and optionally Task 11 if the
  desktop nav ever needs a preview — for this plan, both nav levels just
  link to a route (Step 2 below), they don't need to fetch the list
  themselves; this file exists so the destination routes (or a future
  dedicated New Arrivals/Best Sellers page, out of scope here beyond linking)
  have a single correct implementation to call.

- [ ] **Step 1: Write the helper module**

```ts
// src/lib/navCollections.ts
import { listProducts, type Product } from "./productsStore";
import { findCategoryBySlug } from "./catalog";
import { getHomeSections } from "./homeSections";

const NEW_ARRIVALS_WINDOW_DAYS = 30;

async function productsForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const cat = await findCategoryBySlug(genderSlug);
  if (!cat) return [];
  const all = await listProducts();
  return all.filter((p) => p.categoryId === cat.id);
}

export async function newArrivalsForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const gendered = await productsForGender(genderSlug);
  const cutoff = Date.now() - NEW_ARRIVALS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return gendered
    .filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}

export async function bestSellersForGender(genderSlug: "men" | "women"): Promise<Product[]> {
  const gendered = await productsForGender(genderSlug);
  const curatedSlugs = new Set(getHomeSections().bestSellers.productSlugs);
  return gendered.filter((p) => curatedSlugs.has(p.slug));
}
```

- [ ] **Step 2: Expose `createdAt` on the `Product` type**

`newArrivalsForGender` needs a creation timestamp, which `productsStore.ts`'s
`Product`/`fromDB` currently drop (`DBProduct` has `created_at` but `fromDB`
doesn't map it onto `Product`). In `src/lib/productsStore.ts`, add to
`Product` (after `categoryId?: string;`):
```ts
  createdAt?: string;
```
In `fromDB`, add:
```ts
    createdAt: r.created_at,
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

There's no route wired to call these yet (that's Task 12's job for the
mobile menu, which links straight to `/collections/$slug` rather than
calling these directly — see Task 12 for why). As a standalone check, run
this in the browser console on any page after `npm run dev` (paste into
devtools, adjust the import path isn't possible from console — instead,
temporarily add a one-line `console.log` call inside `Navbar.tsx`'s mount
effect calling `newArrivalsForGender("men").then(console.log)`, observe the
array in the console, then remove the temporary log before committing).

- [ ] **Step 4: Commit**

```bash
git add src/lib/navCollections.ts src/lib/productsStore.ts
git commit -m "feat: add gender-scoped New Arrivals / Best Sellers computed helpers"
```

---

### Task 11: Desktop navbar rebuild

**Files:**
- Modify: `src/components/layout/Navbar.tsx:110-149`

**Interfaces:**
- Consumes: nothing new (category slugs `men`/`women`/`accessories`/
  `sneakers` are hardcoded literals in `<Link>`s, same pattern as today —
  the nav doesn't need to fetch categories to render its own links, it just
  needs the slugs to exist, which Task 7 guarantees).

- [ ] **Step 1: Replace the desktop nav block**

Replace lines 110-149 (the entire `<div className="hidden sm:flex ...">`
block) with:

```tsx
          <div className="hidden sm:flex gap-5 lg:gap-7 items-center font-body">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label="Search"
              className={`flex items-center justify-center size-8 transition-opacity ${searchOpen ? "opacity-100" : "hover:opacity-60"}`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
            </button>
            <Link to="/collections/$slug" params={{ slug: "men" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale">MEN</Link>
            <Link to="/collections/$slug" params={{ slug: "women" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale">WOMEN</Link>
            <Link to="/collections/$slug" params={{ slug: "accessories" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale hidden lg:inline">ACCESSORIES</Link>
            <Link to="/collections/$slug" params={{ slug: "sneakers" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale hidden lg:inline">SNEAKERS</Link>
            <Link to="/shop?sort=new" className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale">NEW</Link>
            <Link to="/shop" search={{ q: undefined }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale">BEST SELLERS</Link>
            <div className="w-[1px] h-4 bg-black/20 mx-1 hidden lg:block" />
            {user ? (
              <Link to="/account" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase hover-scale">ACCOUNT</Link>
            ) : (
              <Link to="/login" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase hover-scale">LOGIN</Link>
            )}
            <Link to="/cart" className="text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale">CART</Link>
          </div>
```

This reorders the row to match the approved spec exactly: search icon
first (right after the logo, which sits outside this `<div>`), then
Men/Women/Accessories/Sneakers/New/Best Sellers, then Account/Login, then
Cart last (spec section 7: "Cart icon is retained, positioned after
Account" — the previous draft of this task had Cart before Account, which
was a mistake caught during self-review; this version is correct).

Notes on this replacement:
- `NEW` links to `/shop?sort=new` (the existing `shop.tsx` already supports
  a `sort` search param with a `"new"` value per its `Sort` type, so this
  reuses existing sort-by-newest behavior rather than inventing a new route).
- `BEST SELLERS` links to plain `/shop` with an empty `q` — **this is a
  placeholder link target, not a placeholder implementation**: there is no
  existing "/shop filtered to best-sellers-only" capability in `shop.tsx`
  today (its curated list lives only in `homeSections.bestSellers` for the
  homepage carousel). Wiring an actual best-sellers filter into `/shop` is
  extra scope beyond "rebuild the navbar" — flag this to the user as a
  follow-up decision (does `/shop` need a `?bestsellers=1` filter mode, or
  should this link go to `/#best-sellers` to jump to the homepage carousel
  instead?) rather than guessing silently.
- The `SHOP`, `LOOKBOOK`, `ABOUT`, `CONTACT`, `REWARDS` links and the theme
  toggle button are gone entirely, per the approved spec decision.
- Update the `lucide-react` import line (line 4) to drop `Trophy` (no longer
  used) if Task 2 hasn't already removed it while cleaning up `Sun`/`Moon`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev`, confirm the desktop navbar (viewport ≥ 640px) shows, in
order: Logo, search icon, then (at ≥1024px) Men/Women/Accessories/Sneakers/
New/Best Sellers, then Account, then Cart — no Shop/Lookbook/About/Contact/
Rewards/theme-toggle. At 640-1023px, Accessories and Sneakers are hidden
(existing `hidden lg:inline` pattern preserved) — confirm this matches intent
or flag if Accessories/Sneakers should always show regardless of viewport.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: rebuild desktop navbar with new nav structure"
```

---

### Task 12: Mobile menu — accordion rebuild

**Files:**
- Modify: `src/components/layout/Navbar.tsx:246-271`

**Interfaces:**
- Consumes: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`
  from `src/components/ui/accordion.tsx` (already exists, uses
  `@radix-ui/react-accordion`, already an installed dependency).

- [ ] **Step 1: Replace the mobile nav dropdown block**

Replace lines 246-271 (the `<AnimatePresence>{mobileNavOpen && (...)}` block
for the mobile dropdown — note this is a different `AnimatePresence` from
the search panel one above it, identified by its `sm:hidden` flex-col
container) with:

```tsx
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border px-4 pb-5 pt-2 sm:hidden overflow-hidden text-foreground bg-background"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="men">
                  <AccordionTrigger className="text-sm tracking-wide uppercase">MEN</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/shop" search={{ sort: "new" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">NEW ARRIVALS</Link>
                      <Link to="/shop" onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">BEST SELLERS</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="women">
                  <AccordionTrigger className="text-sm tracking-wide uppercase">WOMEN</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/shop" search={{ sort: "new" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">NEW ARRIVALS</Link>
                      <Link to="/shop" onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">BEST SELLERS</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="accessories">
                  <AccordionTrigger className="text-sm tracking-wide uppercase">ACCESSORIES</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/collections/$slug" params={{ slug: "rings" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">RINGS</Link>
                      <Link to="/collections/$slug" params={{ slug: "chains" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">CHAINS</Link>
                      <Link to="/collections/$slug" params={{ slug: "socks" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">SOCKS</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Link to="/collections/$slug" params={{ slug: "sneakers" }} onClick={() => setMobileNavOpen(false)} className="block py-4 text-sm tracking-wide uppercase border-b border-border">SNEAKERS</Link>
              {user ? (
                <Link to="/account" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm tracking-wide uppercase">ACCOUNT</Link>
              ) : (
                <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm tracking-wide uppercase">LOGIN</Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
```

Note: MEN and WOMEN's "NEW ARRIVALS"/"BEST SELLERS" sub-links point at
`/shop` with a sort param, same placeholder-target caveat as Task 11 Step 1
— these aren't gender-filtered yet because `shop.tsx` has no gender filter
UI today; that's additional scope to flag to the user (a real gender-scoped
"New Arrivals for Men" view would need either a `/shop?gender=men&sort=new`
mode added to `shop.tsx`, or dedicated routes) rather than something this
task should invent unprompted.

Add the import at the top of `Navbar.tsx`:
```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev`, resize the browser to a mobile width (< 640px), open the
hamburger menu, tap "MEN" — confirm it expands in place to reveal "NEW
ARRIVALS"/"BEST SELLERS" without navigating away, tap "WOMEN" — confirm MEN
collapses and WOMEN expands (single-open accordion behavior), tap
"ACCESSORIES" — confirm RINGS/CHAINS/SOCKS appear, tap "SNEAKERS" — confirm
it navigates directly to `/collections/sneakers` with no expand step.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: rebuild mobile nav as an accordion with gender/accessory subcategories"
```

---

## Follow-ups to flag to the user (not implemented here, surfaced during planning)

1. **"Best Sellers" and gender-scoped "New Arrivals"/"Best Sellers" nav
   links currently point at `/shop` with generic sort/no filter** — there is
   no existing gender-filter or best-sellers-only mode on the `/shop` page
   to link to precisely. Task 10 builds the correct data-layer helpers
   (`newArrivalsForGender`/`bestSellersForGender`), but wiring them into an
   actual filtered view requires either extending `shop.tsx` with a
   `gender`/`bestsellers` search-param mode, or building dedicated
   `/new-arrivals/$gender` and `/best-sellers/$gender` routes — this is a
   reasonable "next spec" rather than folded into this one.
2. Products currently tagged `Bottoms`/`Outerwear`/`Tops` (3 of the 10 live
   products) have no gender assignment after this migration and won't appear
   under Men/Women until an admin assigns them a category via Task 9's
   updated picker.
