// Structured source for the in-app admin guide (/admin/guide). Mirrors
// ADMIN-GUIDE.md at the repo root, broken into discrete steps instead of
// prose — that file is for handing to someone outside the app (or reading
// on GitHub); this one drives the dropdown-driven UI in the panel itself.
// Keep both in sync when a section's actual behavior changes.

export type GuideEntry = {
  key: string;
  label: string;
  group: "Store Operations" | "Website Content (CMS)";
  path: string;
  summary: string;
  steps: string[];
  notes?: string[];
};

export const ADMIN_GUIDE: GuideEntry[] = [
  // ── Store Operations ──────────────────────────────────────
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Store Operations",
    path: "/admin",
    summary: "The landing page after login — a summary of revenue, orders, products, and customers.",
    steps: [
      "Nothing to configure — this page just displays totals pulled from Orders and Products.",
      "Check REVENUE, ORDERS, PRODUCTS, CUSTOMERS, and AVG ORDER VALUE at a glance.",
      "Scroll down to RECENT ORDERS for your 8 most recent orders, with a live status badge on each.",
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    group: "Store Operations",
    path: "/admin/analytics",
    summary: "A deeper numbers view — read-only, nothing to edit.",
    steps: [
      "Top row of cards: net revenue (after refunds), gross revenue, AOV, total orders, customers, repeat buyers, low stock count, sold out count.",
      "REVENUE · LAST 7 DAYS shows a daily bar chart.",
      "TOP PRODUCTS lists your 5 best sellers by revenue.",
    ],
  },
  {
    key: "products",
    label: "Products",
    group: "Store Operations",
    path: "/admin/products",
    summary: "Your full catalog — add, edit, hide, and manage per-size/color variants.",
    steps: [
      "Filter by category tab across the top, or search by name/slug.",
      "Click the eye icon on any row to hide/show it instantly on the storefront (asks to confirm first).",
      "Click the pencil to edit a product, or NEW PRODUCT to add one.",
      "Fill in name, slug (auto-fills from name), category, brand, badge, price, compare-at price, stock, main/hover image, and up to 8 gallery photos/videos.",
      "Pick available sizes (only used if no Variants exist below).",
      "Click SAVE PRODUCT.",
      "Scroll to VARIANTS to add per-size (and optional per-color) stock and price overrides — if any variants exist, the storefront uses them instead of the flat size list.",
    ],
    notes: [
      "If variants exist for a product, they completely override the sizes/stock set on the product form itself.",
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    group: "Store Operations",
    path: "/admin/inventory",
    summary: "Every product/size/color combination in one flat list, sorted lowest stock first.",
    steps: [
      "Filter by ALL / LOW STOCK / OUT OF STOCK, search by name, or filter by category.",
      "Click into a stock number, type a new value, press Enter or click away — saves immediately.",
      "Click the pencil on the right to jump to that product's full edit page.",
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    group: "Store Operations",
    path: "/admin/catalog",
    summary: "Manages Categories and Brands — the dropdown lists used everywhere else.",
    steps: [
      "Type a name and click ADD to create a category or brand.",
      "Categories can nest one level deep — pick a parent above the list, or leave it as Top level.",
      "Click the pencil to rename, trash to delete.",
    ],
    notes: ["Deleting a category/brand doesn't check whether products still reference it — check first."],
  },
  {
    key: "sizes",
    label: "Sizes",
    group: "Store Operations",
    path: "/admin/sizes",
    summary: "Defines which size labels exist per category — what the product form and variant editor pick from.",
    steps: [
      "Pick a category from the dropdown.",
      "Type a new size label (e.g. S, M, L, or 6, 7, 8), click ADD or press Enter.",
      "Reorder with the up/down arrows, delete with the trash icon — both save instantly.",
    ],
  },
  {
    key: "orders",
    label: "Orders",
    group: "Store Operations",
    path: "/admin/orders",
    summary: "Every order placed on the site — status, shipping, invoices, refunds.",
    steps: [
      "Change status via the dropdown in a row (PLACED → PACKED → SHIPPED → DELIVERED, or CANCELLED/REFUNDED) — saves instantly.",
      "Once an order is PACKED, click CREATE SHIPMENT to book the courier pickup and assign a tracking number automatically.",
      "Click INVOICE to open that order's invoice for editing.",
      "Click REFUND to issue a full refund (asks to confirm first) — marks the order REFUNDED.",
    ],
    notes: ["This page live-updates when a courier scans the parcel — no refresh needed."],
  },
  {
    key: "invoices",
    label: "Invoices",
    group: "Store Operations",
    path: "/admin/invoices",
    summary: "A list of every order's invoice, linking to the per-order invoice editor.",
    steps: ["Click EDIT on any row to open that order's invoice."],
  },
  {
    key: "invoice-template",
    label: "Invoice Template",
    group: "Store Operations",
    path: "/admin/invoice-template",
    summary: "The one shared template used on every invoice, admin and customer-facing.",
    steps: [
      "Set brand name, tagline, GSTIN, contact email/phone, address.",
      "Set the header accent color, terms & conditions text, footer text, signatory name, and tax label.",
      "Watch the live preview update as you type.",
      "Click SAVE TEMPLATE.",
    ],
    notes: ["This is shared and real — whatever you set here is exactly what customers see on their own invoice."],
  },
  {
    key: "refunds",
    label: "Refunds & Cancellations",
    group: "Store Operations",
    path: "/admin/refunds",
    summary: "Dashboard of refund activity plus quick actions.",
    steps: [
      "ELIGIBLE FOR REFUND lists any order not already refunded/cancelled — click REFUND, confirm the amount.",
      "REFUNDED and CANCELLED sections below are history — a cancelled order can still be refunded from here.",
    ],
  },
  {
    key: "returns",
    label: "Returns",
    group: "Store Operations",
    path: "/admin/returns",
    summary: "Tracks the full return lifecycle after a customer requests one.",
    steps: [
      "READY TO REFUND OR REPLACE — the parcel is back at your warehouse. Click REFUND, or SEND REPLACEMENT to create a new order with the same items and auto-book a courier pickup.",
      "IN PROGRESS — still with the courier; click TRACK if available.",
      "REPLACED / REFUNDED sections are history.",
    ],
  },
  {
    key: "customers",
    label: "Customers",
    group: "Store Operations",
    path: "/admin/customers",
    summary: "Read-only overview — one row per customer email, spend, points, and tier.",
    steps: [
      "Sorted highest spender first.",
      "To change someone's role (admin/staff/customer), go to Users instead.",
    ],
  },
  {
    key: "loyalty",
    label: "Loyalty",
    group: "Store Operations",
    path: "/admin/loyalty",
    summary: "Dashboard of your loyalty program — members, points issued, tier distribution, top members.",
    steps: [
      "Everything here is read-only.",
      "To actually change the discount %, entry threshold, or points economy, go to Settings → Loyalty tab.",
    ],
  },
  {
    key: "export",
    label: "Export",
    group: "Store Operations",
    path: "/admin/export",
    summary: "Download raw data as CSV or JSON for backups, accounting, or another tool.",
    steps: [
      "Use the quick-export cards for Orders, Products, Customers, or a full database backup.",
      "Or scroll to ALL TABLES to export any individual table with a live row count.",
    ],
  },
  {
    key: "settings",
    label: "Settings",
    group: "Store Operations",
    path: "/admin/settings",
    summary: "Five tabs: Loyalty, Brand, Theme, Shop, and COD — pick a tab, edit, save that tab.",
    steps: [
      "LOYALTY tab — per-tier discount %, entry threshold, points economy. SAVE SETTINGS.",
      "BRAND tab — site name, tagline, logo, favicon, social links, contact info, homepage support section. SAVE BRAND SETTINGS.",
      "THEME tab — accent color, fonts, corner rounding, animations toggle, custom CSS. SAVE THEME SETTINGS.",
      "SHOP tab — free-shipping threshold, curated shop-filter color swatches. SAVE SETTINGS.",
      "COD tab — enable/disable Cash on Delivery, advance percentage, minimum order value. SAVE COD SETTINGS.",
    ],
    notes: ["Each tab has its own Save button — saving one tab does not save the others."],
  },

  // ── Website Content (CMS) ─────────────────────────────────
  {
    key: "announcements",
    label: "Announcements",
    group: "Website Content (CMS)",
    path: "/admin/announcements",
    summary: "The scrolling ticker bar at the very top of every page.",
    steps: [
      "Click NEW BAR, or the pencil to edit: message, optional CTA link/label, background & text color, optional schedule window.",
      "Click the STATUS pill to toggle ACTIVE/INACTIVE — saves instantly.",
      "Reorder with the up/down arrows — saves instantly.",
    ],
    notes: [
      "A bar only shows on the live site once it's ACTIVE — editing the text alone does nothing if it's still inactive.",
      "Each active message shows in its own color as a pill in the ticker.",
      "If zero bars are active, the ticker falls back to built-in placeholder text rather than showing nothing.",
    ],
  },
  {
    key: "website-sections",
    label: "Sections",
    group: "Website Content (CMS)",
    path: "/admin/website-sections",
    summary: "Controls which homepage sections appear, in what order, and their content.",
    steps: [
      "Reorder with the up/down arrows (saves instantly), or click RESET ORDER TO DEFAULT to restore the original layout (order only — content/visibility/headings untouched).",
      "Toggle VISIBLE/HIDDEN per row — saves instantly. Locked sections can't be hidden or deleted.",
      "Click the pencil to edit that section's actual content — fields differ per section type (hero slides, marquee text, category carousel slides, etc.).",
      "Click SAVE CHANGES inside the editor.",
    ],
    notes: ["Some sections point you elsewhere for part of their content — e.g. headings live on the Headings page, FAQ items on the FAQ page."],
  },
  {
    key: "mega-menu",
    label: "Mega Menu",
    group: "Website Content (CMS)",
    path: "/admin/mega-menu",
    summary: "Builds the dropdown that opens when a shopper hovers WOMEN, MEN, etc. in the navbar.",
    steps: [
      "STEP 1 — add/reorder/hide navbar tabs (each is an existing category). SAVE.",
      "Click MANAGE on a tab to work on its dropdown.",
      "STEP 2 — add/reorder/hide the plain-text links down the left side. SAVE VISIBILITY.",
      "STEP 3 — search and add up to 2 featured product tiles, drag to reorder.",
    ],
    notes: ["The live preview on the right always shows exactly what shoppers see for the tab you're currently managing."],
  },
  {
    key: "navigation",
    label: "Footer Links",
    group: "Website Content (CMS)",
    path: "/admin/navigation",
    summary: "Manages the link columns in the site footer.",
    steps: [
      "Click ADD ITEM, then the pencil to set its label, URL, and group name (links sharing a group land in the same column).",
      "Reorder with the up/down arrows.",
      "Click SAVE MENU — nothing here saves until you do.",
    ],
  },
  {
    key: "faq",
    label: "FAQ",
    group: "Website Content (CMS)",
    path: "/admin/faq",
    summary: "Standard question/answer management, grouped by category.",
    steps: [
      "Click NEW ITEM or the pencil: question, answer, category (general/orders/shipping/returns/sizing), active toggle.",
      "Filter the list by category using the tabs above the table.",
      "Reorder and toggle active/inactive instantly from the list; modal edits need SAVE.",
    ],
  },
  {
    key: "testimonials",
    label: "Testimonials",
    group: "Website Content (CMS)",
    path: "/admin/testimonials",
    summary: "Customer reviews shown in the testimonials section.",
    steps: [
      "Click NEW or the pencil: name, role/title, review body, star rating, optional avatar photo.",
      "Reorder and toggle active/inactive instantly from the list; modal edits need SAVE.",
    ],
  },
  {
    key: "influencer-picks",
    label: "Influencers",
    group: "Website Content (CMS)",
    path: "/admin/influencer-picks",
    summary: "Influencer/creator content — an uploaded video or a pasted reel link, plus tagged products.",
    steps: [
      "Click NEW: name, handle, optional quote, then either upload a video file or paste an Instagram/YouTube reel link.",
      "Add a thumbnail, then click SAVE.",
      "Once saved, a TAGGED PRODUCTS section appears in the same modal — search and tag every product featured in it.",
    ],
    notes: ["Product tagging only becomes available after the pick itself is saved once."],
  },
  {
    key: "lookbook-cms",
    label: "Look Book",
    group: "Website Content (CMS)",
    path: "/admin/lookbook-cms",
    summary: "The homepage lookbook carousel — each card is a photo/video linked to one product.",
    steps: [
      "Click NEW CARD or the pencil: upload/paste the photo or video, then pick the product this card links to (required).",
      "Reorder and toggle active/inactive instantly from the list.",
    ],
  },
  {
    key: "community-cms",
    label: "Community",
    group: "Website Content (CMS)",
    path: "/admin/community-cms",
    summary: "The \"Worn By Our Community\" bento grid — a fixed 7-slot layout, each slot a fixed shape.",
    steps: [
      "Check the live preview at the top — it mirrors the real homepage layout exactly.",
      "Use the ◀ ▶ arrows on each card to reorder — this is what actually controls which shape a photo gets (position 1 = hero, 2 = tall, etc.).",
      "Replace a card's photo/video directly on the card, edit its optional @handle.",
      "Click SAVE CHANGES.",
    ],
    notes: [
      "There is no add button — the slot count is fixed by the layout, not configurable.",
      "The layout is driven entirely by position, not any per-photo \"size\" setting.",
    ],
  },
  {
    key: "headings",
    label: "Headings",
    group: "Website Content (CMS)",
    path: "/admin/headings",
    summary: "Every major section heading site-wide, in one place.",
    steps: [
      "Pick a section from the dropdown.",
      "Edit its eyebrow, heading text, subtitle, and optional text color override (RESET TO THEME to clear it).",
      "Click SAVE for that section.",
    ],
  },
  {
    key: "preloader",
    label: "Preloader",
    group: "Website Content (CMS)",
    path: "/admin/preloader",
    summary: "The full-screen loading animation every visitor sees on first load.",
    steps: [
      "Pick a backdrop: IMAGE, VIDEO, or COLOUR.",
      "Pick what glitches: an uploaded logo/image, or plain text with its own color.",
      "Click SAVE.",
    ],
    notes: ["The glitch animation itself is fixed — this only controls the backdrop and the content that glitches."],
  },
  {
    key: "popup",
    label: "Popup",
    group: "Website Content (CMS)",
    path: "/admin/popup",
    summary: "The loyalty signup popup shown to visitors after a delay.",
    steps: [
      "Toggle ENABLED, set the delay in seconds.",
      "Pick a background (none/image/video) and optional logo.",
      "Set badge text, two-line headline, body text.",
      "Set the rule row icons/labels (Unlock/Earn/Redeem) and tier labels.",
      "Set the two button texts/links.",
      "Click SAVE.",
    ],
    notes: ["The actual ₹ numbers in the rule row come from Settings → Loyalty, not from here."],
  },
  {
    key: "media",
    label: "Media",
    group: "Website Content (CMS)",
    path: "/admin/media",
    summary: "A shared media library for anything uploaded across the whole admin panel.",
    steps: [
      "Click UPLOAD to add images/videos (multiple at once).",
      "Search by filename/alt text, filter by folder.",
      "Click an asset to view details, edit alt text, COPY URL, or DELETE (permanent).",
    ],
  },
  {
    key: "seo",
    label: "SEO",
    group: "Website Content (CMS)",
    path: "/admin/seo",
    summary: "Meta tags and social-sharing data, per page.",
    steps: [
      "Pick a page from the tab row.",
      "Set title tag, meta description, canonical URL, and NO INDEX if needed.",
      "Set Open Graph title/description/image (falls back to the fields above if left blank).",
      "Click SAVE SEO SETTINGS — only saves the page currently selected.",
    ],
  },
  {
    key: "notifications",
    label: "WhatsApp",
    group: "Website Content (CMS)",
    path: "/admin/notifications",
    summary: "Templates, queue, logs, campaigns, and usage for WhatsApp automation.",
    steps: [
      "TEMPLATES — click SYNC FROM META to pull the latest approved templates; toggle ACTIVE to control whether one is ever queued.",
      "QUEUE — pending/sent/failed messages; click retry on a failed one.",
      "LOGS — history of everything actually sent, filterable by date.",
      "CAMPAIGNS — click NEW CAMPAIGN, pick a template and target segment, optionally schedule it.",
      "USAGE — enter your own known per-message rate from Meta's billing to see an estimated cost.",
    ],
    notes: ["Editing a template's body text here has no effect — Meta always sends its own approved copy."],
  },
  {
    key: "users",
    label: "Users",
    group: "Website Content (CMS)",
    path: "/admin/users",
    summary: "Every registered account — search by name/email, change roles.",
    steps: [
      "Search by name or email.",
      "Change a role via the dropdown in that row (admin / staff / customer) — saves instantly, no confirmation.",
    ],
    notes: ["Double-check before granting admin — there's no confirmation prompt."],
  },
];

export const ADMIN_GUIDE_GROUPS = ["Store Operations", "Website Content (CMS)"] as const;
