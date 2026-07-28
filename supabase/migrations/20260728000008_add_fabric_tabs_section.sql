ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'fabric_tabs';

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'fabric_tabs', 'Product Specifications (fabric tabs)', true, 19,
  '{
    "tabs": [
      { "id": "tshirts", "name": "T-SHIRTS", "title": "300+ GSM HEAVYWEIGHT COTTON", "desc": "Substantial, heavyweight fabric that drapes perfectly and does not cling. Pre-shrunk for a consistent fit. Engineered pattern making for the perfect relaxed silhouette with dropped shoulders.", "img": "https://studio-deny-demo.vercel.app/assets/001_18.JPG", "href": "/collections/tops" },
      { "id": "shirts", "name": "SHIRTS", "title": "PREMIUM OXFORD & FLANNEL", "desc": "Double-needle stitching on all stress points. High-density weaves for durability while maintaining breathability. Built to soften and get better with every wash.", "img": "https://studio-deny-demo.vercel.app/assets/001_13.JPG", "href": "/shop?q=shirts" },
      { "id": "jeans", "name": "JEANS", "title": "14OZ JAPANESE SELVEDGE", "desc": "Raw, unwashed denim that molds to your body over time. Custom branded hardware, reinforced belt loops, and hidden rivets. A modern straight-leg cut that stacks perfectly over sneakers.", "img": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=1200", "href": "/collections/bottoms" }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'fabric_tabs'
);
