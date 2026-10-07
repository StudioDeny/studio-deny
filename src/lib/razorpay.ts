// Razorpay checkout. The order is created server-side (Edge Function
// razorpay-create-order) and the payment signature is verified server-side
// (razorpay-verify-payment) before onSuccess ever fires — the browser's
// "payment succeeded" callback alone is never trusted.
import { supabase } from "@/lib/supabase";
import { toQuote, type OrderQuote, type QuoteLine, type CouponError } from "@/lib/coupons";

export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) || "rzp_test_Smq00oQl4okg6L";

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export class CouponRejectedError extends Error {
  constructor(public couponError: CouponError, public minOrder: number | null = null) { super("coupon_invalid"); }
}

type CheckoutRequest = { items: QuoteLine[]; couponCode: string | null; paymentType: "full" | "cod_advance" };

async function createRazorpayOrder(
  checkout: CheckoutRequest,
  notes?: Record<string, string>,
): Promise<{ orderId: string; amountPaise: number; quote: OrderQuote }> {
  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: { items: checkout.items, coupon_code: checkout.couponCode, payment_type: checkout.paymentType, notes },
  });
  if (error) {
    // supabase-js hides non-2xx bodies behind error.context (a Response).
    let body: { error?: string; coupon_error?: CouponError; coupon_min_order?: number | null } = {};
    try { body = await (error as { context?: Response }).context?.json(); } catch { /* keep {} */ }
    if (body.error === "coupon_invalid" && body.coupon_error) throw new CouponRejectedError(body.coupon_error, body.coupon_min_order ?? null);
    throw new Error(body.error ?? "Could not start payment — try again");
  }
  if (!data?.order_id) throw new Error("Could not start payment — try again");
  return { orderId: data.order_id as string, amountPaise: Number(data.amount), quote: toQuote(data.quote) };
}

// Best-effort — a payment-failed WhatsApp nudge is a nice-to-have, never a
// reason to disrupt the checkout error flow the caller already shows.
function queuePaymentFailedNotice(phone: string, name: string) {
  supabase.functions.invoke("queue-payment-failed", { body: { phone, name } }).catch(() => {});
}

export type RzpOpts = {
  checkout: CheckoutRequest;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  onSuccess: (paymentId: string, quote: OrderQuote) => void | Promise<void>;
  onDismiss: () => void;
  onVerifyFailed: (message: string) => void;
};

export async function openRazorpay(opts: RzpOpts) {
  const ok = await loadRazorpay();
  if (!ok) throw new Error("Failed to load Razorpay. Check your connection.");

  const { orderId, amountPaise, quote } = await createRazorpayOrder(opts.checkout, opts.notes);

  const rzp = new (window as any).Razorpay({
    key: RAZORPAY_KEY_ID,
    order_id: orderId,
    amount: amountPaise,
    currency: "INR",
    name: opts.name,
    description: opts.description,
    image: "/favicon.ico",
    prefill: opts.prefill,
    notes: opts.notes,
    theme: { color: "#ff3b1f" },
    handler: async (resp: any) => {
      const { data, error } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        },
      });
      if (error || !data?.verified) {
        queuePaymentFailedNotice(opts.prefill.contact, opts.prefill.name);
        opts.onVerifyFailed(error?.message ?? "Payment could not be verified. Contact support if you were charged.");
        return;
      }
      await opts.onSuccess(resp.razorpay_payment_id, quote);
    },
    modal: { ondismiss: opts.onDismiss, backdropclose: false, escape: true },
  });
  rzp.on("payment.failed", (resp: any) => {
    // surface but do not throw — checkout already closed
    console.error("Razorpay failure", resp?.error);
    queuePaymentFailedNotice(opts.prefill.contact, opts.prefill.name);
  });
  rzp.open();
}
