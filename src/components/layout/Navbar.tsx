import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Trophy, Search, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { formatINR } from "@/context/CartContext";

export function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const location = useLocation();
  const navigate = useNavigate();
  const isHomeRoute = location.pathname === "/";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  // Force solid nav bar when search is open
  const navUseSolidBar = !isHomeRoute || scrollY > 12 || mobileNavOpen || searchOpen;

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
        className={`fixed top-0 left-0 right-0 z-[100] flex flex-col transition-[background,backdrop-filter] duration-300 ${
          navUseSolidBar
            ? isLight
              ? "bg-white/95 backdrop-blur-md border-b border-black/[0.08]"
              : "bg-[rgba(10,10,10,0.95)] backdrop-blur-md border-b border-white/[0.06]"
            : isLight
            ? "bg-transparent"
            : "mix-blend-difference"
        }`}
      >
        {/* Main bar */}
        <div className={`flex w-full items-center justify-between px-4 sm:px-8 lg:px-16 py-4 sm:py-6 ${isLight && navUseSolidBar ? "text-foreground" : "text-white"}`}>
          <Link
            to="/"
            onClick={() => { setMobileNavOpen(false); closeSearch(); }}
            className="tracking-[-0.02em] hover:opacity-80 transition-opacity text-display"
          >
            <span className="text-[1.65rem] sm:text-[2.5rem] leading-none">STUDIO DENY</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex gap-5 lg:gap-7 items-center font-body">
            <Link to="/shop" className="text-sm tracking-wide hover:opacity-60 transition-opacity">SHOP</Link>
            <Link to="/collections/$slug" params={{ slug: "men" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity">MEN</Link>
            <Link to="/collections/$slug" params={{ slug: "women" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity">WOMEN</Link>
            <Link to="/collections/$slug" params={{ slug: "accessories" }} className="text-sm tracking-wide hover:opacity-60 transition-opacity hidden lg:inline">ACCESSORIES</Link>
            <Link to="/lookbook" className="text-sm tracking-wide hover:opacity-60 transition-opacity">LOOKBOOK</Link>
            <Link to="/about" className="text-sm tracking-wide hover:opacity-60 transition-opacity hidden lg:inline">ABOUT</Link>
            <Link to="/contact" className="text-sm tracking-wide hover:opacity-60 transition-opacity hidden lg:inline">CONTACT</Link>
            <Link
              to="/rewards"
              className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] font-semibold px-3 py-1.5 border border-current/25 hover:border-current/60 transition-colors text-mono"
            >
              <Trophy className="w-3 h-3 opacity-80" />
              REWARDS
            </Link>
            <Link to="/cart" className="text-sm tracking-wide hover:opacity-60 transition-opacity">CART</Link>
            <div className="w-[1px] h-4 bg-white/20 mx-1 hidden lg:block" />
            {user ? (
              <Link to="/account" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase">ACCOUNT</Link>
            ) : (
              <Link to="/login" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase">LOGIN</Link>
            )}
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label="Search"
              className={`flex items-center justify-center size-8 transition-opacity ${searchOpen ? "opacity-100" : "hover:opacity-60"}`}
            >
              {searchOpen ? <X className="size-4" strokeWidth={1.5} /> : <Search className="size-4" strokeWidth={1.5} />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-current/25 hover:border-current/60 transition-colors text-mono text-[9px] tracking-[0.18em] font-bold"
            >
              {isLight ? <Moon className="size-3" strokeWidth={1.5} /> : <Sun className="size-3" strokeWidth={1.5} />}
              {isLight ? "DARK" : "LIGHT"}
            </button>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setMobileNavOpen(false); }}
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center hover:opacity-60 transition-opacity"
            >
              {searchOpen ? <X className="size-[19px]" strokeWidth={1.5} /> : <Search className="size-[19px]" strokeWidth={1.5} />}
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-sm -mr-1 hover:opacity-60 transition-opacity"
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
              style={{ background: isLight ? "rgba(255,255,255,0.98)" : "rgba(10,10,10,0.98)" }}
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

        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-1 border-t border-border px-4 pb-5 pt-2 sm:hidden overflow-hidden text-foreground bg-background"
            >
              <Link to="/collections/$slug" params={{ slug: "men" }} onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide">MEN</Link>
              <Link to="/collections/$slug" params={{ slug: "women" }} onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide">WOMEN</Link>
              <Link to="/collections/$slug" params={{ slug: "accessories" }} onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide">ACCESSORIES</Link>
              <Link to="/lookbook" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide">LOOKBOOK</Link>
              <Link to="/about" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide">ABOUT</Link>
              <Link to="/contact" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm tracking-wide border-b border-border">CONTACT</Link>
              <button
                type="button"
                onClick={() => { toggleTheme(); setMobileNavOpen(false); }}
                className="mt-1 inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors text-mono text-[10px] tracking-[0.2em] font-bold"
              >
                {isLight ? <Moon className="size-3.5" strokeWidth={1.5} /> : <Sun className="size-3.5" strokeWidth={1.5} />}
                {isLight ? "DARK MODE" : "LIGHT MODE"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
