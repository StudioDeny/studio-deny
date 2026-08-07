import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    getMegaMenu().then((cats) => {
      setMegaMenu(cats);
      setMobileActiveTab((t) => t ?? cats[0]?.id ?? null);
    });
  }, []);

  // Clean up close timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Track scroll position
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

  const handleMouseEnterTab = (id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenDropdown(id);
  };

  const handleMouseLeaveNav = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 160);
  };

  const handleMouseEnterPanel = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
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
        className="relative z-[100] flex flex-col bg-white text-black border-b border-black/10 shadow-sm"
      >
        {/* Main bar — left: category dropdowns, center: logo, right: icons */}
        <div
          className="relative flex sm:grid sm:grid-cols-[1fr_auto_1fr] items-center justify-between px-4 sm:px-8 lg:px-16 py-2.5 sm:py-3"
          onMouseLeave={handleMouseLeaveNav}
        >
          {/* Left — category nav (desktop only) */}
          <div className="hidden sm:flex items-center gap-6 lg:gap-8 font-body">
            <div className="relative z-[96] flex items-center gap-6 lg:gap-8 py-1">
              {megaMenu.map((cat) => {
                const isOpen = openDropdown === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => handleMouseEnterTab(cat.id)}
                    onClick={() => setOpenDropdown((d) => (d === cat.id ? null : cat.id))}
                    className={`relative py-1 flex items-center gap-1.5 text-xs font-mono tracking-[0.18em] uppercase transition-all duration-200 ${
                      isOpen ? "text-black font-extrabold scale-[1.03]" : "text-black/80 hover:text-black font-bold"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <ChevronDown
                      className={`size-3 transition-transform duration-300 ease-out ${
                        isOpen ? "rotate-180 text-black opacity-100" : "opacity-60"
                      }`}
                      strokeWidth={2}
                    />
                    {isOpen && (
                      <motion.div
                        layoutId="activeMegaTab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center — logo */}
          <Link
            to="/"
            onClick={() => { setMobileNavOpen(false); closeSearch(); }}
            className="tracking-[-0.02em] hover:opacity-80 transition-opacity text-display justify-self-start sm:justify-self-center text-black"
          >
            <span className="text-xl sm:text-2xl lg:text-3xl leading-none font-bold">STUDIO DENY</span>
          </Link>

          {/* Right — icons (desktop) */}
          <div className="hidden sm:flex items-center justify-end gap-4 lg:gap-5 text-black">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label="Search"
              className={`flex items-center justify-center size-8 transition-opacity ${searchOpen ? "opacity-100" : "hover:opacity-60"}`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
            </motion.button>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link to={user ? "/account" : "/login"} aria-label="Account" className="flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
                <User className="size-4" strokeWidth={1.5} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link to="/wishlist" aria-label="Wishlist" className="relative flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
                <Heart className="size-4" strokeWidth={1.5} />
                {wishSlugs.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-black text-white text-[9px] leading-[15px] text-center font-bold"
                  >
                    {wishSlugs.length}
                  </motion.span>
                )}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link to="/cart" aria-label="Cart" className="relative flex items-center justify-center size-8 hover:opacity-60 transition-opacity">
                <ShoppingBag className="size-4" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-black text-white text-[9px] leading-[15px] text-center font-bold"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="flex items-center gap-2 sm:hidden text-black">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label={searchOpen ? "Close search" : "Search"}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-full border transition-colors ${
                searchOpen ? "border-black text-black" : "border-black/20 text-black hover:border-black"
              }`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
              <span className="text-xs tracking-wide text-mono font-bold">{searchOpen ? "Close" : "Search"}</span>
            </button>
            <Link to="/wishlist" aria-label="Wishlist" className="relative flex items-center justify-center size-9 hover:opacity-60 transition-opacity">
              <Heart className="size-4" strokeWidth={1.5} />
              {wishSlugs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-black text-white text-[9px] leading-[15px] text-center font-bold">
                  {wishSlugs.length}
                </span>
              )}
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative flex items-center justify-center size-9 hover:opacity-60 transition-opacity">
              <ShoppingBag className="size-4" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-black text-white text-[9px] leading-[15px] text-center font-bold">
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

        {/* Mega Menu Dropdown Panel — anchored to navbar full width */}
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
                  className="fixed inset-x-0 bottom-0 top-[84px] z-[95] bg-black/25 backdrop-blur-[2px] pointer-events-auto"
                  onClick={() => setOpenDropdown(null)}
                />
                {/* Full-width Floating Dropdown Panel Container */}
                <motion.div
                  key="mega-menu-panel-container"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                  onMouseEnter={handleMouseEnterPanel}
                  onMouseLeave={handleMouseLeaveNav}
                  className="absolute top-[calc(100%-1px)] left-0 right-0 w-full z-[99] bg-white border-b border-black/10 shadow-lg overflow-hidden h-[360px] lg:h-[380px]"
                >
                  {/* Invisible hover bridge connecting nav tab row to dropdown container */}
                  <div className="absolute -top-4 inset-x-0 h-4 bg-transparent pointer-events-auto" />

                  {/* Smooth category-to-category crossfade transition */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeCat.id}
                      initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
                      className="h-full w-full"
                    >
                      <MegaMenuPanel category={activeCat} onNavigate={() => setOpenDropdown(null)} variant="desktop" />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>

        {/* Inline search panel — attached to navbar, not full screen */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-black/10 bg-white"
            >
              {/* Search input row */}
              <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 sm:px-8 lg:px-16 py-3 border-b border-black/10">
                <Search className="size-4 shrink-0 text-black/60" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 bg-transparent text-base sm:text-lg tracking-wide focus:outline-none placeholder:text-black/40 text-black font-medium"
                />
                {searchQ && (
                  <button type="button" onClick={() => { setSearchQ(""); setSearchResults([]); inputRef.current?.focus(); }} className="text-black/60 hover:text-black transition-colors shrink-0">
                    <X className="size-4" />
                  </button>
                )}
              </form>

              {/* Results list */}
              <div className="max-h-[min(55vh,420px)] overflow-y-auto">
                {!searchQ.trim() ? (
                  <p className="px-4 sm:px-8 lg:px-16 py-4 text-mono text-[11px] tracking-widest text-black/60 font-bold">
                    START TYPING TO SEARCH
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 sm:px-8 lg:px-16 py-4 text-mono text-[11px] tracking-widest text-black/60 font-bold">
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
                          className="flex items-center gap-4 py-2.5 hover:bg-black/5 -mx-3 px-3 rounded-none transition-colors group"
                        >
                          <div className="w-10 h-12 shrink-0 overflow-hidden bg-black/5">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold uppercase tracking-[0.1em] truncate text-black">{p.name}</p>
                            <p className="text-mono text-[10px] tracking-widest text-black/60 font-bold">{p.category.toUpperCase()}</p>
                          </div>
                          <div className="text-mono text-sm shrink-0 text-black font-bold">{formatINR(p.price)}</div>
                          <ArrowRight className="size-3.5 text-black/60 group-hover:text-black transition-colors shrink-0" />
                        </Link>
                      </li>
                    ))}
                    <li className="border-t border-black/10 mt-1 pt-1">
                      <button
                        onClick={handleSearch}
                        className="w-full text-left py-2.5 text-mono text-[11px] tracking-widest text-black font-bold hover:underline"
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
              className="fixed inset-0 z-[110] sm:hidden bg-white text-black flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-black/10 shrink-0">
                <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                  {megaMenu.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMobileActiveTab(cat.id)}
                      className={`shrink-0 text-sm tracking-wide uppercase pb-1 border-b-2 font-bold transition-colors ${
                        mobileActiveTab === cat.id ? "border-black text-black font-extrabold" : "border-transparent text-black/60"
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

                <div className="px-4 pb-6 pt-2 border-t border-black/10 mt-2">
                  {user ? (
                    <Link to="/account" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase text-black">ACCOUNT</Link>
                  ) : (
                    <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase text-black">LOGIN</Link>
                  )}
                  <Link to="/wishlist" onClick={() => setMobileNavOpen(false)} className="flex items-center justify-between py-3 text-sm font-bold tracking-wide uppercase text-black">
                    WISHLIST {wishSlugs.length > 0 && <span className="text-mono text-xs text-black/60 font-bold">({wishSlugs.length})</span>}
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
