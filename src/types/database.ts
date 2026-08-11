export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type GalleryItem = { url: string; layout: "standalone" | "half"; type?: "image" | "video" };

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
  sizes: string[];
  colors: { name: string; hex: string }[];
  description: string;
  material: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type SizeRow = {
  id: string;
  category_id: string;
  label: string;
  position: number;
  created_at: string;
};

// Every mega-menu level resolves through something that already exists —
// no free-text labels or custom URLs. A tab and a sublink both ARE a real
// category (label comes from categories.name, link from categories.slug);
// a tile IS a real product (image/label/link all come from it).
export type MegaMenuCategoryRow = {
  id: string;
  category_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
};

export type MegaMenuLinkRow = {
  id: string;
  menu_category_id: string;
  category_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
};

export type MegaMenuProductRow = {
  id: string;
  menu_category_id: string;
  product_slug: string;
  position: number;
  created_at: string;
};

export type AppRole = "admin" | "staff" | "customer";
export type PaymentMethod = "RAZORPAY" | "COD";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type RefundStatus = "NONE" | "REQUESTED" | "APPROVED" | "COMPLETED" | "REJECTED";
export type NotifStatus = "pending" | "sent" | "failed";
export type WaLogStatus = "sent" | "delivered" | "read" | "failed";
export type CampaignStatus = "draft" | "scheduled" | "running" | "completed" | "failed";
export type FaqCategory = "general" | "orders" | "shipping" | "returns" | "sizing";
export type SectionType = "hero" | "marquee" | "new_arrivals" | "lookbook" | "testimonials" | "faq" | "why_us" | "newsletter" | "gender_split" | "category_carousel" | "denyspace" | "popular_now" | "fabric_tabs" | "motion_picture" | "influencer_picks" | "community" | "contact_support";
export type NavLocation = "header" | "footer" | "mobile";
export type LoyaltyTxType = "earn" | "redeem" | "adjust";
export type LoyaltyTier = "ROOKIE" | "RUNNER" | "RIOT" | "LEGEND";

export interface Database {
  public: {
    Tables: {
      products: {
        Row: DBProduct;
        Insert: Omit<DBProduct, "created_at" | "updated_at">;
        Update: Partial<Omit<DBProduct, "created_at" | "updated_at">>;
        Relationships: [];
      };
      product_variants: {
        Row: ProductVariant;
        Insert: Omit<ProductVariant, "id" | "created_at">;
        Update: Partial<Omit<ProductVariant, "id" | "created_at">>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Omit<CategoryRow, "id" | "created_at" | "is_active"> & Partial<Pick<CategoryRow, "id" | "created_at" | "is_active">>;
        Update: Partial<Omit<CategoryRow, "id" | "created_at">>;
        Relationships: [];
      };
      sizes: {
        Row: SizeRow;
        Insert: Omit<SizeRow, "id" | "created_at" | "position"> & Partial<Pick<SizeRow, "id" | "created_at" | "position">>;
        Update: Partial<Omit<SizeRow, "id" | "created_at">>;
        Relationships: [];
      };
      mega_menu_categories: {
        Row: MegaMenuCategoryRow;
        Insert: Omit<MegaMenuCategoryRow, "id" | "created_at" | "position" | "is_active"> & Partial<Pick<MegaMenuCategoryRow, "id" | "created_at" | "position" | "is_active">>;
        Update: Partial<Omit<MegaMenuCategoryRow, "id" | "created_at">>;
        Relationships: [];
      };
      mega_menu_links: {
        Row: MegaMenuLinkRow;
        Insert: Omit<MegaMenuLinkRow, "id" | "created_at" | "position" | "is_active"> & Partial<Pick<MegaMenuLinkRow, "id" | "created_at" | "position" | "is_active">>;
        Update: Partial<Omit<MegaMenuLinkRow, "id" | "created_at">>;
        Relationships: [];
      };
      mega_menu_products: {
        Row: MegaMenuProductRow;
        Insert: Omit<MegaMenuProductRow, "id" | "created_at" | "position"> & Partial<Pick<MegaMenuProductRow, "id" | "created_at" | "position">>;
        Update: Partial<Omit<MegaMenuProductRow, "id" | "created_at">>;
        Relationships: [];
      };
      announcement_bars: {
        Row: AnnouncementBar;
        Insert: Omit<AnnouncementBar, "id" | "created_at">;
        Update: Partial<Omit<AnnouncementBar, "id" | "created_at">>;
        Relationships: [];
      };
      website_sections: {
        Row: WebsiteSection;
        Insert: Omit<WebsiteSection, "id" | "created_at">;
        Update: Partial<Omit<WebsiteSection, "id" | "created_at">>;
        Relationships: [];
      };
      navigation_menus: {
        Row: NavigationMenu;
        Insert: Omit<NavigationMenu, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<NavigationMenu, "id" | "created_at">>;
        Relationships: [];
      };
      faq_items: {
        Row: FaqItem;
        Insert: Omit<FaqItem, "id" | "created_at">;
        Update: Partial<Omit<FaqItem, "id" | "created_at">>;
        Relationships: [];
      };
      testimonials: {
        Row: Testimonial;
        Insert: Omit<Testimonial, "id" | "created_at">;
        Update: Partial<Omit<Testimonial, "id" | "created_at">>;
        Relationships: [];
      };
      media_assets: {
        Row: MediaAsset;
        Insert: Omit<MediaAsset, "id" | "created_at">;
        Update: Partial<Omit<MediaAsset, "id" | "created_at">>;
        Relationships: [];
      };
      brand_settings: {
        Row: BrandSettings;
        Insert: Omit<BrandSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BrandSettings, "id" | "created_at">>;
        Relationships: [];
      };
      theme_settings: {
        Row: ThemeSettings;
        Insert: Omit<ThemeSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ThemeSettings, "id" | "created_at">>;
        Relationships: [];
      };
      seo_settings: {
        Row: SeoSettings;
        Insert: Omit<SeoSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SeoSettings, "id" | "created_at">>;
        Relationships: [];
      };
      settings: {
        Row: AppSettings;
        Insert: Omit<AppSettings, "id" | "updated_at">;
        Update: Partial<Omit<AppSettings, "id">>;
        Relationships: [];
      };
      notification_templates: {
        Row: NotificationTemplate;
        Insert: Omit<NotificationTemplate, "id" | "created_at">;
        Update: Partial<Omit<NotificationTemplate, "id" | "created_at">>;
        Relationships: [];
      };
      notification_queue: {
        Row: NotificationQueue;
        Insert: Omit<NotificationQueue, "id" | "created_at">;
        Update: Partial<Omit<NotificationQueue, "id" | "created_at">>;
        Relationships: [];
      };
      whatsapp_logs: {
        Row: WhatsappLog;
        Insert: Omit<WhatsappLog, "id" | "created_at">;
        Update: Partial<Omit<WhatsappLog, "id" | "created_at">>;
        Relationships: [];
      };
      marketing_campaigns: {
        Row: MarketingCampaign;
        Insert: Omit<MarketingCampaign, "id" | "created_at">;
        Update: Partial<Omit<MarketingCampaign, "id" | "created_at">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, "id" | "created_at">;
        Update: Partial<Omit<UserRole, "id" | "created_at">>;
        Relationships: [];
      };
      addresses: {
        Row: Address;
        Insert: Omit<Address, "id" | "created_at">;
        Update: Partial<Omit<Address, "id" | "created_at">>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id" | "created_at">;
        Update: Partial<Omit<OrderItem, "id" | "created_at">>;
        Relationships: [];
      };
      orders: {
        Row: DBOrder;
        Insert: Omit<DBOrder, "order_number" | "created_at" | "updated_at"> & Partial<Pick<DBOrder, "order_number">>;
        Update: Partial<Omit<DBOrder, "id" | "created_at">>;
        Relationships: [];
      };
      carts: {
        Row: Cart;
        Insert: Omit<Cart, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Cart, "id" | "created_at">>;
        Relationships: [];
      };
      cart_items: {
        Row: CartItem;
        Insert: Omit<CartItem, "id" | "created_at">;
        Update: Partial<Omit<CartItem, "id" | "created_at">>;
        Relationships: [];
      };
      wishlist_items: {
        Row: WishlistItem;
        Insert: Omit<WishlistItem, "id" | "created_at">;
        Update: Partial<Omit<WishlistItem, "id" | "created_at">>;
        Relationships: [];
      };
      loyalty_balances: {
        Row: LoyaltyBalance;
        Insert: Omit<LoyaltyBalance, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<LoyaltyBalance, "id" | "created_at">>;
        Relationships: [];
      };
      loyalty_transactions: {
        Row: LoyaltyTransaction;
        Insert: Omit<LoyaltyTransaction, "id" | "created_at">;
        Update: Partial<Omit<LoyaltyTransaction, "id" | "created_at">>;
        Relationships: [];
      };
      coupons: {
        Row: Coupon;
        Insert: Omit<Coupon, "id" | "created_at">;
        Update: Partial<Omit<Coupon, "id" | "created_at">>;
        Relationships: [];
      };
      admin_notifications: {
        Row: AdminNotification;
        Insert: Omit<AdminNotification, "id" | "created_at">;
        Update: Partial<Omit<AdminNotification, "id" | "created_at">>;
        Relationships: [];
      };
      lookbook_slides: {
        Row: LookbookSlide;
        Insert: Omit<LookbookSlide, "id" | "created_at">;
        Update: Partial<Omit<LookbookSlide, "id" | "created_at">>;
        Relationships: [];
      };
      community_photos: {
        Row: CommunityPhoto;
        Insert: Omit<CommunityPhoto, "id" | "created_at">;
        Update: Partial<Omit<CommunityPhoto, "id" | "created_at">>;
        Relationships: [];
      };
      influencer_picks: {
        Row: InfluencerPick;
        Insert: Omit<InfluencerPick, "id" | "created_at">;
        Update: Partial<Omit<InfluencerPick, "id" | "created_at">>;
        Relationships: [];
      };
      influencer_pick_products: {
        Row: InfluencerPickProduct;
        Insert: Omit<InfluencerPickProduct, "id" | "created_at">;
        Update: Partial<Omit<InfluencerPickProduct, "id" | "created_at">>;
        Relationships: [];
      };
      section_headings: {
        Row: SectionHeading;
        Insert: Omit<SectionHeading, "updated_at">;
        Update: Partial<Omit<SectionHeading, "key">>;
        Relationships: [];
      };
      popup_promo: {
        Row: PopupPromo;
        Insert: Omit<PopupPromo, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PopupPromo, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      preloader_settings: {
        Row: PreloaderSettings;
        Insert: Omit<PreloaderSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PreloaderSettings, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
    };
  };
}

export type AnnouncementBar = {
  id: string;
  message: string;
  cta_label: string | null;
  cta_href: string | null;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  position: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type WebsiteSection = {
  id: string;
  page_slug: string;
  section_type: SectionType;
  title: string;
  is_visible: boolean;
  is_locked: boolean;
  position: number;
  config: Json;
  created_at: string;
};

export type NavMenuItem = { label: string; href: string; group?: string };

export type NavigationMenu = {
  id: string;
  location: NavLocation;
  items: NavMenuItem[];
  created_at: string;
  updated_at: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  is_active: boolean;
  position: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  avatar: string | null;
  avatar_type: "image" | "video";
  body: string;
  rating: number;
  is_active: boolean;
  position: number;
  created_at: string;
};

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

export type BrandSettings = {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  logo_type: "image" | "video";
  favicon_url: string | null;
  favicon_type: "image" | "video";
  og_default_image: string | null;
  social_instagram: string | null;
  social_whatsapp: string | null;
  social_youtube: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  support_hours: string | null;
  support_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ThemeSettings = {
  id: string;
  accent_color: string;
  font_display: string | null;
  font_ui: string | null;
  border_radius: string | null;
  animations_enabled: boolean;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoSettings = {
  id: string;
  page_slug: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  canonical_url: string | null;
  no_index: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  id: string;
  cod_enabled: boolean;
  cod_advance_percent: number;
  cod_min_order: number;
  updated_at: string;
};

export type NotificationTemplate = {
  id: string;
  name: string;
  template_name: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
};

export type NotificationQueue = {
  id: string;
  template_id: string | null;
  recipient_phone: string;
  order_id: string | null;
  variables: Json;
  status: NotifStatus;
  error_message: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export type WhatsappLog = {
  id: string;
  queue_id: string | null;
  order_id: string | null;
  recipient_phone: string;
  message_id: string | null;
  status: WaLogStatus;
  created_at: string;
};

export type MarketingCampaign = {
  id: string;
  name: string;
  template_id: string | null;
  target_segment: string | null;
  scheduled_at: string | null;
  status: CampaignStatus;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  stock: number;
  price: number | null;
  compare_price: number | null;
  sku: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_slug: string;
  product_name: string;
  size: string | null;
  color: string | null;
  qty: number;
  unit_price: number;
  created_at: string;
};

export type DBOrder = {
  id: string;
  order_number: string;
  invoice_no: string | null;
  user_id: string | null;
  user_email: string;
  items: Json;
  subtotal: number;
  shipping: number;
  tax_rate: number;
  tax: number;
  discount: number;
  extra_lines: Json;
  total: number;
  status: "PLACED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  address: Json;
  payment_id: string | null;
  payment_method: "razorpay" | "cod";
  cod_advance_paid: boolean;
  cod_advance_amount: number | null;
  notes: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  shiprocket_order_id: string | null;
  shiprocket_shipment_id: string | null;
  awb_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  rto_initiated_at: string | null;
  return_status: "REQUESTED" | "PICKUP_SCHEDULED" | "PICKUP_FAILED" | "RECEIVED" | null;
  return_reason: string | null;
  return_requested_at: string | null;
  shiprocket_return_order_id: string | null;
  shiprocket_return_shipment_id: string | null;
  return_awb_number: string | null;
  return_courier_name: string | null;
  return_tracking_url: string | null;
  return_received_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Cart = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  variant_id: string;
  qty: number;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_slug: string;
  created_at: string;
};

export type LoyaltyBalance = {
  id: string;
  user_id: string;
  points: number;
  lifetime_spent: number;
  tier: LoyaltyTier;
  created_at: string;
  updated_at: string;
};

export type LoyaltyTransaction = {
  id: string;
  user_id: string;
  order_id: string | null;
  type: LoyaltyTxType;
  points: number;
  note: string | null;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type BentoSize = "sm" | "md" | "lg" | "wide" | "tall";
export type InfluencerVideoSource = "upload" | "link";

export type LookbookSlide = {
  id: string;
  image_url: string;
  media_type: "image" | "video";
  caption: string | null;
  link_href: string | null;
  product_slug: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
};

export type CommunityPhoto = {
  id: string;
  image_url: string;
  media_type: "image" | "video";
  handle: string | null;
  bento_size: BentoSize;
  is_active: boolean;
  position: number;
  created_at: string;
};

export type InfluencerPick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: InfluencerVideoSource;
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: "image" | "video";
  quote: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
};

export type PreloaderSettings = {
  id: string;
  bg_type: "image" | "video";
  bg_image_url: string | null;
  bg_video_url: string | null;
  content_type: "image" | "text";
  content_image_url: string;
  content_text: string;
  text_color: string;
  created_at: string;
  updated_at: string;
};

export type PopupPromo = {
  id: string;
  enabled: boolean;
  delay_seconds: number;
  bg_type: "none" | "image" | "video";
  bg_image_url: string | null;
  bg_video_url: string | null;
  logo_url: string | null;
  badge_text: string;
  headline_line1: string;
  headline_line2: string;
  body_text: string;
  rule_unlock_label: string;
  rule_earn_label: string;
  rule_redeem_label: string;
  rule_unlock_icon: string;
  rule_earn_icon: string;
  rule_redeem_icon: string;
  rule_earn_value: string;
  rule_unlock_sub: string;
  tier_1_label: string;
  tier_2_label: string;
  tier_3_label: string;
  tier_4_label: string;
  cta_primary_text: string;
  cta_primary_href: string;
  cta_secondary_text: string;
  created_at: string;
  updated_at: string;
};

export type SectionHeading = {
  key: string;
  label: string;
  heading_text: string;
  eyebrow_text: string | null;
  subtitle_text: string | null;
  text_color: string | null;
  updated_at: string;
};

export type InfluencerPickProduct = {
  id: string;
  influencer_pick_id: string;
  product_slug: string;
  position: number;
  created_at: string;
};

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  ref_id: string | null;
  created_at: string;
};
