import { useState, type FormEvent } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";
import type { SignupPopupConfig } from "@/lib/signupPopup";
import { fillTokens } from "@/lib/signupPopup";

export type SignupValues = { name: string; email: string; phone: string; password: string };

type Props = {
  cfg: SignupPopupConfig;
  stage: "form" | "success";
  code: string | null;
  discountLabel: string;
  error: string | null;
  submitting: boolean;
  onSubmit: (v: SignupValues) => void;
  onClose: () => void;
  onLogin: () => void;
  onCta: () => void;
  /** Admin preview: render inline (no fixed overlay) and force a device width. */
  preview?: boolean;
  device?: "desktop" | "mobile";
};

function validate(v: SignupValues): string | null {
  if (v.name.trim().length < 2) return "Enter your name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return "Enter a valid email";
  if (!/^[0-9]{10}$/.test(v.phone.trim())) return "Enter a 10-digit phone number";
  if (v.password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function SignupPopupView(p: Props) {
  const { cfg } = p;
  const [v, setV] = useState<SignupValues>({ name: "", email: "", phone: "", password: "" });
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isMobile = p.device === "mobile";
  const showMedia = cfg.layout !== "form_only";
  // On real phones the media panel follows show_media_on_mobile via CSS;
  // in the admin mobile preview we apply the same rule directly.
  const mediaClass = !showMedia ? "hidden" : isMobile ? (cfg.show_media_on_mobile ? "block h-40" : "hidden") : cfg.show_media_on_mobile ? "block h-40 md:h-auto" : "hidden md:block";
  const rowClass = isMobile ? "flex flex-col" : `flex flex-col md:flex-row ${cfg.layout === "media_right" ? "md:flex-row-reverse" : ""}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(v);
    setLocalError(problem);
    if (!problem) p.onSubmit(v);
  };

  const copy = async () => {
    if (!p.code) return;
    try { await navigator.clipboard.writeText(p.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const field = (key: keyof SignupValues, placeholder: string, type = "text") => (
    <input
      value={v[key]}
      onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))}
      placeholder={placeholder}
      type={type}
      inputMode={key === "phone" ? "numeric" : undefined}
      autoComplete={key === "password" ? "new-password" : key === "phone" ? "tel" : key}
      className="w-full h-11 px-3 border bg-transparent outline-none text-sm"
      style={{ borderColor: `${cfg.form_text_color}33`, color: cfg.form_text_color }}
    />
  );

  const card = (
    <div
      className={`relative w-full ${isMobile ? "max-w-[380px]" : "max-w-[880px]"} max-h-[92vh] overflow-y-auto ${rowClass}`}
      style={{ background: cfg.form_bg_color }}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.form_title}
    >
      <button type="button" onClick={p.onClose} aria-label="Close" className="absolute top-2 right-2 z-10 size-9 flex items-center justify-center" style={{ color: cfg.form_text_color }}>
        <X className="size-5" />
      </button>

      {/* Media / brand panel */}
      <div className={`relative overflow-hidden md:w-1/2 md:min-h-[440px] ${mediaClass}`} style={{ background: cfg.bg_color }}>
        {cfg.bg_type === "image" && cfg.bg_image_url && <img src={cfg.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {cfg.bg_type === "video" && cfg.bg_video_url && <video src={cfg.bg_video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />}
        {cfg.bg_type !== "color" && <div className="absolute inset-0" style={{ background: cfg.overlay_color, opacity: cfg.overlay_opacity / 100 }} />}
        <div className="relative h-full flex flex-col items-center justify-center text-center p-6 md:p-10 gap-3">
          {cfg.logo_url && <img src={cfg.logo_url} alt="" className="h-10 md:h-14 object-contain" />}
          <h2 className="text-display text-2xl md:text-4xl leading-tight" style={{ color: cfg.heading_color }}>{cfg.heading}</h2>
          <p className="text-sm md:text-base" style={{ color: cfg.subheading_color }}>{cfg.subheading}</p>
        </div>
      </div>

      {/* Form / success panel */}
      <div className={`${showMedia && !isMobile ? "md:w-1/2" : "w-full"} p-6 md:p-10 flex flex-col justify-center`} style={{ color: cfg.form_text_color }}>
        {p.stage === "form" ? (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div className="text-center mb-2">
              <h3 className="text-xl font-bold">{cfg.form_title}</h3>
              <p className="text-sm opacity-70">{cfg.form_subtitle}</p>
            </div>
            {field("name", cfg.name_placeholder)}
            {field("email", cfg.email_placeholder, "email")}
            {field("phone", cfg.phone_placeholder, "tel")}
            {field("password", cfg.password_placeholder, "password")}
            {(localError || p.error) && <p className="text-xs text-red-600">{localError || p.error}</p>}
            <button type="submit" disabled={p.submitting} className="w-full h-11 font-semibold text-sm tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: cfg.submit_bg_color, color: cfg.submit_text_color }}>
              {p.submitting && <Loader2 className="size-4 animate-spin" />} {cfg.submit_text}
            </button>
            <button type="button" onClick={p.onLogin} className="w-full text-xs underline opacity-80">{cfg.login_link_text}</button>
            <p className="text-[11px] opacity-60 text-center">{cfg.terms_text}</p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">{cfg.success_heading}</h3>
            {/* No code issued (welcome offer switched off) → skip the code message rather than show it with a blank. */}
            {p.code && <p className="text-sm opacity-80">{fillTokens(cfg.success_body, { code: p.code, discount: p.discountLabel })}</p>}
            {p.code && (
              <div className="flex items-stretch border" style={{ borderColor: `${cfg.form_text_color}55` }}>
                <span className="flex-1 text-mono text-lg tracking-[0.2em] py-3">{p.code}</span>
                <button type="button" onClick={copy} className="px-4 text-xs font-semibold tracking-widest inline-flex items-center gap-2" style={{ background: cfg.submit_bg_color, color: cfg.submit_text_color }}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "COPIED" : cfg.copy_button_text}
                </button>
              </div>
            )}
            <button type="button" onClick={p.onCta} className="w-full h-11 border font-semibold text-sm tracking-wider" style={{ borderColor: cfg.form_text_color }}>
              {cfg.cta_text}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (p.preview) return <div className="flex justify-center p-4 bg-black/60">{card}</div>;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      {card}
    </div>
  );
}
