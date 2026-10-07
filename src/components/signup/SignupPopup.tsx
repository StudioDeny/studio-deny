import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { myWelcomeCoupon, couponLabel } from "@/lib/coupons";
import {
  DEFAULT_SIGNUP_POPUP, fetchSignupPopup, readDismissedAt, shouldShowSignupPopup, writeDismissedAt,
  type SignupPopupConfig,
} from "@/lib/signupPopup";
import { SignupPopupView, type SignupValues } from "./SignupPopupView";

/** Signup popup for logged-out visitors. Everything it shows comes from admin → Signup Popup. */
export function SignupPopup() {
  const { user, loading, signup } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<SignupPopupConfig>(DEFAULT_SIGNUP_POPUP);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [discountLabel, setDiscountLabel] = useState("");
  // Closed during this page visit: never re-arm until reload, even when
  // reshow_after_hours is 0 (otherwise it would pop back every delay).
  const [closedThisVisit, setClosedThisVisit] = useState(false);
  // True while OUR signup runs, so the new session doesn’t close the popup
  // before the success screen (with the code) is shown.
  const signingUp = useRef(false);

  useEffect(() => { fetchSignupPopup().then((c) => { setCfg(c); setLoaded(true); }); }, []);

  // Schedule the popup for logged-out visitors on allowed pages.
  useEffect(() => {
    if (!loaded || loading || user || open || closedThisVisit || !cfg.enabled) return;
    if (!shouldShowSignupPopup({ pathname, showOn: cfg.show_on, dismissedAt: readDismissedAt(), reshowAfterHours: cfg.reshow_after_hours, now: Date.now() })) return;
    const t = setTimeout(() => setOpen(true), Math.max(0, cfg.delay_seconds) * 1000);
    return () => clearTimeout(t);
  }, [loaded, loading, user, open, closedThisVisit, cfg, pathname]);

  // Logging in some other way closes the form (but not the success screen).
  useEffect(() => { if (user && stage === "form" && !signingUp.current) setOpen(false); }, [user, stage]);

  const close = () => { writeDismissedAt(Date.now()); setClosedThisVisit(true); setOpen(false); setStage("form"); setError(null); };

  const onSubmit = async (v: SignupValues) => {
    setSubmitting(true);
    setError(null);
    signingUp.current = true;
    try {
      await signup(v.email.trim(), v.password, v.name.trim(), v.phone.trim());
      // The signup trigger issues the code synchronously, so it exists now.
      const c = await myWelcomeCoupon();
      setCode(c?.code ?? null);
      setDiscountLabel(c ? couponLabel(c).toLowerCase() : "");
      setStage("success");
      writeDismissedAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      setError(/already registered|already exists/i.test(msg) ? "You already have an account — log in instead." : msg);
    } finally {
      signingUp.current = false;
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <SignupPopupView
      cfg={cfg}
      stage={stage}
      code={code}
      discountLabel={discountLabel}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      onClose={close}
      onLogin={() => { close(); navigate({ to: "/login" }); }}
      onCta={() => { close(); navigate({ to: cfg.cta_href as never }); }}
    />
  );
}
