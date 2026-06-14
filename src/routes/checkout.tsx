import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { useState, useEffect } from "react";
import { checkRateLimit, recordAttempt, formatMs } from "@/lib/rateLimit";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCart, formatINR } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { createOrder, listOrders } from "@/lib/orders";
import { openRazorpay } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";
import { pointsFromOrders, tierFor } from "@/lib/loyalty";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock, Sparkles, Truck } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — STUDIO/DENY" }] }),
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

type CodSettings = { cod_enabled: boolean; cod_advance_percent: number; cod_min_order: number };

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
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState<"razorpay" | "cod">("razorpay");
  const [codSettings, setCodSettings] = useState<CodSettings>({ cod_enabled: false, cod_advance_percent: 20, cod_min_order: 500 });

  const settings = getSettings();
  const userOrders = user ? listOrders().filter((o) => o.userEmail === user.email) : [];
  const points = pointsFromOrders(userOrders);
  const tier = tierFor(points);
  const discountPct = settings.discount[tier.name as keyof typeof settings.discount] ?? 0;
  const discount = Math.round(subtotal * (discountPct / 100));
  const ship = subtotal - discount >= settings.freeShipping ? 0 : 99;
  const total = Math.max(0, subtotal - discount + ship);
  const codAdvance = Math.round(total * (codSettings.cod_advance_percent / 100));
  const codAvailable = codSettings.cod_enabled && total >= codSettings.cod_min_order;

  useEffect(() => {
    supabase
      .from("settings")
      .select("cod_enabled, cod_advance_percent, cod_min_order")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setCodSettings({
          cod_enabled: data.cod_enabled ?? false,
          cod_advance_percent: data.cod_advance_percent ?? 20,
          cod_min_order: Number(data.cod_min_order ?? 500),
        });
      });
  }, []);

  // If COD becomes unavailable, reset to Razorpay
  useEffect(() => {
    if (!codAvailable && payMethod === "cod") setPayMethod("razorpay");
  }, [codAvailable]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? "", name: user?.name ?? "" },
  });

  const onSubmit = async (data: FormValues) => {
    if (items.length === 0) return toast.error("Your bag is empty");
    const rl = checkRateLimit("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
    if (!rl.allowed) {
      toast.error(`Too many orders placed. Try again in ${formatMs(rl.lockedUntil! - Date.now())}.`);
      return;
    }
    setPaying(true);
    const address = {
      name: data.name, phone: data.phone, line1: data.line1,
      city: data.city, state: data.state, pincode: data.pincode,
    };

    if (payMethod === "cod") {
      try {
        await openRazorpay({
          amountPaise: Math.round(codAdvance * 100),
          name: "STUDIO/DENY",
          description: `COD Advance — ${items.length} item(s)`,
          prefill: { name: data.name, email: data.email, contact: data.phone },
          notes: { city: data.city, pincode: data.pincode, payment_type: "cod_advance" },
          onDismiss: () => { setPaying(false); toast.error("Payment cancelled"); },
          onSuccess: (paymentId) => {
            const order = createOrder({
              email: data.email, items, shipping: ship, address, paymentId,
              discount,
              payment_method: "cod",
              cod_advance_paid: true,
              cod_advance_amount: codAdvance,
            });
            recordAttempt("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
            toast.success("COD order placed! Advance paid.");
            clear();
            navigate({ to: "/order/$id", params: { id: order.id } });
          },
        });
      } catch (e: any) {
        setPaying(false);
        toast.error(e?.message ?? "Payment failed to start");
      }
    } else {
      try {
        await openRazorpay({
          amountPaise: Math.round(total * 100),
          name: "STUDIO/DENY",
          description: `${items.length} item(s) — Drop 014`,
          prefill: { name: data.name, email: data.email, contact: data.phone },
          notes: { city: data.city, pincode: data.pincode },
          onDismiss: () => { setPaying(false); toast.error("Payment cancelled"); },
          onSuccess: (paymentId) => {
            const order = createOrder({
              email: data.email, items, shipping: ship, address, paymentId,
              discount,
              payment_method: "razorpay",
            });
            recordAttempt("checkout", 5, 30 * 60 * 1000, 30 * 60 * 1000);
            toast.success("Payment successful");
            clear();
            navigate({ to: "/order/$id", params: { id: order.id } });
          },
        });
      } catch (e: any) {
        setPaying(false);
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
                      Pay {codSettings.cod_advance_percent}% advance ({formatINR(codAdvance)}) now · Remaining on delivery
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
          <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm text-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">SUBTOTAL</span><span>{formatINR(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-secondary">
                <span className="flex items-center gap-1"><Sparkles className="size-3" /> {tier.name} −{discountPct}%</span>
                <span>−{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">SHIPPING</span><span>{ship === 0 ? "FREE" : formatINR(ship)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span>TOTAL</span><span className="text-display text-2xl">{formatINR(total)}</span>
            </div>
            {payMethod === "cod" && (
              <div className="border border-primary/30 bg-primary/5 p-3 mt-2">
                <div className="flex justify-between text-primary">
                  <span>PAY NOW (ADVANCE)</span><span>{formatINR(codAdvance)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs mt-1">
                  <span>PAY ON DELIVERY</span><span>{formatINR(total - codAdvance)}</span>
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={paying}
            className="w-full mt-5 bg-primary text-primary-foreground font-bold tracking-[0.2em] text-mono text-xs h-12 hover:glow-primary disabled:opacity-50"
          >
            {paying
              ? "PROCESSING…"
              : payMethod === "cod"
              ? `PAY ADVANCE ${formatINR(codAdvance)}`
              : `PAY ${formatINR(total)}`}
          </button>
        </aside>
      </form>
    </section>
  );
}
