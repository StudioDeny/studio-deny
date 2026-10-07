import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { useState, useEffect } from "react";
import { checkRateLimit, recordAttempt, formatMs } from "@/lib/rateLimit";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCart, formatINR } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { createOrder, ordersFor, type Order } from "@/lib/orders";
import { openRazorpay, CouponRejectedError } from "@/lib/razorpay";
import { getLoyaltySettings, DEFAULT_LOYALTY_SETTINGS } from "@/lib/settings";
import { pointsFromOrders, tierFor } from "@/lib/loyalty";
import { fetchQuote, quoteLines, couponErrorMessage, couponLabel, couponStatus, myWelcomeCoupon, type OrderQuote } from "@/lib/coupons";
import type { Coupon } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock, Sparkles, Truck, Tag, X } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^\+?[0-9 -]{10,15}$/, "Enter a valid phone"),
  line1: z.string().min(5).max(120),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  pincode: z.string().regex(/^[0-9]{6}$/, "6-digit pincode"),
});
type FormValues = z.infer<typeof schema>;

function FieldImpl(props: {
  label: string;
  name: keyof FormValues;
  type?: string;
  placeholder?: string;
  full?: boolean;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}) {
  return (
    <div className={props.full ? "sm:col-span-2" : ""}>
      <label className="text-mono text-[10px] tracking-widest text-muted-foreground">{props.label}</label>
      <input
        {...props.register(props.name)}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        className="mt-1 w-full bg-surface border border-border h-11 px-3 focus:border-primary outline-none"
      />
      {props.errors[props.name] && <p className="text-xs text-primary mt-1">{props.errors[props.name]?.message as string}</p>}
    </div>
  );
}

function Checkout() {
  const { items, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState<"razorpay" | "cod">("razorpay");

  // Loyalty tier is only used for the summary LABEL; the amount comes from the server quote.
  const [settings, setSettings] = useState(DEFAULT_LOYALTY_SETTINGS);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (user) ordersFor(user.email).then(setUserOrders);
  }, [user]);
  useEffect(() => { getLoyaltySettings().then(setSettings); }, []);
  const tier = tierFor(pointsFromOrders(userOrders));
  const discountPct = settings.discount[tier.name as keyof typeof settings.discount] ?? 0;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<Coupon | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    myWelcomeCoupon().then((c) => setWelcome(c && couponStatus(c) === "active" ? c : null));
  }, [user]);

  // Re-price whenever the bag or the applied code changes. The server is
  // the only place money is computed.
  const linesKey = JSON.stringify(quoteLines(items));
  useEffect(() => {
    if (!user || items.length === 0) return;
    let cancelled = false;
    setQuoteFailed(false);
    fetchQuote(quoteLines(items), appliedCoupon)
      .then((q) => {
        if (cancelled) return;
        if (appliedCoupon && q.coupon_error) {
          setCouponMsg(couponErrorMessage(q.coupon_error, q.coupon_min_order));
          setAppliedCoupon(null);
          return;
        }
        setQuote(q);
      })
      .catch(() => { if (!cancelled) setQuoteFailed(true); });
    return () => { cancelled = true; };
  }, [user, linesKey, appliedCoupon]);

  const applyCoupon = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setCouponMsg(null);
    setAppliedCoupon(c);
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponMsg(null); };

  const codAvailable = quote?.cod_available ?? false;

  // If COD becomes unavailable, reset to Razorpay
  useEffect(() => {
    if (!codAvailable && payMethod === "cod") setPayMethod("razorpay");
  }, [codAvailable]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? "", name: user?.name ?? "" },
  });

  // Asks the database whether every bag line still has enough stock, so we
  // never take money for a size that just sold out. Returns a message or null.
  const stockProblem = async (): Promise<string | null> => {
    const lines = items.filter((i) => i.variantId).map((i) => ({ variant_id: i.variantId, qty: i.qty }));
    if (lines.length === 0) return null;
    const { data, error } = await supabase.rpc("check_cart_stock" as never, { p_items: lines } as never);
    if (error) return null; // a failed check never blocks payment; stock is still recorded on the order
    const short = (data ?? []) as unknown as { variant_id: string; size: string | null; color: string | null; available: number }[];
    if (short.length === 0) return null;
    return short
      .map((s) => {
        const name = items.find((i) => i.variantId === s.variant_id)?.product.name ?? "An item";
        const opt = [s.color, s.size].filter(Boolean).join(" / ");
        return s.available === 0 ? `${name} (${opt}) just sold out` : `Only ${s.available} left of ${name} (${opt})`;
      })
      .join(". ") + ". Please update your bag.";
  };

  const onSubmit = async (data: FormValues) => {
    if (items.length === 0) return toast.error("Your bag is empty");
    if (!quote) return toast.error("Still pricing your bag — try again in a second");
    const rl = checkRateLimit("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
    if (!rl.allowed) {
      toast.error(`Too many orders placed. Try again in ${formatMs(rl.lockedUntil! - Date.now())}.`);
      return;
    }
    setPaying(true);
    const problem = await stockProblem();
    if (problem) {
      setPaying(false);
      toast.error(problem, { duration: 8000 });
      return;
    }
    const address = {
      name: data.name, phone: data.phone, line1: data.line1,
      city: data.city, state: data.state, pincode: data.pincode,
    };

    if (payMethod === "cod") {
      try {
        await openRazorpay({
          checkout: { items: quoteLines(items), couponCode: appliedCoupon, paymentType: "cod_advance" },
          name: "STUDIO DENY",
          description: `COD Advance — ${items.length} item(s)`,
          prefill: { name: data.name, email: data.email, contact: data.phone },
          notes: { city: data.city, pincode: data.pincode, payment_type: "cod_advance" },
          onDismiss: () => { setPaying(false); toast.error("Payment cancelled"); },
          onVerifyFailed: (message) => { setPaying(false); toast.error(message); },
          onSuccess: async (paymentId, paidQuote) => {
            try {
              const order = await createOrder({
                email: data.email, userId: user?.id, items, address, paymentId,
                quote: paidQuote,
                payment_method: "cod",
                cod_advance_paid: true,
              });
              recordAttempt("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
              toast.success("COD order placed! Advance paid.");
              clear();
              navigate({ to: "/order/$id", params: { id: order.id } });
            } catch {
              setPaying(false);
              toast.error(`Payment succeeded (${paymentId}) but saving the order failed. Contact support.`);
            }
          },
        });
      } catch (e: any) {
        setPaying(false);
        if (e instanceof CouponRejectedError) {
          setCouponMsg(couponErrorMessage(e.couponError, null));
          setAppliedCoupon(null);
          return;
        }
        toast.error(e?.message ?? "Payment failed to start");
      }
    } else {
      try {
        await openRazorpay({
          checkout: { items: quoteLines(items), couponCode: appliedCoupon, paymentType: "full" },
          name: "STUDIO DENY",
          description: `${items.length} item(s) — Drop 014`,
          prefill: { name: data.name, email: data.email, contact: data.phone },
          notes: { city: data.city, pincode: data.pincode },
          onDismiss: () => { setPaying(false); toast.error("Payment cancelled"); },
          onVerifyFailed: (message) => { setPaying(false); toast.error(message); },
          onSuccess: async (paymentId, paidQuote) => {
            try {
              const order = await createOrder({
                email: data.email, userId: user?.id, items, address, paymentId,
                quote: paidQuote,
                payment_method: "razorpay",
              });
              recordAttempt("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
              toast.success("Payment successful");
              clear();
              navigate({ to: "/order/$id", params: { id: order.id } });
            } catch {
              setPaying(false);
              toast.error(`Payment succeeded (${paymentId}) but saving the order failed. Contact support.`);
            }
          },
        });
      } catch (e: any) {
        setPaying(false);
        if (e instanceof CouponRejectedError) {
          setCouponMsg(couponErrorMessage(e.couponError, null));
          setAppliedCoupon(null);
          return;
        }
        toast.error(e?.message ?? "Payment failed to start");
      }
    }
  };

  if (items.length === 0) {
    return (
      <section className="px-4 md:px-8 py-24 text-center">
        <h1 className="text-display text-5xl">NOTHING TO CHECKOUT</h1>
        <Link to="/shop" className="mt-6 inline-block text-mono text-xs tracking-widest text-primary hover:underline">→ SHOP</Link>
      </section>
    );
  }

  if (!authLoading && !user) {
    return (
      <section className="px-4 md:px-8 py-24 min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-4">◢ REQUIRED</div>
        <h1 className="text-display text-5xl md:text-6xl mb-4">LOGIN TO ORDER</h1>
        <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
          Create an account or sign in to complete your purchase and track your orders.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link to="/login" className="bg-primary text-primary-foreground px-8 py-3.5 text-mono text-xs tracking-widest hover:opacity-90 transition-opacity">
            LOGIN
          </Link>
          <Link to="/signup" className="border border-border px-8 py-3.5 text-mono text-xs tracking-widest hover:border-primary hover:text-primary transition-colors">
            CREATE ACCOUNT
          </Link>
        </div>
      </section>
    );
  }

  const Field = (props: { label: string; name: keyof FormValues; type?: string; placeholder?: string; full?: boolean }) => (
    <FieldImpl {...props} register={register} errors={errors} />
  );

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ STEP 02</div>
      <h1 className="text-display text-5xl md:text-7xl mb-8">CHECKOUT.</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-display text-2xl tracking-wider mb-4">CONTACT</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="EMAIL" name="email" type="email" full />
            </div>
          </div>
          <div>
            <h2 className="text-display text-2xl tracking-wider mb-4">SHIPPING ADDRESS</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="FULL NAME" name="name" />
              <Field label="PHONE" name="phone" placeholder="+91 9876543210" />
              <Field label="ADDRESS" name="line1" full />
              <Field label="CITY" name="city" />
              <Field label="STATE" name="state" />
              <Field label="PINCODE" name="pincode" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h2 className="text-display text-2xl tracking-wider mb-4">PAYMENT</h2>
            <div className="space-y-3">
              {/* Razorpay option */}
              <label
                className={`flex items-center gap-3 border p-4 bg-surface cursor-pointer transition-colors ${
                  payMethod === "razorpay" ? "border-primary" : "border-border hover:border-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="razorpay"
                  checked={payMethod === "razorpay"}
                  onChange={() => setPayMethod("razorpay")}
                  className="accent-primary"
                />
                <div className="size-10 bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">RZP</div>
                <div>
                  <div className="font-semibold text-sm">Razorpay — Pay Now</div>
                  <div className="text-xs text-muted-foreground">UPI · Cards · Netbanking · Wallets</div>
                </div>
              </label>

              {/* COD option — only shown if eligible */}
              {codAvailable && (
                <label
                  className={`flex items-center gap-3 border p-4 bg-surface cursor-pointer transition-colors ${
                    payMethod === "cod" ? "border-primary" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value="cod"
                    checked={payMethod === "cod"}
                    onChange={() => setPayMethod("cod")}
                    className="accent-primary"
                  />
                  <Truck className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">
                      Pay {quote?.cod_advance_percent ?? 0}% advance ({formatINR(quote?.cod_advance ?? 0)}) now · Remaining on delivery
                    </div>
                  </div>
                </label>
              )}
            </div>
            <p className="text-[10px] text-mono tracking-widest text-muted-foreground mt-2 flex items-center gap-1">
              <Lock className="size-3" /> SECURED 256-BIT TLS
            </p>
          </div>
        </div>

        <aside className="bg-surface border border-border p-6 h-fit lg:sticky lg:top-28">
          <h2 className="text-display text-2xl mb-4 tracking-wider">ORDER</h2>
          <ul className="space-y-3 max-h-72 overflow-y-auto">
            {items.map((it) => (
              <li key={it.product.slug + it.size} className="flex gap-3 text-sm">
                <div className="w-14 h-16 bg-muted overflow-hidden shrink-0">
                  <img src={it.product.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs">{it.product.name}</div>
                  <div className="text-[10px] text-mono text-muted-foreground">{it.size} × {it.qty}</div>
                </div>
                <div className="text-mono text-xs">{formatINR(it.product.price * it.qty)}</div>
              </li>
            ))}
          </ul>
          {/* Coupon */}
          <div className="border-t border-border mt-4 pt-4">
            {appliedCoupon && quote?.coupon_code ? (
              <div className="flex items-center justify-between border border-primary/40 bg-primary/5 px-3 h-10">
                <span className="text-mono text-xs tracking-widest flex items-center gap-2"><Tag className="size-3.5" /> {quote.coupon_code}</span>
                <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(couponInput); } }}
                    placeholder="COUPON CODE"
                    className="flex-1 min-w-0 bg-background border border-border h-10 px-3 text-mono text-xs tracking-widest uppercase focus:border-primary outline-none"
                  />
                  <button type="button" onClick={() => applyCoupon(couponInput)} className="border border-border px-4 h-10 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary">
                    APPLY
                  </button>
                </div>
                {welcome && (
                  <button
                    type="button"
                    onClick={() => applyCoupon(welcome.code)}
                    className="mt-2 w-full text-left border border-dashed border-primary/50 px-3 py-2 text-xs hover:bg-primary/5"
                  >
                    Your welcome offer <span className="text-mono font-semibold">{welcome.code}</span> — {couponLabel(welcome)} · <span className="text-primary">APPLY</span>
                  </button>
                )}
              </>
            )}
            {couponMsg && <p className="text-xs text-primary mt-2">{couponMsg}</p>}
          </div>

          <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm text-mono">
            {!quote ? (
              <div className="text-muted-foreground text-xs">{quoteFailed ? "COULD NOT PRICE YOUR BAG — REFRESH" : "PRICING…"}</div>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">SUBTOTAL</span><span>{formatINR(quote.subtotal)}</span></div>
                {quote.loyalty_discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span className="flex items-center gap-1"><Sparkles className="size-3" /> {tier.name} −{discountPct}%</span>
                    <span>−{formatINR(quote.loyalty_discount)}</span>
                  </div>
                )}
                {quote.coupon_discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span className="flex items-center gap-1"><Tag className="size-3" /> {quote.coupon_code}</span>
                    <span>−{formatINR(quote.coupon_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">SHIPPING</span><span>{quote.shipping === 0 ? "FREE" : formatINR(quote.shipping)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span>TOTAL</span><span className="text-display text-2xl">{formatINR(quote.total)}</span>
                </div>
                {payMethod === "cod" && (
                  <div className="border border-primary/30 bg-primary/5 p-3 mt-2">
                    <div className="flex justify-between text-primary">
                      <span>PAY NOW (ADVANCE)</span><span>{formatINR(quote.cod_advance)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-xs mt-1">
                      <span>PAY ON DELIVERY</span><span>{formatINR(quote.total - quote.cod_advance)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={paying || !quote}
            className="w-full mt-5 bg-primary text-primary-foreground font-bold tracking-[0.2em] text-mono text-xs h-12 hover:glow-primary disabled:opacity-50"
          >
            {paying
              ? "PROCESSING…"
              : !quote
              ? "PRICING…"
              : payMethod === "cod"
              ? `PAY ADVANCE ${formatINR(quote.cod_advance)}`
              : `PAY ${formatINR(quote.total)}`}
          </button>
        </aside>
      </form>
    </section>
  );
}
