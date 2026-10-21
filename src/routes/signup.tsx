import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  PasswordStrength,
} from "@/components/auth/AuthFields";

export const Route = createFileRoute("/signup")({
  component: Signup,
  head: () => ({
    meta: [{ title: "Sign up — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const schema = z.object({
  name: z.string().min(2, "Enter your name").max(80),
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number"),
  password: z.string().min(6, "At least 6 characters"),
});
type V = z.infer<typeof schema>;

function Signup() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(() => {
    const check = checkRateLimit("signup", 5, 60 * 60 * 1000, 60 * 60 * 1000);
    return check.lockedUntil;
  });
  const [remaining, setRemaining] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<V>({ resolver: zodResolver(schema) });
  const password = watch("password");

  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const left = lockoutEnd - Date.now();
      if (left <= 0) {
        setLockoutEnd(null);
        setRemaining(0);
        clearRateLimit("signup");
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
      toast.success("Welcome to Studio Deny");
      navigate({ to: "/account" });
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      mode="signup"
      eyebrow="JOIN THE CULT"
      title="Sign up."
      aside={
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-mono text-[11px] uppercase tracking-[0.25em] text-white/80">
          {["Save your wishlist", "Track every order", "Birthday rewards"].map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <span className="size-1 bg-white" aria-hidden />
              {perk}
            </li>
          ))}
        </ul>
      }
    >
      <GoogleButton loading={googleLoading} onClick={handleGoogle} />
      <AuthDivider />

      {lockoutEnd && remaining > 0 && (
        <LockoutNotice>
          TOO MANY SIGNUPS — TRY AGAIN IN{" "}
          <span className="text-accent font-bold">{formatMs(remaining)}</span>
        </LockoutNotice>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(async (d) => {
          const rl = checkRateLimit("signup", 5, 60 * 60 * 1000, 60 * 60 * 1000);
          if (!rl.allowed) {
            setLockoutEnd(rl.lockedUntil);
            toast.error("Too many signup attempts. Try again later.");
            return;
          }
          setLoading(true);
          try {
            await signup(d.email, d.password, d.name, d.phone);
            recordAttempt("signup", 5, 60 * 60 * 1000, 60 * 60 * 1000);
            toast.success("Account created! You can now log in.");
            navigate({ to: "/login" });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Signup failed";
            recordAttempt("signup", 5, 60 * 60 * 1000, 60 * 60 * 1000);
            const after = checkRateLimit("signup", 5, 60 * 60 * 1000, 60 * 60 * 1000);
            if (!after.allowed) setLockoutEnd(after.lockedUntil);
            toast.error(msg);
          } finally {
            setLoading(false);
          }
        })}
        className="space-y-6"
      >
        <AuthField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          label="Mobile number"
          type="tel"
          prefix="+91"
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={10}
          error={errors.phone?.message}
          {...register("phone")}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          hint={<PasswordStrength value={password ?? ""} />}
          {...register("password")}
        />
        <AuthSubmit loading={loading} disabled={!!lockoutEnd}>
          {lockoutEnd ? "Locked" : "Create account"}
        </AuthSubmit>
      </form>

      <p className="mt-8 text-sm text-foreground/60">
        Already with us?{" "}
        <Link
          to="/login"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
