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
    if (searchOpen && allProducts.length === 0) {
      listProducts().then(setAllProducts);
    }
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
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
          .slice(0, 6)
      );
    }, 200);
    return () => clearTimeout(t);
  }, [searchQ, allProducts]);

  const closeSearch = () => { setSearchOpen(false); setSearchQ(""); setSearchResults([]); };

  const navUseSolidBar = !isHomeRoute || scrollY > 12 || mobileNavOpen;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    navigate({ to: "/shop", search: { q: searchQ.trim() } });
    closeSearch();
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-[100] flex flex-col transition-[background,backdrop-filter] duration-300 ${
          navUseSolidBar
            ? isLight
              ? "bg-white/90 backdrop-blur-md border-b border-black/[0.08]"
              : "bg-[rgba(10,10,10,0.82)] backdrop-blur-md mix-blend-normal border-b border-white/[0.06]"
            : isLight
            ? "bg-transparent"
            : "mix-blend-difference"
        }`}
      >
        <div className={`flex w-full items-center justify-between px-4 sm:px-8 lg:px-16 py-4 sm:py-6 ${isLight && navUseSolidBar ? "text-foreground" : "text-white"}`}>
          <Link
            to="/"
            onClick={() => setMobileNavOpen(false)}
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
            {/* Desktop search icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex items-center justify-center size-8 hover:opacity-60 transition-opacity"
            >
              <Search className="size-4" strokeWidth={1.5} />
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
              onClick={() => { setSearchOpen(true); setMobileNavOpen(false); }}
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center hover:opacity-60 transition-opacity"
            >
              <Search className="size-[19px]" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-sm -mr-1 hover:opacity-60 transition-opacity"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

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

      {/* Search overlay — all screen sizes */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-background flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-border shrink-0">
              <span className="text-mono text-[10px] tracking-[0.3em] text-muted-foreground">SEARCH PRODUCTS</span>
              <button onClick={closeSearch} className="flex items-center justify-center size-9 hover:opacity-60">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Input */}
            <form onSubmit={handleSearch} className="px-4 sm:px-8 pt-6 pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 max-w-2xl">
                <Search className="size-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="What are you looking for?"
                  className="flex-1 bg-transparent text-[1.4rem] sm:text-[1.6rem] tracking-tight focus:outline-none placeholder:text-muted-foreground/40"
                />
                {searchQ && (
                  <button type="button" onClick={() => { setSearchQ(""); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 max-w-2xl w-full">
              {!searchQ.trim() ? (
                <p className="text-mono text-[11px] tracking-widest text-muted-foreground pt-4">START TYPING TO SEARCH</p>
              ) : searchResults.length === 0 ? (
                <p className="text-mono text-[11px] tracking-widest text-muted-foreground pt-4">NO RESULTS FOR "{searchQ.toUpperCase()}"</p>
              ) : (
                <ul className="space-y-1">
                  {searchResults.map((p) => (
                    <li key={p.slug}>
                      <Link
                        to="/product/$slug"
                        params={{ slug: p.slug }}
                        onClick={closeSearch}
                        className="flex items-center gap-4 py-3 px-2 hover:bg-surface rounded transition-colors group"
                      >
                        <div className="w-12 h-14 shrink-0 overflow-hidden bg-surface">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold uppercase tracking-[0.12em] truncate">{p.name}</p>
                          <p className="text-mono text-[10px] tracking-widest text-muted-foreground mt-0.5">{p.category.toUpperCase()}</p>
                        </div>
                        <div className="text-mono text-sm shrink-0">{formatINR(p.price)}</div>
                        <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    </li>
                  ))}
                  {/* View all */}
                  <li className="pt-2">
                    <button
                      onClick={handleSearch}
                      className="w-full text-left py-3 px-2 text-mono text-[11px] tracking-widest text-primary hover:underline"
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
    </>
  );
}
