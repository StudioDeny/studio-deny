import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ordersFor, cancelOrder, requestReturn, isStorePickup, type Order } from "@/lib/orders";
import { formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { LogOut, ShieldCheck, FileText, X, Heart, MapPin, Truck, RefreshCw, Plus, Trash2, Star, RotateCcw, Pencil, Tag, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { listAddresses, saveAddress, deleteAddress, setDefaultAddress, importLocalAddresses, countLocalAddresses, discardLocalAddresses, validateAddress, type SavedAddress, type AddressInput } from "@/lib/addresses";
import { getMyProfile, updateMyProfile, profileProblem, changeMyPassword, passwordProblem, todayIst, type MyProfile } from "@/lib/profile";
import { myCoupons, personalCouponTitle, couponLabel, couponStatus } from "@/lib/coupons";
import type { Coupon, CouponRedemption } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { getLoyaltySettings, DEFAULT_LOYALTY_SETTINGS } from "@/lib/settings";
import { LoyaltyCard } from "@/components/account/LoyaltyCard";
import { responsiveImage, thumbImage } from "@/lib/image";

const RETURN_WINDOW_DAYS = 7;
const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "RETURN REQUESTED",
  PICKUP_SCHEDULED: "RETURN PICKUP SCHEDULED",
  PICKUP_FAILED: "RETURN PICKUP PENDING",
  RECEIVED: "RETURN RECEIVED",
  REPLACED: "REPLACEMENT SENT",
};

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Account — STUDIO DENY" }, { name: "robots", content: "noindex, nofollow" }] }),
});

function Account() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { slugs, toggle } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltySettings, setLoyaltySettings] = useState<typeof DEFAULT_LOYALTY_SETTINGS | null>(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const BLANK: AddressInput = { label: "", name: "", phone: "", line1: "", city: "", state: "", pincode: "" };
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrForm, setAddrForm] = useState<(AddressInput & { id?: string }) | null>(null);
  const [profile, setProfile] = useState<MyProfile>({ name: "", phone: "", dob: "" });
  // The date of birth as saved — once set, the customer can't change it.
  const [savedDob, setSavedDob] = useState("");
  const [dobReady, setDobReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [confirmProfile, setConfirmProfile] = useState(false);
  const [pw, setPw] = useState<{ next: string; again: string } | null>(null);
  const [confirmPw, setConfirmPw] = useState(false);
  const [mine, setMine] = useState<Coupon[]>([]);
  const [used, setUsed] = useState<CouponRedemption[]>([]);

  const reloadAddresses = () => listAddresses().then(setAddresses);
  const reloadProfile = () => getMyProfile().then(({ dobReady: ready, ...p }) => { setProfile(p); setSavedDob(p.dob); setDobReady(ready); });
  // Addresses the old page kept in this browser — imported only if the customer says so.
  const [legacyCount, setLegacyCount] = useState(0);
  const importLegacy = async () => {
    const n = await importLocalAddresses();
    setLegacyCount(0);
    if (n) toast.success(`Added ${n} address${n > 1 ? "es" : ""} to your account`);
    reloadAddresses();
  };
  const dismissLegacy = () => { discardLocalAddresses(); setLegacyCount(0); };

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else {
      ordersFor(user.email).then((o) => { setOrders(o); setOrdersLoaded(true); });
      getLoyaltySettings().then(setLoyaltySettings);
      setLegacyCount(countLocalAddresses());
      reloadAddresses();
      reloadProfile();
      myCoupons().then(setMine);
      supabase.from("coupon_redemptions").select("*").order("created_at", { ascending: false }).then(({ data }) => setUsed((data as CouponRedemption[]) ?? []));
      listProducts().then(setAllProducts);
    }
  }, [user, loading, navigate]);

  const wishItems = allProducts.filter((p) => slugs.includes(p.slug));

  const submitAddr = async () => {
    if (!addrForm) return;
    const problem = validateAddress(addrForm);
    if (problem) return toast.error(problem);
    try {
      await saveAddress({ ...addrForm, is_default: addrForm.id ? addrForm.is_default : addresses.length === 0 });
      setAddrForm(null);
      toast.success("Address saved");
      reloadAddresses();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save address"); }
  };
  const removeAddr = async (id: string) => {
    try { await deleteAddress(id); reloadAddresses(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete"); }
  };
  const makeDefault = async (id: string) => {
    try { await setDefaultAddress(id); reloadAddresses(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
  };
  // SAVE → "are you sure?" → save → done.
  const askSaveProfile = () => {
    const problem = profileProblem(profile, savedDob);
    if (problem) return toast.error(problem);
    setConfirmProfile(true);
  };
  const saveProfile = async () => {
    try {
      await updateMyProfile(profile, savedDob);
      setEditingProfile(false);
      toast.success("Done — profile updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update profile"); }
    reloadProfile();
  };
  const askSavePassword = () => {
    if (!pw) return;
    const problem = passwordProblem(pw.next, pw.again);
    if (problem) return toast.error(problem);
    setConfirmPw(true);
  };
  const savePassword = async () => {
    if (!pw) return;
    try {
      await changeMyPassword(pw.next, pw.again);
      setPw(null);
      toast.success("Done — password changed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not change password"); }
  };
  const dobLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

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
    const { pickupScheduled, pickupError } = await requestReturn(returnTarget, returnReason.trim() || undefined);
    setReturnReason("");
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-14">
        {[
          { href: "#wishlist", Icon: Heart, label: "WISHLIST", meta: `${slugs.length} ITEMS`, color: "hover:border-pink-500/60 hover:text-pink-400" },
          { href: "#profile", Icon: Pencil, label: "PROFILE", meta: "NAME · PHONE · BIRTHDAY", color: "hover:border-primary hover:text-primary" },
          { href: "#coupons", Icon: Tag, label: "MY COUPONS", meta: (() => { const n = mine.filter((c) => couponStatus(c) === "active").length; return n > 0 ? `${n} TO USE` : "—"; })(), color: "hover:border-primary hover:text-primary" },
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

      {/* Loyalty — only while the program is switched on (Admin → Settings → Loyalty) */}
      {loyaltySettings?.enabled && (
        <div id="loyalty" className="scroll-mt-24 mb-14">
          <h2 className="text-display text-3xl tracking-wider mb-4">LOYALTY</h2>
          {ordersLoaded ? (
            <LoyaltyCard orders={orders} settings={loyaltySettings} />
          ) : (
            <div className="border border-border bg-surface p-6 text-mono text-xs text-muted-foreground">LOADING…</div>
          )}
        </div>
      )}

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
                    <div key={it.slug + it.size} className="w-10 h-12 bg-muted overflow-hidden"><img src={thumbImage(it.image, 120)} alt="" width={40} height={48} loading="lazy" decoding="async" className="w-full h-full object-cover" /></div>
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
                  {isStorePickup(o) && o.status !== "CANCELLED" && o.status !== "REFUNDED" && (
                    <span className="text-mono text-[9px] tracking-widest px-2 py-1 rounded font-semibold bg-foreground text-background">
                      {o.collectedAt
                        ? "STORE PICKUP · COLLECTED"
                        : `STORE PICKUP · COLLECT BY ${o.pickupDueAt ? new Date(o.pickupDueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toUpperCase() : ""}`}
                    </span>
                  )}
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
                  {!isStorePickup(o) && (o.status === "PLACED" || o.status === "PACKED" || o.status === "SHIPPED") && (
                    <button title="Cancel" onClick={() => setCancelTarget(o.id)} className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
                  )}
                  {!isStorePickup(o) && o.status === "DELIVERED" && !o.returnStatus && o.deliveredAt && (Date.now() - o.deliveredAt) / (1000 * 60 * 60 * 24) <= RETURN_WINDOW_DAYS && (
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
                    <img {...responsiveImage(p.image, { maxWidth: 828, sizes: "(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw" })} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

      {/* Profile */}
      <div id="profile" className="scroll-mt-24 mb-12">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-display text-3xl tracking-wider">PROFILE</h2>
          {!editingProfile && !pw && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary">
                <Pencil className="size-3.5" /> EDIT
              </button>
              <button onClick={() => setPw({ next: "", again: "" })} className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary">
                <KeyRound className="size-3.5" /> CHANGE PASSWORD
              </button>
            </div>
          )}
        </div>
        {editingProfile ? (
          <div className="border border-border bg-surface p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone" inputMode="numeric" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            {dobReady && <label className="sm:col-span-2 block">
              <span className="block text-mono text-[10px] tracking-widest text-muted-foreground mb-1">DATE OF BIRTH</span>
              <input
                type="date"
                value={profile.dob}
                min="1900-01-01"
                max={todayIst()}
                disabled={!!savedDob}
                onChange={(e) => setProfile((p) => ({ ...p, dob: e.target.value }))}
                className="w-full sm:w-1/2 bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none disabled:opacity-60"
              />
              <span className="block text-xs text-muted-foreground mt-1">
                {savedDob ? "Saved — contact us if it needs changing." : "We'll send you a birthday offer. You can set this once."}
              </span>
            </label>}
            <div className="sm:col-span-2 flex gap-3">
              <button onClick={askSaveProfile} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground">SAVE</button>
              <button onClick={() => { setEditingProfile(false); reloadProfile(); }} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest">CANCEL</button>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Email: {user.email} (can't be changed here)</p>
          </div>
        ) : pw ? (
          <div className="border border-border bg-surface p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => p && { ...p, next: e.target.value })} placeholder="New password" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            <input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw((p) => p && { ...p, again: e.target.value })} placeholder="Re-enter new password" className="bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none" />
            {pw.again !== "" && pw.again !== pw.next && <p className="sm:col-span-2 text-xs text-primary">Passwords don't match</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button onClick={askSavePassword} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground">UPDATE PASSWORD</button>
              <button onClick={() => setPw(null)} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest">CANCEL</button>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
        ) : (
          <div className="border border-border bg-surface p-5 text-sm max-w-2xl">
            <div className="font-semibold">{profile.name || user.name}</div>
            <div className="text-muted-foreground">{profile.phone || "No phone added"}</div>
            <div className="text-muted-foreground">{user.email}</div>
            {dobReady && <div className="text-muted-foreground">{profile.dob ? `Birthday: ${dobLabel(profile.dob)}` : "Add your birthday to get a birthday offer"}</div>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmProfile}
        onOpenChange={setConfirmProfile}
        title="SAVE CHANGES?"
        description={!savedDob && profile.dob
          ? `Your date of birth (${dobLabel(profile.dob)}) can't be changed after this.`
          : "Your name and phone number will be updated."}
        confirmLabel="YES, SAVE"
        onConfirm={saveProfile}
      />
      <ConfirmDialog
        open={confirmPw}
        onOpenChange={setConfirmPw}
        title="CHANGE PASSWORD?"
        description="You'll use the new password the next time you log in."
        confirmLabel="YES, CHANGE"
        onConfirm={savePassword}
      />

      {/* My coupons */}
      <div id="coupons" className="scroll-mt-24 mb-12">
        <h2 className="text-display text-3xl tracking-wider mb-4">MY COUPONS</h2>
        {mine.length === 0 && used.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-muted-foreground">No coupons yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {mine.map((c) => (
              <div key={c.id} className={`border p-5 ${couponStatus(c) === "active" ? "border-primary" : "border-border opacity-70"}`}>
                <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">{personalCouponTitle(c)} · {couponLabel(c)}</div>
                <div className="flex items-center gap-3">
                  <span className="text-mono text-xl tracking-[0.2em]">{c.code}</span>
                  {couponStatus(c) === "active" && (
                    <button onClick={() => navigator.clipboard?.writeText(c.code).then(() => toast.success("Code copied"))} aria-label="Copy code" className="text-muted-foreground hover:text-primary"><Copy className="size-4" /></button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {couponStatus(c) === "active" ? (c.expires_at ? `Valid till ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : "No expiry") : couponStatus(c).toUpperCase()}
                  {couponStatus(c) === "active" && c.min_order ? ` · on orders of ${formatINR(c.min_order)}+` : ""}
                </div>
              </div>
            ))}
            {used.map((r) => (
              <div key={r.id} className="border border-border p-5 text-sm">
                <div className="flex items-center gap-2 text-mono"><Tag className="size-3.5" /> {r.code}</div>
                <div className="text-muted-foreground text-xs mt-1">Saved {formatINR(r.discount_amount)} on order {r.order_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses */}
      <div id="addresses" className="scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-display text-3xl tracking-wider">SAVED ADDRESSES</h2>
          {!addrForm && (
            <button onClick={() => setAddrForm({ ...BLANK, phone: profile.phone })} className="inline-flex items-center gap-2 border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary hover:text-primary transition-colors">
              <Plus className="size-3.5" /> ADD ADDRESS
            </button>
          )}
        </div>

        {legacyCount > 0 && (
          <div className="border border-primary/40 bg-primary/5 p-4 mb-5 flex flex-wrap items-center gap-3 justify-between">
            <p className="text-sm">We found {legacyCount} address{legacyCount > 1 ? "es" : ""} saved on this device. Add {legacyCount > 1 ? "them" : "it"} to your account?</p>
            <div className="flex gap-2">
              <button onClick={importLegacy} className="bg-foreground text-background px-4 h-9 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground">ADD</button>
              <button onClick={dismissLegacy} className="border border-border px-4 h-9 text-mono text-[11px] tracking-widest hover:border-primary">NO THANKS</button>
            </div>
          </div>
        )}

        {addrForm && (
          <div className="border border-border bg-surface p-6 mb-5">
            <div className="text-mono text-[11px] tracking-[0.25em] text-primary mb-5">{addrForm.id ? "EDIT ADDRESS" : "NEW ADDRESS"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {([
                { key: "label", placeholder: "Label (Home / Work…)", full: false },
                { key: "name", placeholder: "Full Name *", full: false },
                { key: "phone", placeholder: "Phone for delivery *", full: false },
                { key: "line1", placeholder: "Address Line *", full: true },
                { key: "city", placeholder: "City *", full: false },
                { key: "state", placeholder: "State *", full: false },
                { key: "pincode", placeholder: "PIN Code *", full: false },
              ] as { key: keyof AddressInput; placeholder: string; full: boolean }[]).map(({ key, placeholder, full }) => (
                <input
                  key={key}
                  value={String(addrForm[key] ?? "")}
                  onChange={(e) => setAddrForm((f) => (f ? { ...f, [key]: e.target.value } : f))}
                  placeholder={placeholder}
                  className={`bg-background border border-border h-10 px-3 text-sm focus:border-primary outline-none ${full ? "sm:col-span-2" : ""}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={submitAddr} className="bg-foreground text-background px-6 h-10 text-mono text-[11px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">SAVE</button>
              <button onClick={() => setAddrForm(null)} className="border border-border px-6 h-10 text-mono text-[11px] tracking-widest hover:border-primary transition-colors">CANCEL</button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !addrForm ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No saved addresses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addresses.map((a) => (
              <div key={a.id} className={`border bg-surface p-5 relative ${a.is_default ? "border-primary" : "border-border"}`}>
                {a.is_default && (
                  <span className="absolute top-3 right-3 text-mono text-[9px] tracking-widest text-primary flex items-center gap-1">
                    <Star className="size-2.5 fill-primary" /> DEFAULT
                  </span>
                )}
                {a.label && <div className="text-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2 uppercase">{a.label}</div>}
                <div className="text-sm font-semibold mb-1">{a.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {a.line1}<br />{a.city}{a.state ? `, ${a.state}` : ""} — {a.pincode}
                  {a.phone && <><br />{a.phone}</>}
                </div>
                <div className="flex gap-3 mt-4 items-center">
                  {!a.is_default && (
                    <button onClick={() => makeDefault(a.id)} className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors">SET DEFAULT</button>
                  )}
                  <button onClick={() => setAddrForm({ id: a.id, label: a.label ?? "", name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode, is_default: a.is_default })}
                    className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary">EDIT</button>
                  <button onClick={() => removeAddr(a.id)} className="text-muted-foreground hover:text-red-500 transition-colors ml-auto" aria-label="Delete address">
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
        onOpenChange={(open) => { if (!open) { setReturnTarget(null); setReturnReason(""); } }}
        title="REQUEST A RETURN?"
        description="A courier pickup will be scheduled automatically from your address."
        confirmLabel="REQUEST RETURN"
        onConfirm={confirmReturnRequest}
      >
        <textarea
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="Reason for return (optional)"
          rows={3}
          className="w-full border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:border-primary"
        />
      </ConfirmDialog>
    </section>
  );
}
