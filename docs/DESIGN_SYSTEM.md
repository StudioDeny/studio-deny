# STUDIO DENY — Design Requirements

Extracted from the live codebase (`src/styles.css`, `src/components/ui/*`) so this look can be reproduced in other projects. This is a **sharp-edged streetwear/editorial** aesthetic — flat, high-contrast, no decoration for decoration's sake.

---

## 1. Design Philosophy

- **Sharp, not soft.** Square corners everywhere except pills/dots (progress bars, avatars, toggles). No `rounded-lg`/`rounded-xl` on real UI — those only exist in the unused shadcn scaffolding defaults.
- **Flat, no depth effects.** No drop shadows, no glassmorphism, no gradients on surfaces. Depth comes from borders and contrast, not blur/shadow.
- **Editorial type as a graphic element.** Big condensed display headings, tiny tracked-out mono labels. The contrast between the two *is* the visual language.
- **Motion is a signature, not garnish.** Every reveal uses the same easing curve so the whole product feels like one hand built it.

---

## 2. Color

Defined as CSS custom properties in `:root`, mapped into Tailwind v4 `@theme inline` tokens.

| Token | Hex / Value | Usage |
|---|---|---|
| `--background` | `#E2E2E4` | Page background — warm light grey, never pure white |
| `--foreground` | `#111111` | Primary text, near-black (not pure `#000`) |
| `--surface` | `#D5D5D8` | Secondary surface, one step darker than background (image placeholders, panels) |
| `--primary` | `#111111` | Same as foreground — dark fills, solid buttons |
| `--primary-foreground` | `#E2E2E4` | Text/icons on primary fills |
| `--secondary` | `#D5D5D8` | Secondary fills |
| `--secondary-foreground` | `#111111` | Text on secondary |
| `--muted` | `#C7C7C3` | Disabled/subdued fills |
| `--muted-foreground` | `#4A4844` | Subdued text (captions, helper text) |
| `--border` | `rgba(0,0,0,0.18)` | All borders — a translucent black, never a flat grey hex |
| `--accent` | `#E0202A` | The **one** brand color — red. Used sparingly: badges, active states, CTAs that need to pop |
| `--accent-foreground` | `#FFFFFF` | Text on accent |

**Rules:**
- No purple, no gradients, no glassmorphism.
- `--border` is always a black-alpha overlay, not a solid color — it adapts naturally over any surface tone.
- Accent red is a single deliberate color, not a full accent scale. Don't introduce a second brand hue.
- Dark/black surfaces (heroes, footers) use raw white-alpha values (`rgba(255,255,255,0.1–0.4)`) rather than a separate dark-mode token set — this app is light-only (`color-scheme: light` is hardcoded).

---

## 3. Typography

```css
--font-display: 'Anton', 'Bebas Neue', system-ui, sans-serif;
--font-body:    'Barlow', system-ui, sans-serif;
--font-mono:    'Barlow', system-ui, sans-serif;   /* not a real monospace — see below */
```

Loaded via Google Fonts: `Anton`, `Bebas Neue`, `Barlow` (weights 300/400/500/600, italics 300/400).

| Role | Font | Where |
|---|---|---|
| Display / headings | Anton (fallback Bebas Neue) | All `h1–h6` by default. Condensed, ultra-bold poster type. `font-weight: 400`, `letter-spacing: 0.01em`. Set via `.text-display` utility for non-heading elements. |
| Body copy | Barlow | Paragraphs, UI text |
| "Mono" labels | Barlow (via `.text-mono`) | **Not a real monospace font** — it's Barlow set with wide tracking to *read* as a technical/label typeface |

**Signature pattern — the tracked-out label:**
```
text-mono text-[10px] tracking-widest uppercase   /* small labels, section tags, form labels */
text-mono text-xs sm:text-sm tracking-[0.14em] uppercase   /* button labels */
```
Nearly every button, badge, section tag, and eyebrow label in the app is: small size + wide letter-spacing + uppercase + Barlow. This pairing against huge Anton headlines is the core typographic contrast that defines the brand.

Headings and CTAs are almost always typed in ALL CAPS with a trailing period (e.g. `GUIDE.`, `SAVE.`) as a stylistic full stop.

---

## 4. Shape & Borders

- **Border radius: none, by default.** Real feature components use plain `border` with square corners. The only rounded elements are:
  - Pills/dots: `rounded-full` (progress dots, avatars, toggle switches, small status dots)
  - A few small internal chips: `rounded-sm` at most (admin-only illustrative UI)
- Borders are `1px solid var(--border)` — i.e., black at 18% opacity, not a flat grey.
- No `rounded-md`/`rounded-lg`/`rounded-xl`/`shadow` on cards, buttons, or inputs in actual product UI (these exist only in the untouched shadcn primitive defaults in `components/ui/button.tsx`, `card.tsx`, `badge.tsx` — treat those as legacy scaffolding, not the design language).

---

## 5. Elevation & Effects

- **No box-shadow depth system.** Elevation is expressed with borders and background-tone steps (`background` → `surface` → `muted`), not shadows.
- A `glow-*` utility set exists (`glow-primary`, `glow-primary-sm`, `glow-lime`, `text-glow-primary`) for **selective emphasis only** — soft white/lime glows on hover for a small set of CTA buttons. Not a general-purpose shadow system; don't apply broadly.
- Scrollbars are custom everywhere: 4–6px thin track, `border`-colored thumb, darkens on hover.

---

## 6. Motion

Single shared easing curve used for essentially every custom transition:

```
cubic-bezier(0.16, 1, 0.3, 1)   /* "STRONG_EASE" — punchy start, smooth luxury settle */
```

Named patterns (all respect `prefers-reduced-motion`):

| Pattern | Effect |
|---|---|
| **Editorial reveal** (`EditorialHeading`/`Subheading`/`Paragraph`) | Line/word masked in an `overflow-hidden` wrapper, translates from `~110–120%` Y to `0`, fades in, 650–850ms, staggered per line/word |
| **Image reveal** (`.img-editorial-reveal`) | Fade + scale `1.05 → 1`, 700ms |
| **Button shimmer** (`.btn-shimmer`) | Diagonal light sweep across solid buttons on hover, 650ms |
| **Fill-sweep button** (`.btn-fill`) | Border/ghost button whose background scales in from the left on hover while the label clip-swaps so text stays legible |
| **Nav underline** (`.editorial-nav-link`) | 1.5px underline scales in from `currentColor`, origin flips left/right on enter/exit |
| **Icon nudge** | Inline SVG icons in buttons/links shift `translateX(3px)` on hover, 200ms |
| **Hover scale** (`.hover-scale`) | `scale(1.02)` on hover, 200ms ease |

Standard button interaction: `active:scale-[0.98]` on press.

---

## 7. Layout

- **Content max-widths:** `1560px` is the standard section container (`max-w-[1560px] mx-auto`); some pages use `1400px`–`1700px` depending on density. Never full-bleed body text.
- **Section gutters:** `px-4` mobile → `sm:px-8` → `lg:px-16`.
- **Section vertical rhythm:** `py-12` mobile → `md:py-16` for major sections.
- **Fixed topbar height** as a CSS var so layout can offset against it:
  ```css
  --topbar-h: 132px;            /* mobile */
  @media (min-width:640px) { --topbar-h: 160px; }
  ```

---

## 8. Component Conventions

- **Buttons:** square, border-defined (outline) or solid-fill, ALL CAPS tracked label, icon (if any) trailing with the nudge-on-hover animation. Two tones: `dark` (foreground border/fill on light backgrounds) and `light` (white border/fill on dark/image backgrounds) — see `FillLink`.
- **Badges/status pills:** tiny, tracked, uppercase, mono. Small dot indicators use `rounded-full` + solid color (e.g. emerald for "active").
- **Cards/panels:** `border border-border` + one background-tone step (`bg-surface` or `bg-background`), flat, square corners, generous padding (`p-5`/`p-6`).
- **Section labels/eyebrows:** tiny tracked mono text in `--accent` or `--muted-foreground` above a big Anton headline.
- **Image containers:** fixed aspect ratio (commonly `3/4` for product cards), `overflow-hidden`, background = `--surface` as a placeholder tone, hover crossfades between images rather than zoom.

---

## 9. What NOT to Carry Over

- The default shadcn primitive styling in `components/ui/{button,card,badge}.tsx` (rounded corners, `shadow`/`shadow-sm`) — those are library defaults never restyled to match the rest of the app. Don't treat them as canonical; restyle them to match §4/§5 when reusing this system.
- No dark mode is implemented (`color-scheme: light` is fixed) — if a new project needs dark mode, it must be designed fresh, not inherited.

---

## 10. Quick-Reference Token Block

Drop this into a new project's global stylesheet as a starting point:

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');

@theme inline {
  --font-display: 'Anton', 'Bebas Neue', system-ui, sans-serif;
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

:root {
  color-scheme: light;
  --background: #E2E2E4;
  --foreground: #111111;
  --surface: #D5D5D8;
  --primary: #111111;
  --primary-foreground: #E2E2E4;
  --secondary: #D5D5D8;
  --secondary-foreground: #111111;
  --muted: #C7C7C3;
  --muted-foreground: #4A4844;
  --border: rgba(0, 0, 0, 0.18);
  --accent: #E0202A;
  --accent-foreground: #FFFFFF;
}
```

Swap `--accent` for a new brand's color and everything else (type pairing, square shapes, motion curve) carries unchanged.
