// Checkout "Apply coupon" sheet, Myntra/Ajio style: type a code, or pick
// one from every live coupon. Usable coupons show what they save on this
// bag; the rest are greyed out with what's missing.
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Tag, X } from "lucide-react";
import { formatINR } from "@/context/CartContext";
import { couponBlockedReason, couponLabel, couponTerms, type AvailableCoupon } from "@/lib/coupons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = loading, null = couldn't load. */
  coupons: AvailableCoupon[] | null | undefined;
  appliedCode: string | null;
  checkingCode: string | null;
  message: string | null;
  onApply: (code: string) => void;
};

export function CouponSheet({ open, onOpenChange, coupons, appliedCode, checkingCode, message, onApply }: Props) {
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  // Each time it opens: the applied code, else the biggest saving, is ticked.
  useEffect(() => {
    if (!open) return;
    setTyped("");
    const usable = (coupons ?? []).filter((c) => !c.error);
    setPicked(usable.find((c) => c.code === appliedCode)?.code ?? usable[0]?.code ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickedCoupon = coupons?.find((c) => c.code === picked && !c.error);
  const busy = checkingCode !== null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[130] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed z-[131] inset-x-0 bottom-0 max-h-[88dvh] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[80vh] bg-background border border-border flex flex-col outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4"
        >
          <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-display text-2xl tracking-wider">APPLY COUPON</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="size-10 -mr-2 flex items-center justify-center hover:text-primary">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) { e.preventDefault(); onApply(typed); } }}
                placeholder="ENTER COUPON CODE"
                aria-label="Coupon code"
                className="flex-1 min-w-0 bg-background border border-border h-11 px-3 text-mono text-xs tracking-widest uppercase focus:border-primary outline-none"
              />
              <button
                type="button"
                disabled={!typed.trim() || busy}
                onClick={() => onApply(typed)}
                className="border border-foreground px-4 h-11 text-mono text-[11px] tracking-widest hover:bg-foreground hover:text-background disabled:opacity-40 disabled:pointer-events-none"
              >
                CHECK
              </button>
            </div>
            {message && <p className="text-xs text-primary mt-2">{message}</p>}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3" data-lenis-prevent>
            {coupons === undefined ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs py-6 justify-center">
                <Loader2 className="size-4 animate-spin" /> LOADING COUPONS…
              </div>
            ) : !coupons || coupons.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                {coupons === null ? "Couldn't load coupons — you can still type a code above." : "No coupons available right now."}
              </p>
            ) : (
              coupons.map((c) => {
                const usable = !c.error;
                const isPicked = usable && picked === c.code;
                const reason = couponBlockedReason(c);
                const terms = couponTerms(c);
                return (
                  <button
                    key={c.code}
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={!usable}
                    onClick={() => setPicked(c.code)}
                    className={`w-full text-left border p-3.5 flex gap-3 transition-colors ${
                      isPicked ? "border-foreground bg-surface" : "border-border"
                    } ${usable ? "hover:border-foreground" : "opacity-55 cursor-not-allowed"}`}
                  >
                    <span
                      className={`mt-0.5 size-4 shrink-0 border flex items-center justify-center ${isPicked ? "border-foreground bg-foreground" : "border-foreground/40"}`}
                    >
                      {isPicked && <span className="size-1.5 bg-background" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="border border-dashed border-foreground/60 px-2 py-0.5 text-mono text-xs tracking-widest font-semibold truncate">
                          {c.code}
                        </span>
                        {usable && (
                          <span className="text-mono text-xs font-semibold whitespace-nowrap">SAVE {formatINR(c.discount)}</span>
                        )}
                      </span>
                      <span className="block text-sm font-medium mt-2">
                        {couponLabel(c)}
                        {c.kind !== "general" && <span className="text-muted-foreground font-normal"> · your {c.kind} offer</span>}
                      </span>
                      {terms && <span className="block text-xs text-muted-foreground mt-0.5">{terms}</span>}
                      {reason && <span className="block text-xs text-primary mt-1.5">{reason}</span>}
                      {c.code === appliedCode && usable && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-mono text-[10px] tracking-widest"><Tag className="size-3" /> APPLIED</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-4 shrink-0">
            <div>
              <div className="text-[11px] text-muted-foreground">You save</div>
              <div className="text-mono font-semibold">{formatINR(pickedCoupon?.discount ?? 0)}</div>
            </div>
            <button
              type="button"
              disabled={!pickedCoupon || busy}
              onClick={() => pickedCoupon && onApply(pickedCoupon.code)}
              className="h-11 px-8 bg-primary text-primary-foreground text-mono text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />} APPLY
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
