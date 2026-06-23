import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { checkRateLimit, recordAttempt, clearRateLimit, formatMs } from "@/lib/rateLimit";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Login — STUDIO/DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Min 6 characters"),
});
type V = z.infer<typeof schema>;

function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(() => {
    const check = checkRateLimit("login");
    return check.lockedUntil;
  });
  const [remaining, setRemaining] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const left = lockoutEnd - Date.now();
      if (left <= 0) { setLockoutEnd(null); setRemaining(0); clearRateLimit("login"); }
      else setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutEnd]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await loginWithGoogle(); toast.success("Signed in with Google"); navigate({ to: "/account" }); }
    catch { toast.error("Google sign-in failed"); }
    finally { setGoogleLoading(false); }
  };

  return (
    <section className="px-4 md:px-8 py-12 max-w-md mx-auto">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ MEMBERS</div>
      <h1 className="text-display text-6xl mb-2">LOG IN.</h1>
      <p className="text-muted-foreground text-sm mb-8">No account? <Link to="/signup" className="text-primary hover:underline">SIGN UP</Link></p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full border border-border bg-white text-neutral-900 h-12 inline-flex items-center justify-center gap-3 text-sm font-semibold hover:bg-neutral-100 transition-colors disabled:opacity-50 mb-3"
      >
        <svg className="size-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 7.1 29.4 5 24 5 16.3 5 9.6 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.4 39.6 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.2c-.4.4 6.4-4.7 6.4-14.6 0-1.3-.1-2.4-.4-3.5z"/></svg>
        {googleLoading ? "..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-mono text-[10px] tracking-widest text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {lockoutEnd && remaining > 0 && (
        <div className="mb-4 border border-border/50 bg-surface/40 px-4 py-3 text-mono text-[11px] tracking-[0.15em] text-muted-foreground">
          TOO MANY ATTEMPTS — TRY AGAIN IN <span className="text-primary">{formatMs(remaining)}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(async (d) => {
          const rl = checkRateLimit("login");
          if (!rl.allowed) {
            setLockoutEnd(rl.lockedUntil);
            toast.error("Too many failed attempts. Try again later.");
            return;
          }
          setLoading(true);
          try {
            await login(d.email, d.password);
            clearRateLimit("login");
            toast.success("Welcome back");
            navigate({ to: "/account" });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Login failed";
            recordAttempt("login");
            const after = checkRateLimit("login");
            if (!after.allowed) setLockoutEnd(after.lockedUntil);
            if (msg.toLowerCase().includes("email not confirmed")) {
              toast.error("Please confirm your email first — check your inbox.");
            } else if (msg.toLowerCase().includes("invalid login credentials")) {
              toast.error("Wrong email or password.");
            } else {
              toast.error(msg);
            }
          } finally {
            setLoading(false);
          }
        })}
        className="space-y-4"
      >
        <div>
          <label className="text-mono text-[10px] tracking-widest text-muted-foreground">EMAIL</label>
          <input {...register("email")} type="email" className="mt-1 w-full bg-surface border border-border h-11 px-3 focus:border-primary outline-none" />
          {errors.email && <p className="text-xs text-primary mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-mono text-[10px] tracking-widest text-muted-foreground">PASSWORD</label>
          <input {...register("password")} type="password" className="mt-1 w-full bg-surface border border-border h-11 px-3 focus:border-primary outline-none" />
          {errors.password && <p className="text-xs text-primary mt-1">{errors.password.message}</p>}
        </div>
        <button disabled={loading || !!lockoutEnd} className="w-full bg-primary text-primary-foreground font-bold tracking-[0.2em] text-mono text-xs h-12 hover:glow-primary disabled:opacity-50">
          {loading ? "..." : lockoutEnd ? "LOCKED" : "LOG IN"}
        </button>
      </form>
    </section>
  );
}
