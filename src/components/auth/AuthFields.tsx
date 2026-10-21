import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Text field with a floating label and an underline that draws in on focus.
 *
 * Works directly with react-hook-form's `register()` (it forwards the ref).
 * The label is a real <label htmlFor>, and the error is tied to the input with
 * aria-describedby / aria-invalid, so screen readers announce both — the old
 * forms had visible labels that weren't connected to their inputs.
 *
 * The floating works off `placeholder=" "` + :placeholder-shown: the label
 * sits in the field while it is empty and unfocused, and lifts otherwise —
 * including when the browser autofills it.
 */
export const AuthField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    prefix?: string;
    hint?: ReactNode;
  }
>(function AuthField({ label, error, prefix, hint, type = "text", className, ...rest }, ref) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="relative pt-5">
      <div className="relative flex items-end">
        {prefix && (
          <span
            className="pb-2.5 pr-2 text-base font-medium text-foreground/50 select-none"
            aria-hidden
          >
            {prefix}
          </span>
        )}
        <input
          {...rest}
          ref={ref}
          id={id}
          type={isPassword && reveal ? "text" : type}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`peer w-full bg-transparent pb-2.5 pt-1 text-base font-medium text-foreground outline-none ${isPassword ? "pr-10" : ""} ${className ?? ""}`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute origin-left text-mono uppercase tracking-[0.22em] transition-all duration-300 ease-out
            ${
              prefix
                ? "left-0 -top-5 text-[10px] text-foreground/60"
                : `left-0 -top-5 text-[10px] text-foreground/60
            peer-placeholder-shown:top-1 peer-placeholder-shown:text-[12px] peer-placeholder-shown:text-foreground/45
            peer-focus:-top-5 peer-focus:text-[10px] peer-focus:text-foreground`
            }
            ${error ? "!text-accent" : ""}`}
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute right-0 bottom-2 flex size-8 items-center justify-center text-foreground/45 hover:text-foreground transition-colors"
          >
            {reveal ? (
              <EyeOff className="size-4" strokeWidth={1.75} />
            ) : (
              <Eye className="size-4" strokeWidth={1.75} />
            )}
          </button>
        )}
        {/* Resting line, and a solid one that draws in from the left on focus. */}
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-px ${error ? "bg-accent" : "bg-foreground/20"}`}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-foreground origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-medium text-accent">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-2">
          {hint}
        </div>
      ) : null}
    </div>
  );
});

/** Four-step bar under the signup password. Guidance only — not enforced. */
export function PasswordStrength({ value }: { value: string }) {
  const score = !value
    ? 0
    : [
        value.length >= 6,
        value.length >= 10,
        /[a-z]/.test(value) && /[A-Z]/.test(value),
        /\d/.test(value) && /[^A-Za-z0-9]/.test(value),
      ].filter(Boolean).length;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 transition-colors duration-300 ${i <= score ? (score <= 1 ? "bg-accent" : "bg-foreground") : "bg-foreground/10"}`}
          />
        ))}
      </div>
      <span className="w-14 text-right text-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
        {label}
      </span>
    </div>
  );
}

/** Primary action: black, with the site's white fill sweep and an arrow. */
export function AuthSubmit({
  loading,
  disabled,
  children,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="btn-fill group relative mt-2 flex h-14 w-full items-center justify-center bg-foreground text-mono text-xs font-bold uppercase tracking-[0.25em] disabled:opacity-50 disabled:pointer-events-none"
    >
      <span className="btn-fill-bg bg-white border border-foreground" aria-hidden />
      <span className="btn-fill-front inline-flex items-center gap-3 text-white">
        {loading ? <Loader2 className="size-4 animate-spin" /> : children}
        {!loading && (
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
        )}
      </span>
      <span className="btn-fill-back inline-flex items-center gap-3 text-foreground" aria-hidden>
        {children}
        <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

export function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex h-13 w-full items-center justify-center gap-3 border border-foreground/15 bg-white/60 py-3.5 text-sm font-semibold text-foreground transition-all duration-300 hover:border-foreground hover:bg-white disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <svg
          className="size-5 transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 48 48"
          aria-hidden
        >
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 7.1 29.4 5 24 5 16.3 5 9.6 9.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.4 39.6 16.1 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.2c-.4.4 6.4-4.7 6.4-14.6 0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
      )}
      Continue with Google
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-8 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-foreground/10" />
      <span className="text-mono text-[10px] tracking-[0.3em] text-foreground/45">
        OR WITH EMAIL
      </span>
      <span className="h-px flex-1 bg-foreground/10" />
    </div>
  );
}

export function LockoutNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="mb-6 border-l-2 border-accent bg-accent/5 px-4 py-3 text-mono text-[11px] tracking-[0.15em] text-foreground/75"
    >
      {children}
    </div>
  );
}
