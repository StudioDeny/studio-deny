import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupaUser } from "@supabase/supabase-js";

export type User = { id: string; email: string; name: string; role: "user" | "admin" };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function resolveRole(): Promise<"user" | "admin"> {
  // Uses a SECURITY DEFINER function — bypasses RLS, always reliable.
  const { data, error } = await supabase.rpc("get_my_role");
  if (error) console.warn("[resolveRole]", error.message);
  if (!data) return "user";
  return data === "admin" || data === "staff" ? "admin" : "user";
}

async function toAppUser(supaUser: SupaUser): Promise<User> {
  const role = await resolveRole();
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: supaUser.user_metadata?.name ?? supaUser.email?.split("@")[0] ?? "User",
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use onAuthStateChange exclusively — the recommended Supabase pattern.
    // INITIAL_SESSION fires on mount with the stored session (or null) so we
    // never need a separate getSession() call, which would race with this.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(await toAppUser(session.user));
        } else {
          setUser(null);
        }
      } finally {
        // Only flip loading off once we know the initial auth state.
        if (event === "INITIAL_SESSION") setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        login: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw new Error(error.message);
        },
        signup: async (email, password, name) => {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });
          if (error) throw new Error(error.message);
        },
        loginWithGoogle: async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: typeof window !== "undefined" ? window.location.origin + "/account" : undefined },
          });
          if (error) throw new Error(error.message);
        },
        logout: async () => {
          await supabase.auth.signOut();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
};
