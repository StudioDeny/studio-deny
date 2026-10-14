import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/context/CartContext";
import type { Coupon } from "@/types/database";

export type QuoteLine = { slug: string; variantId: string | null; qty: number };

export type CouponError =
  | "not_found" | "inactive" | "not_started" | "expired" | "not_yours"
  | "already_used" | "limit_reached" | "first_order_only" | "min_order" | "not_applicable";

export type QuotedLine = QuoteLine & { price: number };

export type OrderQuote = {
  /** Server price per cart line, in the order the lines were sent. */
  lines: QuotedLine[];
  subtotal: number;
  loyalty_discount: number;
  coupon_code: string | null;
  coupon_discount: number;
  coupon_error: CouponError | null;
  coupon_min_order: number | null;
  /** Category names the code is limited to; [] = whole store. */
  coupon_scope: string[];
  shipping: number;
  total: number;
  cod_available: boolean;
  cod_advance: number;
  cod_advance_percent: number;
};

export const quoteLines = (items: CartItem[]): QuoteLine[] =>
  items.map((i) => ({ slug: i.product.slug, variantId: i.variantId ?? null, qty: i.qty }));

// Postgres numerics arrive as numbers or numeric strings depending on the
// driver path; normalise once here so callers can do arithmetic.
export function toQuote(raw: Record<string, unknown>): OrderQuote {
  const n = (v: unknown) => Number(v ?? 0);
  const lines = Array.isArray(raw.lines) ? (raw.lines as Record<string, unknown>[]) : [];
  return {
    lines: lines.map((l) => ({ slug: String(l.slug), variantId: (l.variantId as string | null) ?? null, qty: n(l.qty), price: n(l.price) })),
    subtotal: n(raw.subtotal),
    loyalty_discount: n(raw.loyalty_discount),
    coupon_code: (raw.coupon_code as string | null) ?? null,
    coupon_discount: n(raw.coupon_discount),
    coupon_error: (raw.coupon_error as CouponError | null) ?? null,
    coupon_min_order: raw.coupon_min_order == null ? null : n(raw.coupon_min_order),
    coupon_scope: Array.isArray(raw.coupon_scope) ? raw.coupon_scope.map(String) : [],
    shipping: n(raw.shipping),
    total: n(raw.total),
    cod_available: Boolean(raw.cod_available),
    cod_advance: n(raw.cod_advance),
    cod_advance_percent: n(raw.cod_advance_percent),
  };
}

export async function fetchQuote(lines: QuoteLine[], couponCode: string | null, fulfillment: "delivery" | "pickup" = "delivery"): Promise<OrderQuote> {
  const params = { p_items: lines, p_coupon_code: couponCode, ...(fulfillment === "pickup" ? { p_fulfillment: "pickup" } : {}) };
  const { data, error } = await supabase.rpc("quote_order" as never, params as never);
  if (error) throw new Error(error.message);
  return toQuote(data as unknown as Record<string, unknown>);
}

const listNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

export function couponErrorMessage(err: CouponError, minOrder: number | null, scope: string[] = []): string {
  switch (err) {
    case "not_found": return "That code doesn't exist.";
    case "inactive": return "That code is switched off.";
    case "not_started": return "That code isn't active yet.";
    case "expired": return "That code has expired.";
    case "not_yours": return "That code belongs to another account.";
    case "already_used": return "You've already used that code.";
    case "limit_reached": return "That code has been fully used.";
    case "first_order_only": return "That code is for your first order only.";
    case "min_order":
      return scope.length > 0
        ? `Add ${listNames(scope)} items worth ₹${(minOrder ?? 0).toLocaleString("en-IN")} or more to use that code.`
        : `Add items worth ₹${(minOrder ?? 0).toLocaleString("en-IN")} or more to use that code.`;
    case "not_applicable":
      return scope.length > 0 ? `That code is only for ${listNames(scope)}.` : "That code doesn't cover the items in your bag.";
  }
}

// ── Checkout coupon list ────────────────────────────────────
export type AvailableCoupon = {
  code: string;
  kind: Coupon["kind"];
  discount_type: Coupon["discount_type"];
  discount_value: number;
  max_discount: number | null;
  min_order: number | null;
  first_order_only: boolean;
  expires_at: string | null;
  scope: string[];
  eligible_subtotal: number;
  /** What this code takes off this bag right now; 0 when it can't be used. */
  discount: number;
  error: CouponError | null;
};

/** Every live coupon priced against the bag, usable ones first. null = couldn't load. */
export async function fetchAvailableCoupons(lines: QuoteLine[]): Promise<AvailableCoupon[] | null> {
  const { data, error } = await supabase.rpc("available_coupons" as never, { p_items: lines } as never);
  if (error) {
    console.error("available_coupons:", error.message);
    return null;
  }
  const n = (v: unknown) => Number(v ?? 0);
  return ((data as unknown as Record<string, unknown>[]) ?? []).map((c) => ({
    code: String(c.code),
    kind: c.kind as Coupon["kind"],
    discount_type: c.discount_type as Coupon["discount_type"],
    discount_value: n(c.discount_value),
    max_discount: c.max_discount == null ? null : n(c.max_discount),
    min_order: c.min_order == null ? null : n(c.min_order),
    first_order_only: Boolean(c.first_order_only),
    expires_at: (c.expires_at as string | null) ?? null,
    scope: Array.isArray(c.scope) ? c.scope.map(String) : [],
    eligible_subtotal: n(c.eligible_subtotal),
    discount: n(c.discount),
    error: (c.error as CouponError | null) ?? null,
  }));
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`;

/** The conditions line under a coupon, e.g. "On ₹999+ · Jerseys only · Ends 20 Oct". */
export function couponTerms(c: AvailableCoupon): string {
  const parts: string[] = [];
  if (c.discount_type === "percent" && c.max_discount) parts.push(`Up to ${inr(c.max_discount)} off`);
  if (c.min_order) parts.push(`On ${c.scope.length > 0 ? `${listNames(c.scope)} items` : "orders"} of ${inr(c.min_order)}+`);
  else if (c.scope.length > 0) parts.push(`On ${listNames(c.scope)} items only`);
  if (c.first_order_only) parts.push("First order only");
  if (c.expires_at) parts.push(`Ends ${new Date(c.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`);
  return parts.join(" · ");
}

/** Why a listed coupon can't be used on this bag yet. */
export function couponBlockedReason(c: AvailableCoupon): string | null {
  if (!c.error) return null;
  switch (c.error) {
    case "min_order": {
      const short = Math.max(0, (c.min_order ?? 0) - c.eligible_subtotal);
      return `Add ${inr(short)} more${c.scope.length > 0 ? ` of ${listNames(c.scope)}` : ""} to use this`;
    }
    case "not_applicable":
      return c.scope.length > 0 ? `Only for ${listNames(c.scope)} — none in your bag` : "Not valid on the items in your bag";
    case "already_used": return "You've already used this";
    case "limit_reached": return "Fully claimed";
    case "first_order_only": return "For your first order only";
    default: return couponErrorMessage(c.error, c.min_order, c.scope);
  }
}

export const couponLabel = (c: Pick<Coupon, "discount_type" | "discount_value">): string =>
  c.discount_type === "percent"
    ? `${Number(c.discount_value)}% OFF`
    : `₹${Number(c.discount_value).toLocaleString("en-IN")} OFF`;

/** The signed-in user's welcome coupon (RLS: owner can read their own). */
export async function myWelcomeCoupon(): Promise<Coupon | null> {
  const { data } = await supabase.from("coupons").select("*").eq("kind", "welcome").maybeSingle();
  return (data as Coupon | null) ?? null;
}

export function couponStatus(c: Coupon): "active" | "used" | "expired" | "inactive" {
  if (c.max_uses != null && c.used_count >= c.max_uses) return "used";
  if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return "expired";
  if (!c.is_active) return "inactive";
  return "active";
}
