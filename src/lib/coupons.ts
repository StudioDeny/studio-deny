import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/context/CartContext";
import type { Coupon } from "@/types/database";

export type QuoteLine = { slug: string; variantId: string | null; qty: number };

export type CouponError =
  | "not_found" | "inactive" | "not_started" | "expired" | "not_yours"
  | "already_used" | "limit_reached" | "first_order_only" | "min_order";

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
    shipping: n(raw.shipping),
    total: n(raw.total),
    cod_available: Boolean(raw.cod_available),
    cod_advance: n(raw.cod_advance),
    cod_advance_percent: n(raw.cod_advance_percent),
  };
}

export async function fetchQuote(lines: QuoteLine[], couponCode: string | null): Promise<OrderQuote> {
  const { data, error } = await supabase.rpc("quote_order" as never, { p_items: lines, p_coupon_code: couponCode } as never);
  if (error) throw new Error(error.message);
  return toQuote(data as unknown as Record<string, unknown>);
}

export function couponErrorMessage(err: CouponError, minOrder: number | null): string {
  switch (err) {
    case "not_found": return "That code doesn't exist.";
    case "inactive": return "That code is switched off.";
    case "not_started": return "That code isn't active yet.";
    case "expired": return "That code has expired.";
    case "not_yours": return "That code belongs to another account.";
    case "already_used": return "You've already used that code.";
    case "limit_reached": return "That code has been fully used.";
    case "first_order_only": return "That code is for your first order only.";
    case "min_order": return `Add items worth ₹${(minOrder ?? 0).toLocaleString("en-IN")} or more to use that code.`;
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
