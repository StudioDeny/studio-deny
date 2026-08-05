import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, ArrowRight, User, Heart, ShoppingBag, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getMegaMenu, type MegaMenuCategory } from "@/lib/megaMenu";
import { MegaMenuPanel } from "@/components/layout/MegaMenuPanel";

export function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [megaMenu, setMegaMenu] = useState<MegaMenuCategory[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const { slugs: wishSlugs } = useWishlist();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMegaMenu().then((cats) => {
      setMegaMenu(cats);
      setMobileActiveTab((t) => t ?? cats[0]?.id ?? null);
    });
  }, []);

  // Fade the navbar background to fully transparent as the user scrolls down;
  // return to solid at the top of the page.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load products once when search first opens
  useEffect(() => {
    if (searchOpen) {
      if (allProducts.length === 0) listProducts().then(setAllProducts);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [searchOpen]);

  // Debounced real-time filtering
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      const q = searchQ.toLowerCase();
      setSearchResults(
        allProducts
          .filter((p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          )
          .slice(0, 7)
      );
    }, 180);
    return () => clearTimeout(t);
  }, [searchQ, allProducts]);

  const closeSearch = () => { setSearchOpen(false); setSearchQ(""); setSearchResults([]); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    navigate({ to: "/shop", search: { q: searchQ.trim() } });
    closeSearch();
  };

  return (
    <>
      {/* Backdrop — closes search when clicking outside, page still visible */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-[2px]"
            onClick={closeSearch}
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={`relative z-[100] flex flex-col transition-all duration-500 ${
          scrolled
            ? "bg-gradient-to-b from-background/95 via-background/85 to-background/60 backdrop-blur-md border-b border-border/40 shadow-lg"
            : "bg-background border-b border-border"
        }`}
      >
        {/* Main bar — left: category dropdowns, center: logo, right: icons */}
        {/* flex on mobile (only 2 children are actually visible there, so justify-between
            puts them flush at opposite edges), grid on desktop (needs the 3-track layout
            so the logo can sit truly centered between the left nav and right icons). */}
        <div className="relative flex sm:grid sm:grid-cols-[1fr_auto_1fr] items-center justify-between px-4 sm:px-8 lg:px-16 py-2.5 sm:py-3 text-foreground">
          {/* Left — category nav (desktop only). Hovering/clicking a tab opens a
              half-page side panel anchored to the left edge (H&M-style), not a
              small dropdown under the tab itself. */}
          <div
            className="hidden sm:flex items-center gap-6 lg:gap-8 font-body"
            onMouseLeave={() => setOpenDropdown(null)}
          >
            {/* Tabs need their own stacking context above the backdrop below —
                otherwise the backdrop (position:fixed) paints over these plain
                static buttons regardless of DOM order, silently swallowing
                hover/click and making it look like only clicking outside works. */}
            <div className="relative z-[96] flex items-center gap-6 lg:gap-8">
              {megaMenu.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setOpenDropdown(cat.id)}
                  onClick={() => setOpenDropdown((d) => (d === cat.id ? null : cat.id))}
                  className="flex items-center gap-1 text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale"
                >
                  {cat.label} <ChevronDown className="size-3" strokeWidth={1.5} />
                </button>
              ))}
            </div>

            <AnimatePresence>
              {(() => {
                const activeCat = megaMenu.find((c) => c.id === openDropdown);
                if (!activeCat || (activeCat.links.length === 0 && activeCat.products.length === 0)) return null;
                return (
                  <>
                    <motion.div
                      key="mega-menu-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-[95] bg-black/40"
                      onClick={() => setOpenDropdown(null)}
                    />
                    <motion.div
                      key="mega-menu-panel"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 z-[101] bg-background border-r border-b border-border shadow-2xl overflow-y-auto"
                      style={{ width: "min(50vw, 720px)", maxHeight: "calc(100vh - 120px)" }}
                    >
                      <MegaMenuPanel category={activeCat} onNavigate={() => setOpenDropdown(null)} variant="desktop" />
                    </motion.div>
                  </>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Center — logo */}
          <Link
            to="/"
            onClick={() => { setMobileNavOpen(false); closeSearch(); }}
            className="tracking-[-0.02em] hover:opacity-80 transition-opacity text-display justify-self-start sm:justify-self-center"
          >
            <span className="text-xl sm:text-2xl lg:text-3xl leading-none">STUDIO DENY</span>
          </Link>

          {/* Right — icons (desktop) */}
          <div className="hidden sm:flex items-center justify-end gap-4 lg:gap-5">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label="Search"
              className={`flex items-center justify-center size-8 transition-opacity ${searchOpen ? "opacity-100" : "hover:opacity-60"}`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
            </button>
            <Link to={user ? "/account" : "/login"} aria-label="Account" className="flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
              <User className="size-4" strokeWidth={1.5} />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="relative flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
              <Heart className="size-4" strokeWidth={1.5} />
              {wishSlugs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-primary text-primary-foreground text-[9px] leading-[15px] text-center font-semibold">
                  {wishSlugs.length}
                </span>
              )}
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
              <ShoppingBag className="size-4" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-primary text-primary-foreground text-[9px] leading-[15px] text-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label={searchOpen ? "Close search" : "Search"}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-full border transition-colors ${
                searchOpen ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
              <span className="text-xs tracking-wide text-mono">{searchOpen ? "Close" : "Search"}</span>
            </button>
            <Link to="/wishlist" aria-label="Wishlist" className="relative flex items-center justify-center size-9 hover:opacity-60 transition-opacity">
              <Heart className="size-4" strokeWidth={1.5} />
              {wishSlugs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-primary text-primary-foreground text-[9px] leading-[15px] text-center font-semibold">
                  {wishSlugs.length}
                </span>
              )}
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative flex items-center justify-center size-9 hover:opacity-60 transition-opacity">
              <ShoppingBag className="size-4" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-primary text-primary-foreground text-[9px] leading-[15px] text-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-sm -mr-1.5 hover:opacity-60 transition-opacity shrink-0"
              onClick={() => { setMobileNavOpen((o) => !o); closeSearch(); }}
            >
              {mobileNavOpen ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Inline search panel — attached to navbar, not full screen */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-border"
              style={{ background: "rgba(255,255,255,0.98)" }}
            >
              {/* Search input row */}
              <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 sm:px-8 lg:px-16 py-3 border-b border-border/50">
                <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 bg-transparent text-base sm:text-lg tracking-wide focus:outline-none placeholder:text-muted-foreground/40"
                />
                {searchQ && (
                  <button type="button" onClick={() => { setSearchQ(""); setSearchResults([]); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="size-4" />
                  </button>
                )}
              </form>

              {/* Results list */}
              <div className="max-h-[min(55vh,420px)] overflow-y-auto">
                {!searchQ.trim() ? (
                  <p className="px-4 sm:px-8 lg:px-16 py-4 text-mono text-[11px] tracking-widest text-muted-foreground">
                    START TYPING TO SEARCH
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 sm:px-8 lg:px-16 py-4 text-mono text-[11px] tracking-widest text-muted-foreground">
                    NO RESULTS FOR "{searchQ.toUpperCase()}"
                  </p>
                ) : (
                  <ul className="px-4 sm:px-8 lg:px-16 py-2">
                    {searchResults.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to="/product/$slug"
                          params={{ slug: p.slug }}
                          onClick={closeSearch}
                          className="flex items-center gap-4 py-2.5 hover:bg-border/20 -mx-3 px-3 rounded transition-colors group"
                        >
                          <div className="w-10 h-12 shrink-0 overflow-hidden bg-surface">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold uppercase tracking-[0.1em] truncate">{p.name}</p>
                            <p className="text-mono text-[10px] tracking-widest text-muted-foreground">{p.category.toUpperCase()}</p>
                          </div>
                          <div className="text-mono text-sm shrink-0 text-muted-foreground">{formatINR(p.price)}</div>
                          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                      </li>
                    ))}
                    <li className="border-t border-border/40 mt-1 pt-1">
                      <button
                        onClick={handleSearch}
                        className="w-full text-left py-2.5 text-mono text-[11px] tracking-widest text-primary hover:underline"
                      >
                        VIEW ALL RESULTS FOR "{searchQ.toUpperCase()}" →
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile: full-screen tabbed mega menu */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[110] sm:hidden bg-background text-foreground flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                  {megaMenu.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMobileActiveTab(cat.id)}
                      className={`shrink-0 text-sm tracking-wide uppercase pb-1 border-b-2 transition-colors ${
                        mobileActiveTab === cat.id ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="shrink-0 ml-3 flex items-center justify-center size-9 hover:opacity-60 transition-opacity"
                >
                  <X className="size-5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {megaMenu
                  .filter((cat) => cat.id === mobileActiveTab)
                  .map((cat) => (
                    <MegaMenuPanel key={cat.id} category={cat} onNavigate={() => setMobileNavOpen(false)} variant="mobile" />
                  ))}

                <div className="px-4 pb-6 pt-2 border-t border-border mt-2">
                  {user ? (
                    <Link to="/account" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase">ACCOUNT</Link>
                  ) : (
                    <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase">LOGIN</Link>
                  )}
                  <Link to="/wishlist" onClick={() => setMobileNavOpen(false)} className="flex items-center justify-between py-3 text-sm font-bold tracking-wide uppercase">
                    WISHLIST {wishSlugs.length > 0 && <span className="text-mono text-xs text-muted-foreground">({wishSlugs.length})</span>}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
