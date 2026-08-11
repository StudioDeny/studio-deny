// Razorpay checkout. The order is created server-side (Edge Function
// razorpay-create-order) and the payment signature is verified server-side
// (razorpay-verify-payment) before onSuccess ever fires — the browser's
// "payment succeeded" callback alone is never trusted.
import { supabase } from "@/lib/supabase";

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

async function createRazorpayOrder(amountPaise: number, notes?: Record<string, string>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: { amount: amountPaise, currency: "INR", notes },
  });
  if (error || !data?.order_id) {
    throw new Error(error?.message ?? "Could not start payment — try again");
  }
  return data.order_id as string;
}

export type RzpOpts = {
  amountPaise: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  onSuccess: (paymentId: string) => void | Promise<void>;
  onDismiss: () => void;
  onVerifyFailed: (message: string) => void;
};

export async function openRazorpay(opts: RzpOpts) {
  const ok = await loadRazorpay();
  if (!ok) throw new Error("Failed to load Razorpay. Check your connection.");

  const orderId = await createRazorpayOrder(opts.amountPaise, opts.notes);

  const rzp = new (window as any).Razorpay({
    key: RAZORPAY_KEY_ID,
    order_id: orderId,
    amount: opts.amountPaise,
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
        opts.onVerifyFailed(error?.message ?? "Payment could not be verified. Contact support if you were charged.");
        return;
      }
      await opts.onSuccess(resp.razorpay_payment_id);
    },
    modal: { ondismiss: opts.onDismiss, backdropclose: false, escape: true },
  });
  rzp.on("payment.failed", (resp: any) => {
    // surface but do not throw — checkout already closed
    console.error("Razorpay failure", resp?.error);
  });
  rzp.open();
}
