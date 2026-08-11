import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ordersFor, cancelOrder, requestReturn, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { LogOut, ShieldCheck, FileText, X, Heart, MapPin, Truck, RefreshCw, Plus, Trash2, Star, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const RETURN_WINDOW_DAYS = 7;
const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "RETURN REQUESTED",
  PICKUP_SCHEDULED: "RETURN PICKUP SCHEDULED",
  PICKUP_FAILED: "RETURN PICKUP PENDING",
  RECEIVED: "RETURN RECEIVED",
};

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Account — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

type Address = { id: string; label: string; name: string; line1: string; city: string; state: string; pin: string; phone: string; isDefault: boolean };

const ADDR_KEY = "sd_addresses";
function getAddresses(): Address[] {
  try { const r = typeof window !== "undefined" ? localStorage.getItem(ADDR_KEY) : null; return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveAddresses(list: Address[]) {
  if (typeof window !== "undefined") localStorage.setItem(ADDR_KEY, JSON.stringify(list));
}

const BLANK: Omit<Address, "id" | "isDefault"> = { label: "", name: "", line1: "", city: "", state: "", pin: "", phone: "" };

function Account() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { slugs, toggle } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddr, setAddingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState(BLANK);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else {
      ordersFor(user.email).then(setOrders);
      setAddresses(getAddresses());
      listProducts().then(setAllProducts);
    }
  }, [user, loading, navigate]);

  const wishItems = allProducts.filter((p) => slugs.includes(p.slug));

  const saveAddr = () => {
    if (!addrForm.name || !addrForm.line1 || !addrForm.city || !addrForm.pin) {
      toast.error("Fill in the required fields"); return;
    }
    const next = [...addresses, { ...addrForm, id: Date.now().toString(), isDefault: addresses.length === 0 }];
    setAddresses(next);
    saveAddresses(next);
    setAddrForm(BLANK);
    setAddingAddr(false);
    toast.success("Address saved");
  };

  const removeAddr = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    setAddresses(next);
    saveAddresses(next);
  };

  const setDefault = (id: string) => {
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(next);
    saveAddresses(next);
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget || !user) return;
    const { shiprocketCancelled, rtoInitiated } = await cancelOrder(cancelTarget);
    setOrders(await ordersFor(user.email));
    toast.success(
      rtoInitiated ? "Order cancelled — parcel already picked up, return-to-origin requested"
        : shiprocketCancelled ? "Order cancelled — shipment cancelled with courier"
        : "Order cancelled"
    );
  };

  const confirmReturnRequest = async () => {
    if (!returnTarget || !user) return;
    const { pickupScheduled, pickupError } = await requestReturn(returnTarget);
    setOrders(await ordersFor(user.email));
    toast.success(pickupScheduled ? "Return requested — pickup scheduled" : `Return requested — pickup not scheduled (${pickupError ?? "unknown reason"}), we'll follow up`);
  };

  if (loading) return <Loading className="min-h-[60vh]" />;
  if (!user) return null;

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 pb-24 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ MEMBER</div>
          <h1 className="text-display text-5xl md:text-7xl">HELLO, {user.name.toUpperCase()}.</h1>
          <p className="text-muted-foreground text-sm mt-2">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link to="/admin" className="border border-primary text-primary px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:bg-primary hover:text-primary-foreground">
              <ShieldCheck className="size-4" /> ADMIN
            </Link>
          )}
          <button onClick={async () => { await logout(); navigate({ to: "/" }); }} className="border border-border px-4 h-10 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            <LogOut className="size-4" /> LOG OUT
          </button>
        </div>
      </div>

      {/* Quick action tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
        {[
          { href: "#wishlist", Icon: Heart, label: "WISHLIST", meta: `${slugs.length} ITEMS`, color: "hover:border-pink-500/60 hover:text-pink-400" },
          { href: "#addresses", Icon: MapPin, label: "SAVED ADDRESSES", meta: `${addresses.length} SAVED`, color: "hover:border-primary hover:text-primary" },
          { href: "/track-order", Icon: Truck, label: "TRACK ORDER", meta: "CHECK STATUS", color: "hover:border-primary hover:text-primary", external: true },
          { href: "/returns", Icon: RefreshCw, label: "RETURNS", meta: "& EXCHANGES", color: "hover:border-primary hover:text-primary", external: true },
        ].map(({ href, Icon, label, meta, color, external }) => {
          const cls = `flex flex-col gap-2 border border-border bg-surface p-5 transition-all duration-200 cursor-pointer ${color}`;
          const inner = (
            <>
              <Icon className="size-5 text-muted-foreground" />
              <div>
                <div className="text-mono text-[11px] tracking-[0.2em] font-semibold">{label}</div>
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-0.5">{meta}</div>
              </div>
            </>
          );
          return external
            ? <Link key={label} to={href as "/"} className={cls}>{inner}</Link>
            : <a key={label} href={href} className={cls}>{inner}</a>;
        })}
      </div>

      {/* Orders */}
      <div className="mb-14">
        <h2 className="text-display text-3xl tracking-wider mb-4">ORDERS</h2>
        {orders.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary hover:underline">→ START SHOPPING</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="border border-border bg-surface p-4 flex flex-wrap items-center gap-4 justify-between hover:border-primary transition-colors">
                <div>
                  <div className="text-mono text-xs">{o.order_number ?? o.id}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-1">
                  {o.items.slice(0, 4).map((it) => (
                    <div key={it.slug + it.size} className="w-10 h-12 bg-muted overflow-hidden"><img src={it.image} alt="" className="w-full h-full object-cover" /></div>
                  ))}
                </div>
                <div className="text-mono">{formatINR(o.total)}</div>
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-mono text-[10px] tracking-widest px-2 py-1 rounded font-semibold ${
                    o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800"
                    : o.status === "SHIPPED" ? "bg-amber-100 text-amber-800"
                    : o.status === "PACKED" ? "bg-yellow-100 text-yellow-800"
                    : o.status === "PLACED" ? "bg-blue-100 text-blue-800"
                    : o.status === "REFUNDED" ? "bg-purple-100 text-purple-800"
                    : "bg-red-100 text-red-800"
                  }`}>{o.status}</span>
                  {o.returnStatus && (
                    <span className="text-mono text-[9px] tracking-widest px-2 py-1 rounded font-semibold bg-purple-100 text-purple-800">
                      {RETURN_STATUS_LABEL[o.returnStatus] ?? o.returnStatus}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  {o.trackingUrl && (
                    <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" title="Track shipment" className="text-muted-foreground hover:text-primary"><Truck className="size-4" /></a>
                  )}
                  {o.returnTrackingUrl && (
                    <a href={o.returnTrackingUrl} target="_blank" rel="noopener noreferrer" title="Track return" className="text-muted-foreground hover:text-primary"><RotateCcw className="size-4" /></a>
                  )}
                  <Link to="/invoice/$id" params={{ id: o.id }} title="Invoice" className="text-muted-foreground hover:text-primary"><FileText className="size-4" /></Link>
                  {(o.status === "PLACED" || o.status === "PACKED" || o.status === "SHIPPED") && (
                    <button title="Cancel" onClick={() => setCancelTarget(o.id)} className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
                  )}
                  {o.status === "DELIVERED" && !o.returnStatus && o.deliveredAt && (Date.now() - o.deliveredAt) / (1000 * 60 * 60 * 24) <= RETURN_WINDOW_DAYS && (
                    <button title="Request return" onClick={() => setReturnTarget(o.id)} className="text-muted-foreground hover:text-primary"><RotateCcw className="size-4" /></button>
                  )}
                  <Link to="/order/$id" params={{ id: o.id }} className="text-mono text-[11px] tracking-widest text-primary hover:underline">VIEW →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Wishlist */}
      <div id="wishlist" className="mb-14 scroll-mt-24">
        <div className="flex items-baseline gap-4 mb-4">
          <h2 className="text-display text-3xl tracking-wider">WISHLIST</h2>
          {slugs.length > 0 && <span className="text-mono text-xs tracking-widest text-muted-foreground">{slugs.length} ITEMS</span>}
        </div>
        {wishItems.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">Your wishlist is empty.</p>
            <Link to="/shop" className="inline-block mt-4 text-mono text-xs tracking-widest text-primary hover:underline">→ BROWSE DROPS</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {wishItems.map((p) => (
              <div key={p.slug} className="group relative">
                <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
                  <div className="relative overflow-hidden bg-surface" style={{ aspectRatio: "3/4" }}>
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-mono text-[11px] tracking-[0.15em] font-semibold uppercase truncate">{p.name}</p>
                    <p className="text-mono text-xs text-muted-foreground mt-0.5">{formatINR(p.price)}</p>
                  </div>
                </Link>
                <button
                  onClick={() => toggle(p.slug)}
                  className="absolute top-2 right-2 p-1.5 text-primary hover:text-red-500 transition-colors"
                  title="Remove from wishlist"
                >
                  <Heart className="size-4 fill-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses */}
      <div id="addresses" className="scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-display text-3xl tracking-wider">SAVED ADDRESSES</h2>
          {!addingAddr && (
            <button
              onClick={() => setAddingAddr(true)}
              className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="size-3.5" /> ADD ADDRESS
            </button>
          )}
        </div>

        {/* Add address form */}
        {addingAddr && (
          <div className="border border-border bg-surface p-6 mb-5">
            <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-5">NEW ADDRESS</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {([
                { key: "label", placeholder: "Label (Home / Work…)", full: false },
                { key: "name", placeholder: "Full Name *", full: false },
                { key: "phone", placeholder: "Phone Number", full: false },
                { key: "line1", placeholder: "Address Line *", full: true },
                { key: "city", placeholder: "City *", full: false },
                { key: "state", placeholder: "State", full: false },
                { key: "pin", placeholder: "PIN Code *", full: false },
              ] as { key: keyof typeof addrForm; placeholder: string; full: boolean }[]).map(({ key, placeholder, full }) => (
                <input
                  key={key}
                  value={addrForm[key]}
                  onChange={(e) => setAddrForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={`bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none ${full ? "sm:col-span-2" : ""}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={saveAddr} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
                SAVE
              </button>
              <button onClick={() => { setAddingAddr(false); setAddrForm(BLANK); }} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest hover:border-primary transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !addingAddr ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No saved addresses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addresses.map((a) => (
              <div key={a.id} className={`border bg-surface p-5 relative ${a.isDefault ? "border-primary" : "border-border"}`}>
                {a.isDefault && (
                  <span className="absolute top-3 right-3 text-mono text-[9px] tracking-widest text-primary flex items-center gap-1">
                    <Star className="size-2.5 fill-primary" /> DEFAULT
                  </span>
                )}
                {a.label && <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2 uppercase">{a.label}</div>}
                <div className="text-sm font-semibold mb-1">{a.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {a.line1}<br />{a.city}{a.state ? `, ${a.state}` : ""} — {a.pin}
                  {a.phone && <><br />{a.phone}</>}
                </div>
                <div className="flex gap-3 mt-4">
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a.id)} className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors">
                      SET DEFAULT
                    </button>
                  )}
                  <button onClick={() => removeAddr(a.id)} className="text-muted-foreground hover:text-red-500 transition-colors ml-auto">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="CANCEL THIS ORDER?"
        confirmLabel="CANCEL ORDER"
        destructive
        onConfirm={confirmCancelOrder}
      />
      <ConfirmDialog
        open={returnTarget !== null}
        onOpenChange={(open) => !open && setReturnTarget(null)}
        title="REQUEST A RETURN?"
        description="A courier pickup will be scheduled automatically from your address."
        confirmLabel="REQUEST RETURN"
        onConfirm={confirmReturnRequest}
      />
    </section>
  );
}
