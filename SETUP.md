# Studio Deny — Integration Setup Guide

## Table of Contents
- [Razorpay](#razorpay)
- [WhatsApp Automation](#whatsapp-automation)
- [Shiprocket](#shiprocket)
- [Google OAuth](#google-oauth)
- [Google Analytics & Tag Manager](#google-analytics--tag-manager)
- [Supabase Configuration](#supabase-configuration)

---

## Razorpay

### Step 1 — Get API Keys
1. Go to `dashboard.razorpay.com` → **Settings → API Keys**
2. Generate a **Live** key pair (use Test keys first)
3. Copy both values:
   - **Key ID** → `rzp_live_...`
   - **Key Secret** → shown only once, copy immediately

### Step 2 — Add Secrets to Supabase
Go to: Supabase Dashboard → **Edge Functions → Secrets**

```
RAZORPAY_KEY_ID      = rzp_live_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET  = xxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3 — Deploy Edge Functions
```bash
npx supabase login
npx supabase link --project-ref ablejcrtuiohdrapgacb
npx supabase functions deploy razorpay-create-order
npx supabase functions deploy razorpay-verify-payment
```

### Step 4 — Test
Use test keys first. Place an order and use:
- **Card:** `4111 1111 1111 1111`
- **Expiry:** any future date
- **CVV:** any 3 digits

### How it works
| Step | What happens |
|------|-------------|
| User clicks "Finalize Order" | `create_order` RPC runs server-side (re-validates prices from DB) |
| Order created | Edge function `razorpay-create-order` creates a Razorpay order |
| Modal opens | User completes payment |
| Payment done | Edge function `razorpay-verify-payment` verifies HMAC signature |
| Verified | Order marked `PAID` in DB, WhatsApp notification sent |

> **Note:** COD orders above ₹2000 require a 20% advance payment via Razorpay. Configurable in the `settings` table.

---

## WhatsApp Automation

Uses Meta (Facebook) WhatsApp Business API. Sending logic lives in `supabase/functions/send-whatsapp/`.

### Triggers built in
| Trigger | Template name | When |
|---------|--------------|------|
| `order_placed` | `order_placed` | Every new order (before payment confirmation) |
| `order_confirmed` | `order_confirmed` | Admin confirms order / payment verified |
| `order_shipped` | `order_shipped` | Admin marks shipped |
| `order_delivered` | `order_delivered` | Admin marks delivered |
| `order_cancelled` | `order_cancelled` | Order cancelled |
| `payment_success` | `payment_success` | Razorpay payment verified |
| `payment_failed` | `payment_failed` | Payment failed |
| `cod_verification` | `cod_advance_payment` | COD order placed — advance request |
| `refund_initiated` | `refund_initiated` | Refund started |
| `refund_completed` | `refund_approved` | Refund approved and processed |
| `abandoned_cart_1h` | `abandoned_cart_1h` | Cart inactive 1 hour |
| `abandoned_cart_24h` | `abandoned_cart_24h` | Cart inactive 24 hours |
| `abandoned_cart_48h` | `abandoned_cart_48h` | Cart inactive 48 hours (final nudge) |
| `back_in_stock` | `back_in_stock` | Product restocked |
| `new_arrivals` | `new_arrivals` | New products added |
| `marketing_campaign` | varies | Manual bulk campaign from admin panel |

### Step 1 — Create Meta Developer App
1. Go to `developers.facebook.com` → **My Apps → Create App**
2. Choose **Business** type → name it `Studio Deny`
3. Add **WhatsApp** product to the app
4. Go to **WhatsApp → Getting Started**
5. Copy the **Temporary access token** and **Phone Number ID**

For production, create a **System User** in Meta Business Suite and generate a permanent token.

### Step 2 — Create Message Templates
Go to `business.facebook.com` → **WhatsApp Manager → Message Templates**

Create and submit these for approval:

| Template name | Category | Variables |
|--------------|----------|-----------|
| `order_placed` | Utility | customer_name, order_number, total |
| `order_confirmed` | Utility | customer_name, order_number, total |
| `order_shipped` | Utility | order_number, tracking_url, eta_days |
| `order_delivered` | Utility | order_number, review_url |
| `order_cancelled` | Utility | customer_name, order_number |
| `payment_success` | Utility | customer_name, order_number, total |
| `payment_failed` | Utility | customer_name, order_number, retry_url |
| `cod_advance_payment` | Utility | customer_name, order_number, advance_amount, payment_url |
| `refund_initiated` | Utility | customer_name, order_number, amount |
| `refund_approved` | Utility | customer_name, amount, order_number |
| `abandoned_cart_1h` | Marketing | customer_name, cart_url |
| `abandoned_cart_24h` | Marketing | customer_name, cart_url |
| `abandoned_cart_48h` | Marketing | customer_name, cart_url |
| `back_in_stock` | Marketing | customer_name, product_name, product_url |
| `new_arrivals` | Marketing | customer_name, collection_url |
| `loyalty_tier_upgrade` | Marketing | customer_name, tier_name, perks_url |
| `low_stock_alert` | Marketing | customer_name, product_name, qty, product_url |
| `welcome_new_user` | Marketing | customer_name, shop_url |

> Templates take 24–48 hours for Meta approval. Submit them all at once.

### Step 3 — Register Webhook in Meta
1. Meta Developers → **WhatsApp → Configuration → Webhook**
2. Set **Callback URL** to:
   ```
   https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/whatsapp-webhook
   ```
3. Set **Verify Token** to any secret string (e.g. `studiodeny_wh_secret_2026`)
4. Subscribe to: **messages**

### Step 4 — Add Secrets to Supabase
Go to: Supabase Dashboard → **Edge Functions → Secrets**

```
WHATSAPP_ENABLED          = true
WHATSAPP_PROVIDER         = meta
WHATSAPP_ACCESS_TOKEN     = EAAxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID  = 12345678901234
WHATSAPP_VERIFY_TOKEN     = studiodeny_wh_secret_2026
STORE_URL                 = https://YOUR_DOMAIN.in
```

> `WHATSAPP_ACCESS_TOKEN` = your Meta System User permanent token
> `WHATSAPP_PHONE_NUMBER_ID` = from Meta WhatsApp → Getting Started
> `WHATSAPP_VERIFY_TOKEN` = the same string you used in Step 3

### Step 5 — Deploy Edge Functions
```bash
npx supabase functions deploy send-whatsapp
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy process-queue
npx supabase functions deploy abandoned-cart-scan
```

### Step 6 — Add Missing Notification Templates to DB
Run this in **Supabase SQL Editor** to add the additional templates not covered in the initial seed:

```sql
INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
('Order Placed',           'order_placed',         'Hi {{1}}! 🛍️ Your order *{{2}}* for ₹{{3}} has been placed. We''ll confirm it shortly.',                                                                      ARRAY['customer_name','order_number','total'],              true),
('Payment Success',        'payment_success',       'Payment confirmed! ✅ Hi {{1}}, we received ₹{{2}} for your order *{{3}}*. Time to get it packed.',                                                             ARRAY['customer_name','total','order_number'],             true),
('Payment Failed',         'payment_failed',        'Hi {{1}}, your payment for order *{{2}}* didn''t go through. Please retry here: {{3}}. Your items are still saved.',                                           ARRAY['customer_name','order_number','retry_url'],         true),
('Refund Initiated',       'refund_initiated',      'Hi {{1}}, we''ve initiated a refund of ₹{{2}} for your order *{{3}}*. It will reflect in 5–7 business days.',                                                 ARRAY['customer_name','amount','order_number'],            true),
('Abandoned Cart 1h',      'abandoned_cart_1h',     'Hey {{1}}, you left something in your bag! 🛒 Your cart is waiting — grab it before it sells out: {{2}}',                                                     ARRAY['customer_name','cart_url'],                         true),
('Abandoned Cart 24h',     'abandoned_cart_24h',    'Still thinking, {{1}}? 👀 Your cart at Studio Deny is still waiting. Shop now: {{2}}',                                                                        ARRAY['customer_name','cart_url'],                         true),
('Abandoned Cart 48h',     'abandoned_cart_48h',    'Last chance, {{1}}! ⚡ Items in your cart are nearly gone. Grab them now: {{2}}. Use code *COMEBACK10* for 10% off.',                                          ARRAY['customer_name','cart_url'],                         false),
('New Arrivals',           'new_arrivals',          'New drop just landed, {{1}}! 🔥 Fresh pieces are now live at Studio Deny. Be first to cop: {{2}}',                                                             ARRAY['customer_name','collection_url'],                   true)
ON CONFLICT (template_name) DO NOTHING;
```

### Step 7 — Set Up Cron Jobs
In Supabase Dashboard → **Database → Extensions**, enable `pg_cron`.

Then run in **SQL Editor**:
```sql
-- Process WhatsApp message queue every 5 minutes
SELECT cron.schedule(
  'process-whatsapp-queue',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/send-whatsapp',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Scan abandoned carts every hour
SELECT cron.schedule(
  'scan-abandoned-carts',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/abandoned-cart-scan',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);
```

Replace `YOUR_ANON_KEY` with the value from Supabase → **Settings → API → anon public key**.

### Step 8 — Test
1. Place a test order on the site
2. Go to **Admin → Notifications → Queue**
3. You should see an `order_placed` entry
4. If status is `failed`, check the error column — usually template not approved yet or phone not added as a test number in Meta

### Admin Dashboard
The WhatsApp admin panel at `/admin/notifications` lets you:
- View all message logs with delivery status
- Monitor and retry the message queue
- Enable/disable individual templates
- Run bulk marketing campaigns

---

## Shiprocket

Handles order shipping, courier assignment, AWB generation, and delivery tracking.

> **Note:** The Shiprocket integration is not yet built into the codebase. Steps below cover account setup and credentials. The edge functions, DB migration, admin UI changes, and customer tracking page need to be built.

### Step 1 — Create Shiprocket Account
1. Go to `app.shiprocket.in` → Sign Up
2. Complete KYC (PAN, GST, bank details)
3. Add your pickup address under **Settings → Manage Addresses → Add Warehouse**

### Step 2 — Get API Credentials
1. Go to **Settings → API** (or `app.shiprocket.in/api-integration`)
2. Note your:
   - **Email** (your Shiprocket login email)
   - **Password** (your Shiprocket login password)
3. Shiprocket uses email/password to generate a Bearer token — no static API key
4. Tokens expire every 10 days; the edge function will handle auto-refresh

### Step 3 — Configure Shipping Channel
1. Go to **Channels → Add Channel**
2. Select **Custom**
3. Name it: `Studio Deny`
4. This creates a Channel ID you'll use in all API calls

### Step 4 — Set Up Webhook
1. Go to **Settings → API → Webhooks**
2. Set **Webhook URL** to:
   ```
   https://ablejcrtuiohdrapgacb.supabase.co/functions/v1/shipment-status-webhook
   ```
3. Enable events: `Shipment Picked Up`, `Shipment In Transit`, `Out for Delivery`, `Delivered`, `RTO Initiated`, `RTO Delivered`

### Step 5 — Add Secrets to Supabase
```
SHIPROCKET_EMAIL      = your-shiprocket-login@email.com
SHIPROCKET_PASSWORD   = your-shiprocket-password
SHIPROCKET_CHANNEL_ID = 12345
```

### Step 6 — What needs to be built (dev tasks)

| Task | File |
|------|------|
| Edge function: create shipment + generate AWB | `supabase/functions/shiprocket-sync/index.ts` (NEW) |
| Edge function: webhook receiver for live tracking | `supabase/functions/shipment-status-webhook/index.ts` (NEW) |
| DB migration: add tracking fields to orders | Run SQL below |
| Admin orders UI: AWB input + shipment trigger | `src/routes/admin.orders.tsx` (MODIFY) |
| Customer orders page: tracking link + courier | `src/routes/account.orders.tsx` (MODIFY) |
| WhatsApp `order_shipped`: populate tracking URL | Update notification logic |

### DB fields to add to orders table
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awb_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rto_initiated_at TIMESTAMPTZ;
```

### How the flow will work (once built)
| Step | What happens |
|------|-------------|
| Admin marks order PACKED | Nothing auto-triggered |
| Admin clicks "Create Shipment" | Edge function calls Shiprocket API → creates order → gets AWB |
| AWB saved to DB | Courier assigned, tracking URL stored |
| WhatsApp `order_shipped` fires | Customer gets tracking link |
| Shiprocket webhook fires | DB updates in real time as parcel moves |
| Customer views order | Sees courier name, AWB, tracking link, live status |

### Shiprocket API Reference
- Create order: `POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`
- Generate AWB: `POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb`
- Track shipment: `GET https://apiv2.shiprocket.in/v1/external/courier/track/awb/{awb}`
- Cancel order: `POST https://apiv2.shiprocket.in/v1/external/orders/cancel`
- Auth token: `POST https://apiv2.shiprocket.in/v1/external/auth/login`

---

## Google OAuth

### Google Cloud Console
1. Go to `console.cloud.google.com` → **APIs & Services → Credentials**
2. Open your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript Origins**:
   ```
   https://YOUR_DOMAIN.in
   https://ablejcrtuiohdrapgacb.supabase.co
   ```
4. Add to **Authorized Redirect URIs**:
   ```
   https://ablejcrtuiohdrapgacb.supabase.co/auth/v1/callback
   ```
5. Copy the **Client Secret**

### OAuth Consent Screen
Go to **APIs & Services → OAuth Consent Screen**:
- **App name:** `Studio Deny`
- **User support email:** `pavan@bellcorpstudio.com`
- **App homepage:** `https://YOUR_DOMAIN.in`
- **Authorized domains:** add your domain

### Supabase Dashboard
Go to: Supabase → **Authentication → Providers → Google**
- Toggle **Enable** on
- **Client ID:** paste your Google Cloud Client ID
- **Client Secret:** paste from Google Cloud Console
- Save

### Supabase URL Configuration
Go to: Supabase → **Authentication → URL Configuration**
- **Site URL:** `https://YOUR_DOMAIN.in`
- **Redirect URLs:** add `https://YOUR_DOMAIN.in/**`

---

## Google Analytics & Tag Manager

Add both scripts to `index.html` before `</head>`:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','YOUR_GTM_ID');</script>

<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA4_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA4_ID');
</script>
```

Also add GTM noscript after `<body>`:
```html
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=YOUR_GTM_ID"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

| Service | ID |
|---------|-----|
| Google Analytics 4 | `YOUR_GA4_ID` — get from analytics.google.com |
| Google Tag Manager | `YOUR_GTM_ID` — get from tagmanager.google.com |

### GA4 Dashboard Setup
1. Go to `analytics.google.com` → your property
2. **Admin → Data Streams** → verify your domain is listed
3. **Admin → Events** → mark `purchase` as a conversion event
4. Set up goals: `purchase`, `add_to_cart`, `sign_up`

### Search Console
1. Go to `search.google.com/search-console`
2. Add property → your domain
3. Verify via DNS TXT record
4. Submit sitemap: `https://YOUR_DOMAIN.in/sitemap.xml`

### Google Merchant Center (for Shopping listings)
1. Go to `merchants.google.com`
2. Add store → verify your domain
3. Create a product feed from the Supabase `products` table
4. Link to Google Ads when ready

---

## Supabase Configuration

### Project details
| Field | Value |
|-------|-------|
| Project ID | `ablejcrtuiohdrapgacb` |
| Project URL | `https://ablejcrtuiohdrapgacb.supabase.co` |
| Dashboard | `supabase.com/dashboard/project/ablejcrtuiohdrapgacb` |
| Anon Key | in `.env` → `VITE_SUPABASE_ANON_KEY` |

### Cloudinary
| Field | Value |
|-------|-------|
| Cloud Name | `dslsygx32` |
| Upload Preset | `studiodeny_unsigned` |

### All Edge Functions to deploy
```bash
npx supabase login
npx supabase link --project-ref ablejcrtuiohdrapgacb

# Payment
npx supabase functions deploy razorpay-create-order
npx supabase functions deploy razorpay-verify-payment

# WhatsApp
npx supabase functions deploy send-whatsapp
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy process-queue
npx supabase functions deploy abandoned-cart-scan

# Shipping (once built)
npx supabase functions deploy shiprocket-sync
npx supabase functions deploy shipment-status-webhook
```

### All secrets required
| Secret | Used by |
|--------|---------|
| `RAZORPAY_KEY_ID` | razorpay-create-order |
| `RAZORPAY_KEY_SECRET` | razorpay-create-order, razorpay-verify-payment |
| `WHATSAPP_ENABLED` | all whatsapp functions |
| `WHATSAPP_PROVIDER` | all whatsapp functions |
| `WHATSAPP_ACCESS_TOKEN` | send-whatsapp |
| `WHATSAPP_PHONE_NUMBER_ID` | send-whatsapp |
| `WHATSAPP_VERIFY_TOKEN` | whatsapp-webhook |
| `STORE_URL` | abandoned-cart-scan |
| `SHIPROCKET_EMAIL` | shiprocket-sync, shipment-status-webhook (future) |
| `SHIPROCKET_PASSWORD` | shiprocket-sync, shipment-status-webhook (future) |
| `SHIPROCKET_CHANNEL_ID` | shiprocket-sync (future) |

### Email confirmation
To disable email verification on signup (users log in immediately):
Supabase → **Authentication → Providers → Email** → toggle off **Confirm email**

---

## Checklist

### Razorpay
- [ ] API keys generated (live)
- [ ] `RAZORPAY_KEY_ID` added to Supabase secrets
- [ ] `RAZORPAY_KEY_SECRET` added to Supabase secrets
- [ ] `razorpay-create-order` deployed
- [ ] `razorpay-verify-payment` deployed
- [ ] Test order placed successfully

### WhatsApp
- [ ] Meta developer app created
- [ ] All message templates submitted and approved
- [ ] Webhook URL registered in Meta (`/functions/v1/whatsapp-webhook`)
- [ ] All 5 secrets added to Supabase
- [ ] `send-whatsapp` edge function deployed
- [ ] Missing templates SQL run in SQL Editor (Step 6 above)
- [ ] pg_cron extension enabled
- [ ] Cron jobs created for queue processing + abandoned cart scan
- [ ] Test order triggers WhatsApp message
- [ ] Delivery status webhook confirmed working

### Shiprocket
- [ ] Account created and KYC completed
- [ ] Pickup warehouse address added
- [ ] Custom channel created — note the Channel ID
- [ ] Webhook URL registered in Shiprocket settings
- [ ] `SHIPROCKET_EMAIL` added to Supabase secrets
- [ ] `SHIPROCKET_PASSWORD` added to Supabase secrets
- [ ] `SHIPROCKET_CHANNEL_ID` added to Supabase secrets
- [ ] DB migration run to add tracking fields to orders
- [ ] `shiprocket-sync` edge function built and deployed
- [ ] `shipment-status-webhook` edge function built and deployed
- [ ] Admin orders UI updated with AWB input + shipment trigger
- [ ] Customer orders page updated with tracking link display
- [ ] WhatsApp `order_shipped` message populated with tracking URL

### Google OAuth
- [ ] Authorized redirect URI added in Google Cloud Console
- [ ] Client Secret added to Supabase
- [ ] Site URL updated in Supabase
- [ ] Redirect URL `https://YOUR_DOMAIN.in/**` added in Supabase

### Google Services
- [ ] GA4 and GTM scripts added to `index.html`
- [ ] Search Console property verified
- [ ] Sitemap submitted
- [ ] GA4 purchase event marked as conversion
- [ ] Merchant Center store verified (for Shopping)
