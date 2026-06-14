import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole, AppRole } from "@/types/database";
import { Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type UserRow = Profile & { role: AppRole | null; role_id: string | null };

const ROLE_OPTIONS: AppRole[] = ["admin", "staff", "customer"];
const ROLE_COLORS: Record<AppRole, string> = {
  admin: "border-primary text-primary",
  staff: "border-secondary text-secondary",
  customer: "border-border text-muted-foreground",
};

function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    const { data: roles } = await supabase.from("user_roles").select("*");

    const roleMap = new Map<string, UserRole>((roles ?? []).map((r) => [r.user_id, r]));

    setUsers(
      (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id)?.role ?? null,
        role_id: roleMap.get(p.user_id)?.id ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(
    (u) =>
      !q ||
      (u.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const changeRole = async (user: UserRow, newRole: AppRole) => {
    if (user.role_id) {
      const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("id", user.role_id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.user_id, role: newRole });
      if (error) return toast.error(error.message);
    }
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, role: newRole } : x)));
    toast.success(`Role updated to ${newRole}`);
  };

  if (loading) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-display text-4xl md:text-5xl">USERS.</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} registered users</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="bg-background border border-border h-10 pl-9 pr-3 w-full text-sm"
        />
      </div>

      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead className="text-mono text-[10px] tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">USER</th>
              <th className="text-left p-3 hidden md:table-cell">PHONE</th>
              <th className="text-left p-3">ROLE</th>
              <th className="text-left p-3 hidden lg:table-cell">JOINED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name ?? ""} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-mono text-xs flex-shrink-0">
                        {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.name ?? "—"}</div>
                      <div className="text-mono text-[10px] text-muted-foreground truncate">{u.email ?? u.user_id.slice(0, 12) + "…"}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell text-mono text-[11px]">{u.phone ?? "—"}</td>
                <td className="p-3">
                  <select
                    value={u.role ?? "customer"}
                    onChange={(e) => changeRole(u, e.target.value as AppRole)}
                    className={`bg-background border h-8 px-2 text-mono text-[10px] tracking-widest cursor-pointer ${ROLE_COLORS[u.role ?? "customer"]}`}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r.toUpperCase()}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-mono text-[10px] text-muted-foreground hidden lg:table-cell">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">{q ? "No users match your search." : "No users found."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
