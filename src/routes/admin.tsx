import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Package, ShoppingBag, Home, Users, FileText,
  Undo2, BarChart3, Trophy, Bell, Settings, Tags, Sparkles, Download, FileEdit,
  Megaphone, Layout, Menu, HelpCircle, Star, Image, Globe, MessageSquare,
  UserCheck,
} from "lucide-react";
import { listOrders, type Order } from "@/lib/orders";
import { getLastSeen, markSeen } from "@/lib/notifications";
import { formatINR } from "@/context/CartContext";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — STUDIO/DENY" }] }),
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [unseenOrders, setUnseenOrders] = useState<Order[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (user.role !== "admin") navigate({ to: "/account" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const tick = () => {
      const last = getLastSeen();
      setUnseenOrders(listOrders().filter((o) => o.createdAt > last));
    };
    tick();
    const id = setInterval(tick, 5000);
    const onStorage = () => tick();
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-mono text-xs tracking-widest text-muted-foreground">LOADING…</div>;
  if (!user || user.role !== "admin") return null;

  const coreLinks = [
    { to: "/admin" as const, label: "DASHBOARD", icon: LayoutDashboard, exact: true },
    { to: "/admin/analytics" as const, label: "ANALYTICS", icon: BarChart3 },
    { to: "/admin/products" as const, label: "PRODUCTS", icon: Package },
    { to: "/admin/catalog" as const, label: "CATALOG", icon: Tags },
    { to: "/admin/arrivals" as const, label: "NEW ARRIVALS", icon: Sparkles },
    { to: "/admin/orders" as const, label: "ORDERS", icon: ShoppingBag, badge: unseenOrders.length },
    { to: "/admin/invoices" as const, label: "INVOICES", icon: FileText },
    { to: "/admin/invoice-template" as const, label: "INVOICE TEMPLATE", icon: FileEdit },
    { to: "/admin/refunds" as const, label: "REFUNDS", icon: Undo2 },
    { to: "/admin/customers" as const, label: "CUSTOMERS", icon: Users },
    { to: "/admin/loyalty" as const, label: "LOYALTY", icon: Trophy },
    { to: "/admin/export" as const, label: "EXPORT", icon: Download },
    { to: "/admin/settings" as const, label: "SETTINGS", icon: Settings },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmsLinks: { to: any; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { to: "/admin/announcements", label: "ANNOUNCEMENTS", icon: Megaphone },
    { to: "/admin/website-sections", label: "SECTIONS", icon: Layout },
    { to: "/admin/navigation", label: "NAVIGATION", icon: Menu },
    { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
    { to: "/admin/testimonials", label: "TESTIMONIALS", icon: Star },
    { to: "/admin/media", label: "MEDIA", icon: Image },
    { to: "/admin/seo", label: "SEO", icon: Globe },
    { to: "/admin/notifications", label: "WHATSAPP", icon: MessageSquare },
    { to: "/admin/users", label: "USERS", icon: UserCheck },
  ];

  const markAllSeen = () => { markSeen(); setUnseenOrders([]); setNotifOpen(false); };

  return (
    <div className="grid md:grid-cols-[220px_1fr] min-h-screen">
      <aside className="border-r border-border bg-surface p-5 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 relative" ref={notifRef}>
          <div className="text-mono text-[10px] tracking-[0.3em] text-primary">◢ ADMIN</div>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative text-muted-foreground hover:text-primary"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unseenOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] text-mono px-1 rounded-full min-w-[14px] text-center">
                {unseenOrders.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-8 z-50 w-[300px] max-h-[400px] overflow-y-auto bg-background border border-border shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-background">
                <div className="text-mono text-[10px] tracking-widest text-primary">NOTIFICATIONS</div>
                <button onClick={markAllSeen} className="text-mono text-[9px] tracking-widest text-muted-foreground hover:text-primary">MARK ALL SEEN</button>
              </div>
              {unseenOrders.length === 0 ? (
                <div className="p-6 text-center text-mono text-[11px] text-muted-foreground tracking-widest">NO NEW ACTIVITY</div>
              ) : (
                <ul className="divide-y divide-border">
                  {unseenOrders.slice(0, 12).map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/admin/orders"
                        onClick={() => setNotifOpen(false)}
                        className="block p-3 hover:bg-surface"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-mono text-[11px]">NEW ORDER</div>
                          <div className="text-mono text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                        <div className="text-xs mt-1 text-foreground truncate">{o.userEmail}</div>
                        <div className="flex justify-between mt-1 text-mono text-[11px]">
                          <span className="text-muted-foreground">{o.order_number ?? o.id}</span>
                          <span className="text-primary">{formatINR(o.total)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {coreLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="flex items-center gap-2 px-3 py-2 text-mono text-[11px] tracking-widest hover:bg-muted"
            >
              <l.icon className="size-4 shrink-0" /> <span className="flex-1 truncate">{l.label}</span>
              {l.badge ? (
                <span className="bg-primary text-primary-foreground text-[9px] px-1.5 rounded-full">{l.badge}</span>
              ) : null}
            </Link>
          ))}

          <div className="pt-4 pb-1">
            <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground px-3 mb-1">CMS</div>
          </div>

          {cmsLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="flex items-center gap-2 px-3 py-2 text-mono text-[11px] tracking-widest hover:bg-muted"
            >
              <l.icon className="size-4 shrink-0" /> <span className="flex-1 truncate">{l.label}</span>
            </Link>
          ))}
        </nav>

        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary">
          <Home className="size-3" /> BACK TO STORE
        </Link>
      </aside>
      <div className="p-5 md:p-8">
        <Outlet />
      </div>
    </div>
  );
}
