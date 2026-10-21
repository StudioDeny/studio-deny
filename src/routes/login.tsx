import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { checkRateLimit, recordAttempt, clearRateLimit, formatMs } from "@/lib/rateLimit";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthDivider,
  AuthField,
  AuthSubmit,
  GoogleButton,
  LockoutNotice,
} from "@/components/auth/AuthFields";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [{ title: "Login — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

// No min-length here on purpose — this is LOGIN, not signup. A client-side
// length gate meant "wrong password" always showed "Min 6 characters"
// instead of the real Supabase error, since react-hook-form blocks the
// submit (and therefore the actual auth call) before it ever happens for
// any password under 6 characters. Signup still enforces min(6) — that's
// a real new-password policy; login just needs *something* typed so the
// server can say whether it's actually correct.
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<V>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const left = lockoutEnd - Date.now();
      if (left <= 0) {
        setLockoutEnd(null);
        setRemaining(0);
        clearRateLimit("login");
      } else setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutEnd]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google");
      navigate({ to: "/account" });
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell mode="login" eyebrow="MEMBERS" title="Log in.">
      <GoogleButton loading={googleLoading} onClick={handleGoogle} />
      <AuthDivider />

      {lockoutEnd && remaining > 0 && (
        <LockoutNotice>
          TOO MANY ATTEMPTS — TRY AGAIN IN{" "}
          <span className="text-accent font-bold">{formatMs(remaining)}</span>
        </LockoutNotice>
      )}

      <form
        noValidate
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
        className="space-y-6"
      >
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthSubmit loading={loading} disabled={!!lockoutEnd}>
          {lockoutEnd ? "Locked" : "Log in"}
        </AuthSubmit>
      </form>

      <p className="mt-8 text-sm text-foreground/60">
        New to Studio Deny?{" "}
        <Link
          to="/signup"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
