# Studio Deny — Admin Panel Guide

A plain-language walkthrough of every screen in the admin panel, written for whoever is actually running the store day to day — not developers. If you just need to know "how do I change X," find the matching heading below and follow the steps.

**Getting in:** go to `/admin` (e.g. `studiodeny.com/admin`) and log in with an account that has the **admin** or **staff** role. If you land back on your account page instead of the dashboard, your account doesn't have admin access yet — someone with admin access needs to grant it in **Users** (see below).

The sidebar is split into two groups:
- **Top group** — running the store day to day (orders, products, customers, money).
- **CMS** — everything that controls what shoppers see on the website itself (homepage sections, popups, FAQs, etc.).

Every screen that edits something has its own **Save** button unless noted otherwise — changes don't go live until you click it, with the specific exceptions called out per section below (a handful of switches/toggles save instantly, and each one is flagged where that's the case).

---

## Store Operations

### Dashboard
Landing page after login. Shows total revenue, order count, product count, customer count, average order value, and your 8 most recent orders at a glance. Nothing to configure here — it's a summary of the other sections.

### Analytics
A deeper numbers view: net revenue (after refunds), gross revenue, AOV, total orders, unique customers, repeat buyers, low-stock count, sold-out count, a 7-day revenue bar chart, and your top 5 products by revenue. Read-only — nothing to edit.

### Products
Your full product catalog.
1. **PRODUCTS** tab lists everything — filter by category tab across the top, or search by name/slug.
2. Each row shows price, live stock, and whether it's **LIVE ON SITE** or **HIDDEN**.
3. Click the eye icon to hide/show a product instantly (hiding removes it from shop, collections, and homepage everywhere immediately — no separate save needed, it asks you to confirm first).
4. Click the pencil to edit a product, or **NEW PRODUCT** to add one.

**Editing/adding a product** — one long form:
- Name, slug (auto-generated from the name if you leave it blank), category, brand, badge (NEW DROP / LAST PIECE / SALE / SOLD OUT), Best Seller flag.
- Price, compare-at price (the "was" price shown crossed out), base stock.
- Main image, hover image (shown on mouse-over in the shop grid), and up to 8 gallery photos/videos for the product page — each gallery item can be FULL PICTURE (edge to edge) or HALF PICTURE (pairs with the next half picture, side by side).
- Sizes available (only used if you don't set up Variants below).
- Description, material composition, material care instructions.
- Click **SAVE PRODUCT** at the bottom.

**Variants** (bottom of the edit page, only after the product itself is saved): if a product needs per-size (and optionally per-color) stock tracking or per-size pricing, add variants here — size, color, stock, price override, compare-at override, and an internal SKU (never shown to customers). **If any variants exist for a product, the storefront uses them instead of the flat size list/stock above.**

### Inventory
A flat, single table of every product/size/color combination across the whole store, sorted lowest stock first — the fastest way to spot what's about to sell out.
- Filter by ALL / LOW STOCK / OUT OF STOCK, search by name, or filter by category.
- Click into the stock number, type a new value, press Enter (or click away) — it saves immediately, no separate Save button.
- Click the pencil on the right to jump to that product's full edit page.

### Catalog
Manages **Categories** and **Brands** — the two dropdown lists used everywhere else (product forms, shop filters, mega menu).
- Add a category or brand by typing a name and clicking ADD.
- Categories can be nested one level deep — pick a parent from the dropdown above the list, or leave it as "Top level."
- Click the pencil to rename, trash to delete (categories/brands in use by products aren't blocked from deletion — check nothing depends on it first).

### Sizes
Defines which size options are available per category (e.g. S/M/L/XL for tops, 6/7/8/9/10 for shoes) — this is the list the product form and variant editor pick from, instead of typing sizes by hand each time.
1. Pick a category from the dropdown.
2. Type a new size label, click ADD (or press Enter).
3. Reorder with the up/down arrows, delete with the trash icon.

### Orders
Every order placed on the site.
- Change an order's status via the dropdown in its row (PLACED → PACKED → SHIPPED → DELIVERED, or CANCELLED/REFUNDED) — **saves instantly**, no Save button.
- Once an order is **PACKED**, a **CREATE SHIPMENT** button appears — this books the courier pickup through Shiprocket automatically and assigns a tracking number (AWB). Once shipped, the AWB and courier name show directly in the row.
- **INVOICE** link opens that order's invoice for editing (see Invoices below).
- **REFUND** issues a refund for the full order total (asks for confirmation first) and marks the order REFUNDED.
- This page live-updates — if a courier scans the parcel (e.g. marks it delivered), you'll see the status change here without refreshing.

### Invoices
A simple list of every order's invoice number, linking to the invoice editor.

### Invoice Template
**One shared template used for every invoice, admin and customer-facing.** Set your brand name, tagline, GSTIN, contact email/phone, address, header accent color, terms & conditions text, footer text, and the signatory name/tax label shown at the bottom of every invoice. A live preview updates as you type. Click **SAVE TEMPLATE**.

*(This used to be a per-browser setting that silently never reached real customers — it's a shared setting now, so whatever you set here is what every customer actually sees on their invoice.)*

To edit one specific order's invoice numbers/line items instead of the shared template, use the **Invoices** list above → click into an order.

### Editing one invoice
From Invoices or Orders, click into a specific order's invoice to adjust its invoice number, status, shipping/tax/discount amounts, add extra line items (e.g. a manual adjustment), or add notes. The totals recalculate live as you type. Click **SAVE INVOICE**.

### Refunds & Cancellations
A dashboard of refund activity: how many orders are refunded, how many cancelled, and total ₹ refunded to date. Three lists:
- **Eligible for refund** — any order not already refunded/cancelled; click REFUND to process one (asks to confirm the amount first).
- **Refunded** — history.
- **Cancelled** — orders a customer cancelled themselves; you can still issue a refund from here if needed.

### Returns
Tracks the full return lifecycle after a customer requests one from their order page:
- **Ready to refund or replace** — the returned parcel has arrived back at your warehouse. From here you can either **REFUND** it, or **SEND REPLACEMENT** (creates a brand-new order with the same items/address and books a courier pickup automatically — the original stays on record as REPLACED, and the customer's order page shows a link to the new replacement order).
- **In progress** — still with the courier; a TRACK link is shown once available.
- **Replaced** / **Refunded** — history.

### Customers
One row per unique customer email: total orders, lifetime spend, loyalty points, current tier, and their most recent order date. Sorted highest spender first. Read-only overview — no editing here (change roles in **Users**, see below).

### Loyalty
Dashboard of your loyalty program: total members, total points issued, redeemable value, a tier distribution chart (ROOKIE/RUNNER/RIOT/LEGEND), and a table of your top members by points. Shows the entry threshold and points economy at the top (read-only summary — to actually change those numbers, go to **Settings → Loyalty**, described below).

### Export
Download raw data as CSV or JSON — useful for backups, accounting, or handing data to another tool.
- Quick exports for Orders, Products, Customers, or a full database backup (every table at once).
- Or scroll down and export any individual table one at a time (every table in the database, with a live row count for each).

### Settings
Five tabs bundled into one page:

**Loyalty tab** — the per-tier discount percentages (ROOKIE/RUNNER/RIOT/LEGEND), the minimum single-order value to enter the loyalty pool, how many ₹ spent earns 1 point, and how much each point is worth when redeemed. A live preview shows the math as you type. Click **SAVE SETTINGS**.

**Brand tab** — site name, tagline, logo, favicon, default social-share image, Instagram/YouTube/WhatsApp links, contact email/phone/address, and whether the homepage "Contact Support" section is shown at all plus its support hours. Click **SAVE BRAND SETTINGS**.

**Theme tab** — accent color, display/UI font family names, corner rounding (sharp/subtle/small/medium/large), whether animations are enabled site-wide, and a raw custom-CSS box for advanced overrides. Click **SAVE THEME SETTINGS**.

**Shop tab** — the free-shipping threshold (the actual ₹ amount checkout and the cart page/drawer both use), and a curated list of color swatches for the shop page's color filter (leave empty to auto-generate from whatever colors your live products use). Click **SAVE SETTINGS**.

**COD tab** — whether Cash on Delivery is offered at all, what percentage of the order must be paid up front as an advance, and the minimum order value COD is available for. Click **SAVE COD SETTINGS** (button below the visible area, same pattern as the other tabs).

---

## Website Content (CMS)

### Announcements
The scrolling ticker bar at the very top of every page.
1. **NEW BAR** to create one, or the pencil icon to edit an existing message, its optional CTA link/label, background & text color, and an optional scheduled start/end date.
2. **Important**: a bar only appears on the live site once its status shows **ACTIVE** — click the status pill to toggle it (saves instantly). A message that's INACTIVE is invisible on the site no matter what it says — if the ticker looks unchanged after an edit, check this first.
3. Reorder with the up/down arrows (saves instantly).
4. Each active message renders in its own color (the background/text color you picked) as a small pill in the ticker — so different messages can have different colors side by side.
5. If **zero** bars are active, the ticker falls back to built-in placeholder text ("FREE SHIPPING ON ORDERS ABOVE ₹999" etc.) rather than showing nothing — that's a deliberate fallback, not a bug, but it means an all-inactive ticker won't look "broken," just generic.

### Sections
Controls which sections appear on the homepage, in what order, and their content — the hero slider, marquee, gender split, category carousel, popular now, why us, lookbook teaser, new arrivals, fabric tabs, DenySpace, influencer picks, motion picture, community, contact support, testimonials, newsletter, and FAQ teaser.
1. Reorder with the up/down arrows (saves instantly), or click **RESET ORDER TO DEFAULT** to snap everything back to the original layout (only touches order — content, visibility, and headings are untouched).
2. Toggle **VISIBLE/HIDDEN** per section (saves instantly) — some sections are **LOCKED** and can't be hidden or deleted (core sections the site depends on).
3. Click the pencil to edit that section's actual content — the fields shown depend entirely on which section type it is (e.g. the hero editor lets you add/reorder/remove slides with their own image, headline, and buttons; the marquee editor is a plain list of ticker phrases; category carousel lets you build slides linking to collections; etc.). Click **SAVE CHANGES** inside that editor.
4. A few sections point you elsewhere for part of their content — e.g. "the heading is managed on the Headings page," or "FAQ items are managed on the FAQ page" — those notes appear right inside the editor for that section.

### Mega Menu
Builds the dropdown that opens when a shopper hovers WOMEN, MEN, etc. in the navbar. Nothing here is free-typed — everything is picked from categories and products that already exist elsewhere.
1. **Step 1 — Navbar tabs**: each tab is one of your existing categories. Click **ADD TAB**, drag to reorder, uncheck **SHOWN** to hide a tab without deleting it, click **SAVE**.
2. Click **MANAGE** (or the tab's name button) on a tab to work on what's inside its dropdown:
   - **Step 2 — Links**: the plain-text links stacked down the left side of that dropdown — pick any category (doesn't have to be a child of the tab). Drag to reorder, uncheck to hide, **SAVE VISIBILITY**.
   - **Step 3 — Featured products**: up to 2 product tiles shown next to the links — search and add by name, drag to reorder, trash to remove (saves instantly).
3. The **live preview** panel on the right always shows exactly what shoppers will see for whichever tab you're currently managing.

### Footer Links
Manages the link columns in the site footer. Links are grouped into columns by a "group" name — give two links the same group name and they land in the same column; a new group name creates a whole new column.
1. **ADD ITEM** to add a link, pencil to edit its label/URL/group, trash to remove, up/down arrows to reorder.
2. Click **SAVE MENU** when done — nothing here saves until you do.

### FAQ
Standard FAQ management.
1. **NEW ITEM** or pencil to edit a question/answer, assign it a category (general/orders/shipping/returns/sizing), toggle active/inactive.
2. Filter the list by category using the tabs.
3. Reorder within a category with the up/down arrows (saves instantly); toggle ACTIVE/INACTIVE (saves instantly). Modal edits need **SAVE**.

### Testimonials
Customer reviews shown in the testimonials section.
1. **NEW** or pencil to edit: name, role/title, review body, star rating (click a star), and an optional avatar photo.
2. Reorder and toggle active/inactive instantly from the list; modal edits need **SAVE**.

### Influencers
Manages influencer/creator content — either an uploaded video (plays on hover in the grid) or a pasted Instagram/YouTube reel link (opens on click), plus an optional quote and thumbnail.
1. **NEW** to add, pencil to edit.
2. **Save the pick first**, then a "TAGGED PRODUCTS" section appears at the bottom of the same modal — search and tag every product actually worn/featured in that video, so it links out correctly.
3. Reorder/toggle active from the list instantly; the modal itself needs **SAVE**.

### Look Book
The homepage lookbook carousel — each card is a photo/video plus the one product it links to.
1. **NEW CARD** or pencil to edit: upload/paste the photo or video, then **pick the product** this card should link to (required — a card can't be saved without one).
2. Reorder and toggle active/inactive instantly from the list.

### Community
The "Worn By Our Community" bento grid. **The grid layout itself is fixed** — exactly 7 photo slots, each a fixed shape (one large hero tile, one tall tile, one wide banner tile, and four standard square tiles) — so there is nothing to "add," only which photo goes in which position.
1. A small preview at the top of the page shows exactly this layout, live, matching the real homepage section.
2. Reorder photos with the ◀ ▶ arrows on each card — **this is what actually controls which shape a photo gets** (position 1 = the hero, position 2 = the tall tile, and so on, matching the preview).
3. Replace a card's photo/video directly on that card (upload or paste a new URL), edit its optional @handle.
4. Click **SAVE CHANGES** at the bottom once you're done — nothing here writes until you save.
5. There's no "add" button — the slot count is fixed by the layout, not something you configure. Delete + re-add through Media if you ever need a genuinely different photo in a slot beyond just replacing it in place.

### Headings
Every major section heading site-wide, in one place — rename or recolor without touching any other page. Pick a section from the dropdown, edit its eyebrow (small label above), heading text, subtitle, and optional text color override (RESET TO THEME to clear a color override), click **SAVE** for that section.

### Preloader
The full-screen loading animation every visitor sees on first load.
1. **Backdrop**: choose IMAGE, VIDEO, or COLOUR (a plain solid background) via the toggle.
2. **What glitches**: either an uploaded logo/image, or plain text with its own color.
3. Click **SAVE**. The glitch animation itself is fixed — this only controls the backdrop and the content that glitches.

### Popup
The loyalty signup popup shown to visitors after a delay.
1. Toggle **ENABLED**, set the delay in seconds before it appears.
2. Background: none / image / video, plus an optional logo.
3. Badge text, two-line headline, body text.
4. The "rule row" (Unlock/Earn/Redeem) — pick an icon and label for each; the actual ₹ numbers shown come from **Settings → Loyalty**, not from here.
5. Tier labels (4 of them), and the two button texts/links.
6. Click **SAVE**.

### Media
A shared media library for anything uploaded across the whole admin panel.
1. **UPLOAD** to add images/videos (multiple at once) — every upload lands here automatically regardless of which admin page it was uploaded from.
2. Search by filename or alt text, filter by folder.
3. Click any asset to see its details, edit alt text (accessibility/SEO description), **COPY URL** to paste it elsewhere manually, or **DELETE** (permanent).

### SEO
Meta tags and social-sharing data, per page.
1. Pick a page from the tab row (home, shop, about, each collection, etc.).
2. Set the browser-tab/search-result title, meta description, canonical URL, and whether to hide it from search engines entirely (NO INDEX).
3. Open Graph section: title/description overrides for social shares (falls back to the fields above if left blank), plus a 1200×630 share image with a live preview.
4. Click **SAVE SEO SETTINGS** — this only saves the page you currently have selected.

### WhatsApp
Five tabs:
- **Templates** — every message template registered with Meta. Body text and approval status are pulled live from Meta (editing them here has no effect — Meta always sends its own approved copy). **SYNC FROM META** pulls the latest. Toggle **ACTIVE** to control whether that template is ever queued at all (saves instantly).
- **Queue** — pending/sent/failed outgoing messages. Click the retry icon on a failed message to requeue it.
- **Logs** — a history of everything actually sent, filterable by date range.
- **Campaigns** — one-off bulk sends. **NEW CAMPAIGN**, pick a template and target segment (all customers, a specific loyalty tier, or abandoned-cart shoppers), optionally schedule it, create it as a draft.
- **Usage** — how many messages have actually been sent, this month and all-time. Enter your own known per-message rate (from Meta's own WhatsApp Manager billing) to see an estimated cost — this app has no way to know your real rate automatically.

### Users
Every registered account, with search by name/email.
- Change anyone's role via the dropdown in their row: **admin** (full access), **staff** (same CMS/content access, no separate restriction currently enforced beyond the role label), or **customer** (no admin access). **Saves instantly** — no confirmation prompt, so double-check before changing someone's role, especially granting admin.

---

## Quick reference — what saves instantly vs. needs a Save button

**Saves instantly (no Save button, takes effect immediately):**
Toggling ACTIVE/INACTIVE or VISIBLE/HIDDEN anywhere, reorder arrows anywhere, deleting anything, product hide/show, order status changes, inventory stock edits, user role changes, WhatsApp queue retry.

**Needs an explicit Save/Save Changes button:**
Every content-editing form/modal — announcements, testimonials, FAQ items, products, section content editors, invoice template, all Settings tabs, headings, preloader, popup, SEO, mega menu tabs/links/products, community CMS photo edits, look book cards, influencer picks.

When in doubt: if you typed into a text field, color picker, or dropdown inside a form/modal, look for a Save button before leaving the page. If you clicked a switch, toggle, or arrow directly in a list, it already saved.
