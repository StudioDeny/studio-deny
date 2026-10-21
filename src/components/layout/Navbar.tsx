import { Link, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Search, ArrowRight, User, Heart, ShoppingBag, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getMegaMenu, type MegaMenuCategory } from "@/lib/megaMenu";
import { MegaMenuPanel } from "@/components/layout/MegaMenuPanel";
import { useLenis } from "@/components/common/SmoothScroll";
import { thumbImage } from "@/lib/image";

export function Navbar() {
  const { lenis } = useLenis();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [megaMenu, setMegaMenu] = useState<MegaMenuCategory[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<string | null>(null);
  // +1 when the newly picked tab is to the right of the last one, -1 to the
  // left: the panel content slides in from the side the visitor tapped.
  const [tabDirection, setTabDirection] = useState(1);
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
            data-overlay
            className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-[2px]"
            onClick={closeSearch}
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-[100] flex flex-col text-black border-b border-black/[0.08]"
      >
        {/* Glass. On its own layer rather than on the <nav>: backdrop-filter
            makes an element the containing block for its fixed descendants,
            and the mobile menu and mega-menu backdrop below are fixed
            full-screen layers — blurring the <nav> itself would shrink them
            to the bar. Mostly-opaque fallback where blur isn't supported. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-white/90 supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150"
        />
        {/* Main bar — left: category dropdowns, center: logo, right: icons — ALWAYS z-[100] ON TOP */}
        <div
          className="relative z-[100] flex sm:grid sm:grid-cols-[1fr_auto_1fr] items-center justify-between px-4 sm:px-8 lg:px-16 py-2.5 sm:py-3"
          onMouseLeave={handleMouseLeaveNav}
        >
          {/* Left — category nav (desktop only) */}
          <div className="hidden sm:flex items-center gap-6 lg:gap-8 font-body">
            <div className="relative z-[102] flex items-center gap-6 lg:gap-8 py-1">
              {megaMenu.map((cat) => {
                const isOpen = openDropdown === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => handleMouseEnterTab(cat.id)}
                    onClick={() => setOpenDropdown((d) => (d === cat.id ? null : cat.id))}
                    className={`nav-tab-btn group relative py-1 flex items-center gap-1.5 text-xs font-mono tracking-[0.18em] uppercase transition-colors duration-200 ${
                      isOpen ? "text-black font-extrabold" : "text-black/80 hover:text-black font-bold"
                    }`}
                  >
                    <span className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[1.5px]">{cat.label}</span>
                    <ChevronDown
                      className={`size-3 transition-transform duration-300 ease-out ${
                        isOpen ? "rotate-180 text-black opacity-100" : "opacity-60"
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center — logo */}
          <Link
            to="/"
            onClick={() => {
              setMobileNavOpen(false);
              closeSearch();
              // Already on the homepage: the link goes nowhere, so take the
              // user back to the top instead. Other pages navigate home and
              // land at the top anyway.
              if (window.location.pathname === "/") {
                if (lenis) lenis.scrollTo(0);
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="hover:opacity-80 transition-opacity justify-self-start sm:justify-self-center"
            // HeroLogo flies into this slot on the home page and measures it.
            data-nav-logo
          >
            <BrandLogo className="text-[18px] sm:text-[21px] lg:text-[24px]" />
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
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              className="flex h-11 w-11 items-center justify-center rounded-sm -mr-1.5 hover:opacity-60 transition-opacity shrink-0"
              onClick={() => { setMobileNavOpen((o) => !o); closeSearch(); }}
            >
              <MenuMorphIcon open={mobileNavOpen} />
            </button>
          </div>
        </div>

        {/* Mega Menu Dropdown Panel — anchored immediately below navbar at top-full (z-[90]) */}
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
                  data-overlay
                  className="fixed inset-x-0 bottom-0 top-[84px] z-[80] bg-black/25 backdrop-blur-[2px] pointer-events-auto"
                  onClick={() => setOpenDropdown(null)}
                />
                {/* Full-width Floating Dropdown Panel Container — z-[90] sits under main bar z-[100] */}
                <motion.div
                  key="mega-menu-panel-container"
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }}
                  onMouseEnter={handleMouseEnterPanel}
                  onMouseLeave={handleMouseLeaveNav}
                  className="absolute top-full left-0 right-0 w-full z-[90] bg-white border-b border-black/10 overflow-y-auto overscroll-contain h-[360px] lg:h-[380px]"
                  data-lenis-prevent
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
              className="overflow-hidden border-t border-black/10 bg-white z-[99]"
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
                            <img src={thumbImage(p.image, 120)} alt={p.name} width={40} height={48} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
              // Wipes down from the top like a curtain, and back up on close.
              // clip-path rather than a slide: the panel stays put while its
              // visible edge travels, so nothing inside it moves on entry.
              initial={shouldReduceMotion ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { clipPath: "inset(0 0 100% 0)", transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1] } }
              }
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.55, ease: [0.76, 0, 0.24, 1] }}
              data-overlay
              className="fixed inset-0 z-[110] sm:hidden bg-white text-black flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-black/10 shrink-0">
                <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                  {megaMenu.map((cat, i) => {
                    const active = mobileActiveTab === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: shouldReduceMotion ? 0 : 0.2 + i * 0.05 }}
                        onClick={() => {
                          const from = megaMenu.findIndex((c) => c.id === mobileActiveTab);
                          setTabDirection(i >= from ? 1 : -1);
                          setMobileActiveTab(cat.id);
                        }}
                        aria-pressed={active}
                        className={`relative shrink-0 text-sm tracking-wide uppercase pb-1 font-bold transition-colors duration-300 ${
                          active ? "text-black font-extrabold" : "text-black/50"
                        }`}
                      >
                        {cat.label}
                        {/* One underline that slides between tabs. */}
                        {active && (
                          <motion.span
                            layoutId="mobile-tab-underline"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                            className="absolute inset-x-0 -bottom-px h-0.5 bg-black"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                  initial={shouldReduceMotion ? false : { opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: shouldReduceMotion ? 0 : 0.25 }}
                  className="shrink-0 ml-3 flex items-center justify-center size-9 hover:opacity-60 transition-opacity"
                >
                  <X className="size-5" strokeWidth={1.5} />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
                  {megaMenu
                    .filter((cat) => cat.id === mobileActiveTab)
                    .map((cat) => (
                      <motion.div
                        key={cat.id}
                        custom={tabDirection}
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 * tabDirection }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 * tabDirection }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <MegaMenuPanel category={cat} onNavigate={() => setMobileNavOpen(false)} variant="mobile" />
                      </motion.div>
                    ))}
                </AnimatePresence>

                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: shouldReduceMotion ? 0 : 0.5 }}
                  className="px-4 pb-6 pt-2 border-t border-black/10 mt-2"
                >
                  {user ? (
                    <Link to="/account" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase text-black">ACCOUNT</Link>
                  ) : (
                    <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase text-black">LOGIN</Link>
                  )}
                  <Link to="/wishlist" onClick={() => setMobileNavOpen(false)} className="flex items-center justify-between py-3 text-sm font-bold tracking-wide uppercase text-black">
                    WISHLIST {wishSlugs.length > 0 && <span className="text-mono text-xs text-black/60 font-bold">({wishSlugs.length})</span>}
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

/**
 * Hamburger that morphs into a close cross: the top and bottom bars rotate
 * into an X while the middle one shrinks away, and back again. Drawn from
 * three bars rather than swapping two icons, so it moves instead of popping.
 */
function MenuMorphIcon({ open }: { open: boolean }) {
  const reduce = useReducedMotion();
  const t = { duration: reduce ? 0 : 0.35, ease: [0.76, 0, 0.24, 1] as const };
  return (
    <span aria-hidden className="relative block h-6 w-6">
      <motion.span
        className="absolute left-[3px] right-[3px] top-[6px] h-[1.5px] bg-current origin-center"
        animate={open ? { y: 5.25, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={t}
      />
      <motion.span
        className="absolute left-[3px] right-[3px] top-[11.25px] h-[1.5px] bg-current"
        animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
        transition={t}
      />
      <motion.span
        className="absolute left-[3px] right-[3px] top-[16.5px] h-[1.5px] bg-current origin-center"
        animate={open ? { y: -5.25, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={t}
      />
    </span>
  );
}
