-- ============================================================
-- Migration: Seed default CMS content
-- Safe to re-run (ON CONFLICT DO NOTHING / DO UPDATE)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Default announcement bars
-- ────────────────────────────────────────────────────────────
INSERT INTO announcement_bars (message, bg_color, text_color, is_active, position) VALUES
  ('FREE SHIPPING ON ORDERS ABOVE ₹999',                '#c8f135', '#0a0a0a', true, 0),
  ('NEW DROP — SHADOW REALM COLLECTION IS LIVE',        '#c8f135', '#0a0a0a', true, 1),
  ('USE CODE DENY10 FOR 10% OFF YOUR FIRST ORDER',      '#c8f135', '#0a0a0a', true, 2),
  ('MADE IN INDIA · WORN WORLDWIDE · NO APOLOGIES',     '#c8f135', '#0a0a0a', true, 3),
  ('LIMITED STOCK — GRAB IT BEFORE IT''S GONE',         '#c8f135', '#0a0a0a', true, 4)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Default homepage sections
-- ────────────────────────────────────────────────────────────
INSERT INTO website_sections (page_slug, section_type, title, is_visible, is_locked, position, config) VALUES
  ('home', 'hero',         'Hero Banner',      true,  true,  0, '{"title":"WEAR THE DENIAL","subtitle":"Streetwear for the ones who never asked for permission.","cta_label":"SHOP NOW","cta_href":"/shop","bg_image":""}'),
  ('home', 'marquee',      'Marquee Bar',       true,  true,  1, '{"items":["STUDIO / DENY","STREETWEAR · MUMBAI","MADE IN INDIA","LIMITED DROPS"],"speed":40}'),
  ('home', 'new_arrivals', 'New Arrivals',      true,  false, 2, '{"eyebrow":"FRESH OFF THE PRESS","title":"NEW ARRIVALS","subtitle":"This week''s drop — limited units, raw cuts, made for the street.","cta_label":"SHOP THE DROP","product_slugs":[]}'),
  ('home', 'lookbook',     'Lookbook',          true,  false, 3, '{"title":"LOOKBOOK","images":[]}'),
  ('home', 'testimonials', 'Testimonials',      true,  false, 4, '{}'),
  ('home', 'faq',          'FAQ',               false, false, 5, '{}')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Default navigation menus
-- ────────────────────────────────────────────────────────────
INSERT INTO navigation_menus (location, items) VALUES
  ('header', '[
    {"label":"Shop","href":"/shop"},
    {"label":"Lookbook","href":"/lookbook"},
    {"label":"About","href":"/about"}
  ]'),
  ('footer', '[
    {"label":"FAQ","href":"/faq"},
    {"label":"Shipping","href":"/policies"},
    {"label":"Returns","href":"/policies"},
    {"label":"Contact","href":"/contact"},
    {"label":"Size Guide","href":"/size-guide"}
  ]'),
  ('mobile', '[
    {"label":"Shop","href":"/shop"},
    {"label":"Lookbook","href":"/lookbook"},
    {"label":"About","href":"/about"},
    {"label":"Contact","href":"/contact"}
  ]')
ON CONFLICT (location) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Default FAQ items
-- ────────────────────────────────────────────────────────────
INSERT INTO faq_items (question, answer, category, is_active, position) VALUES
  ('What sizes do you carry?',
   'We carry XS through 3XL. Check individual product pages for size-specific availability. Our Size Guide has a full measurement chart.',
   'sizing', true, 0),
  ('How long does shipping take?',
   'Standard shipping: 5–7 business days. Express: 2–3 business days. Orders above ₹999 ship free.',
   'shipping', true, 1),
  ('Can I return or exchange?',
   'Returns accepted within 7 days of delivery in unworn condition with all tags attached. Sale items are final sale.',
   'returns', true, 2),
  ('How do I track my order?',
   'Once your order ships, you''ll receive a tracking link via WhatsApp and email. You can also check your order status in your account.',
   'orders', true, 3),
  ('Do you ship internationally?',
   'Currently we ship within India only. International shipping is coming soon.',
   'shipping', true, 4),
  ('What payment methods do you accept?',
   'We accept all major credit/debit cards, UPI, net banking via Razorpay. Cash on Delivery is available on select orders.',
   'general', true, 5)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Default SEO settings
-- ────────────────────────────────────────────────────────────
INSERT INTO seo_settings (page_slug, title, description, no_index) VALUES
  ('home',     'STUDIO/DENY — Streetwear from Mumbai',         'Underground streetwear brand. Designed in Mumbai, worn worldwide. Limited drops, raw cuts, no apologies.',     false),
  ('shop',     'Shop — STUDIO/DENY',                           'Browse the full Studio Deny collection. Tees, hoodies, cargo, outerwear and more.',                            false),
  ('about',    'About — STUDIO/DENY',                          'The story behind Studio Deny. Born in the streets of Mumbai, built for those who refuse to blend in.',         false),
  ('contact',  'Contact — STUDIO/DENY',                        'Get in touch with the Studio Deny team.',                                                                      false),
  ('cart',     'Your Cart — STUDIO/DENY',                      '',                                                                                                             true),
  ('checkout', 'Checkout — STUDIO/DENY',                       '',                                                                                                             true)
ON CONFLICT (page_slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Default notification templates
-- ────────────────────────────────────────────────────────────
INSERT INTO notification_templates (name, template_name, body_text, variables, is_active) VALUES
  ('Order Confirmed',
   'order_confirmed',
   'Hi {{1}}! Your order {{2}} has been confirmed. Total: ₹{{3}}. We''ll notify you when it ships.',
   ARRAY['customer_name','order_number','total'],
   true),
  ('Order Shipped',
   'order_shipped',
   'Your order {{1}} is on its way! Track it here: {{2}}',
   ARRAY['order_number','tracking_url'],
   true),
  ('Order Delivered',
   'order_delivered',
   'Your order {{1}} has been delivered. Hope you love it! Leave a review: {{2}}',
   ARRAY['order_number','review_url'],
   true),
  ('Abandoned Cart',
   'abandoned_cart_reminder',
   'Hey {{1}}, you left something behind! Your cart is waiting: {{2}}',
   ARRAY['customer_name','cart_url'],
   false)
ON CONFLICT (template_name) DO NOTHING;
