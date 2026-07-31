import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Package, ShoppingBag, Home, Users, FileText,
  Undo2, BarChart3, Trophy, Bell, Settings, Tags, Download, FileEdit,
  Megaphone, Layout, Menu, HelpCircle, Star, Image, Globe, MessageSquare,
  UserCheck, AtSign, BookOpen, Users2, Heading, X, Ruler, PanelBottom, Sparkles,
} from "lucide-react";
import { listOrders, type Order } from "@/lib/orders";
import { getLastSeen, markSeen } from "@/lib/notifications";
import { formatINR } from "@/context/CartContext";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — STUDIO DENY" }] }),
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [unseenOrders, setUnseenOrders] = useState<Order[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    { to: "/admin/sizes" as const, label: "SIZES", icon: Ruler },
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
    { to: "/admin/mega-menu", label: "MEGA MENU", icon: Menu },
    { to: "/admin/navigation", label: "FOOTER LINKS", icon: PanelBottom },
    { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
    { to: "/admin/testimonials", label: "TESTIMONIALS", icon: Star },
    { to: "/admin/influencer-picks", label: "INFLUENCERS", icon: AtSign },
    { to: "/admin/lookbook-cms", label: "LOOK BOOK", icon: BookOpen },
    { to: "/admin/community-cms", label: "COMMUNITY", icon: Users2 },
    { to: "/admin/headings", label: "HEADINGS", icon: Heading },
    { to: "/admin/popup", label: "POPUP", icon: Sparkles },
    { to: "/admin/media", label: "MEDIA", icon: Image },
    { to: "/admin/seo", label: "SEO", icon: Globe },
    { to: "/admin/notifications", label: "WHATSAPP", icon: MessageSquare },
    { to: "/admin/users", label: "USERS", icon: UserCheck },
  ];

  const markAllSeen = () => { markSeen(); setUnseenOrders([]); setNotifOpen(false); };

  const navLink = (l: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; badge?: number }) => (
    <Link
      key={l.to}
      to={l.to}
      activeOptions={l.exact ? { exact: true } : undefined}
      activeProps={{ className: "bg-primary text-primary-foreground" }}
      onClick={() => setMobileNavOpen(false)}
      className="flex items-center gap-2 px-3 py-2 text-mono text-[11px] tracking-widest hover:bg-muted"
    >
      <l.icon className="size-4 shrink-0" /> <span className="flex-1 truncate">{l.label}</span>
      {l.badge ? (
        <span className="bg-primary text-primary-foreground text-[9px] px-1.5 rounded-full">{l.badge}</span>
      ) : null}
    </Link>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      {/* Mobile top bar — just the logo (back to site) + hamburger. No storefront
          navbar renders on admin routes (see __root.tsx), so this is the only
          header on mobile. */}
      <div className="md:hidden sticky top-0 z-[110] flex items-center justify-between px-4 h-14 border-b border-border bg-background">
        <Link to="/" className="text-display text-lg tracking-wider">STUDIO DENY</Link>
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open admin menu" className="text-foreground">
          <Menu className="size-6" />
        </button>
      </div>

      {/* Full-screen mobile nav — opens over the entire viewport so admin can
          navigate to any screen without scrolling past a stacked sidebar. */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[120] bg-background overflow-y-auto">
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
            <Link to="/" className="text-display text-lg tracking-wider" onClick={() => setMobileNavOpen(false)}>STUDIO DENY</Link>
            <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-foreground">
              <X className="size-6" />
            </button>
          </div>
          <nav className="p-5 space-y-1">
            {coreLinks.map(navLink)}
            <div className="pt-4 pb-1">
              <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground px-3 mb-1">CMS</div>
            </div>
            {cmsLinks.map(navLink)}
          </nav>
        </div>
      )}

      <aside className="hidden md:block border-r border-border bg-surface p-5 md:sticky md:top-0 md:h-screen overflow-y-auto">
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
          {coreLinks.map(navLink)}

          <div className="pt-4 pb-1">
            <div className="text-mono text-[9px] tracking-[0.3em] text-muted-foreground px-3 mb-1">CMS</div>
          </div>

          {cmsLinks.map(navLink)}
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
