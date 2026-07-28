import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, ArrowRight, User, Heart, ShoppingBag, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { useCart, formatINR } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { listChildCategories, type Category } from "@/lib/catalog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type CategoryNavItem = {
  label: string;
  slug: string;
  dropdown: { label: string; to: string; params?: { slug: string }; search?: Record<string, unknown> }[];
};

const CATEGORY_NAV: CategoryNavItem[] = [
  {
    label: "WOMEN",
    slug: "women",
    dropdown: [
      { label: "NEW ARRIVALS", to: "/collections/$slug", params: { slug: "women" }, search: { sort: "new" } },
      { label: "SHOP ALL WOMEN", to: "/collections/$slug", params: { slug: "women" } },
    ],
  },
  {
    label: "MEN",
    slug: "men",
    dropdown: [
      { label: "NEW ARRIVALS", to: "/collections/$slug", params: { slug: "men" }, search: { sort: "new" } },
      { label: "SHOP ALL MEN", to: "/collections/$slug", params: { slug: "men" } },
    ],
  },
];

export function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [accessorySubcats, setAccessorySubcats] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const { slugs: wishSlugs } = useWishlist();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listChildCategories("accessories").then(setAccessorySubcats);
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
        className={`relative z-[100] flex flex-col transition-colors duration-300 ${
          scrolled ? "bg-background/0 border-b border-transparent" : "bg-background border-b border-border"
        }`}
      >
        {/* Main bar — left: category dropdowns, center: logo, right: icons */}
        {/* flex on mobile (only 2 children are actually visible there, so justify-between
            puts them flush at opposite edges), grid on desktop (needs the 3-track layout
            so the logo can sit truly centered between the left nav and right icons). */}
        <div className="flex sm:grid sm:grid-cols-[1fr_auto_1fr] items-center justify-between px-4 sm:px-8 lg:px-16 py-2.5 sm:py-3 text-foreground">
          {/* Left — category nav with dropdowns (desktop only) */}
          <div className="hidden sm:flex items-center gap-6 lg:gap-8 font-body">
            {CATEGORY_NAV.map((cat) => (
              <div
                key={cat.slug}
                className="relative"
                onMouseEnter={() => setOpenDropdown(cat.slug)}
                onMouseLeave={() => setOpenDropdown((d) => (d === cat.slug ? null : d))}
              >
                <button
                  type="button"
                  onClick={() => setOpenDropdown((d) => (d === cat.slug ? null : cat.slug))}
                  className="flex items-center gap-1 text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale"
                >
                  {cat.label} <ChevronDown className="size-3" strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {openDropdown === cat.slug && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 pt-3 z-10"
                    >
                      <div className="min-w-[180px] bg-background border border-border shadow-lg py-2">
                        {cat.dropdown.map((item) => (
                          <Link
                            key={item.label}
                            to={item.to}
                            params={item.params}
                            search={item.search as never}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2 text-sm tracking-wide hover:bg-surface hover:text-primary transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown("accessories")}
              onMouseLeave={() => setOpenDropdown((d) => (d === "accessories" ? null : d))}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown((d) => (d === "accessories" ? null : "accessories"))}
                className="flex items-center gap-1 text-sm tracking-wide hover:opacity-60 transition-opacity hover-scale"
              >
                ACCESSORIES <ChevronDown className="size-3" strokeWidth={1.5} />
              </button>
              <AnimatePresence>
                {openDropdown === "accessories" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 pt-3 z-10"
                  >
                    <div className="min-w-[180px] bg-background border border-border shadow-lg py-2">
                      <Link to="/collections/$slug" params={{ slug: "accessories" }} onClick={() => setOpenDropdown(null)}
                        className="block px-4 py-2 text-sm tracking-wide hover:bg-surface hover:text-primary transition-colors">
                        SHOP ALL ACCESSORIES
                      </Link>
                      {accessorySubcats.map((sc) => (
                        <Link key={sc.slug} to="/collections/$slug" params={{ slug: sc.slug }} onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2 text-sm tracking-wide hover:bg-surface hover:text-primary transition-colors">
                          {sc.name.toUpperCase()}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center — logo */}
          <Link
            to="/"
            onClick={() => { setMobileNavOpen(false); closeSearch(); }}
            className="tracking-[-0.02em] hover:opacity-80 transition-opacity text-display justify-self-start sm:justify-self-center"
          >
            <span className="text-lg sm:text-xl leading-none">STUDIO DENY</span>
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

        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border px-4 pb-5 pt-2 sm:hidden overflow-hidden text-foreground bg-background"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="men">
                  <AccordionTrigger className="text-sm font-bold tracking-wide uppercase">MEN</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/collections/$slug" params={{ slug: "men" }} search={{ sort: "new" } as never} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">NEW ARRIVALS</Link>
                      <Link to="/collections/$slug" params={{ slug: "men" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">SHOP ALL MEN</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="women">
                  <AccordionTrigger className="text-sm font-bold tracking-wide uppercase">WOMEN</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/collections/$slug" params={{ slug: "women" }} search={{ sort: "new" } as never} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">NEW ARRIVALS</Link>
                      <Link to="/collections/$slug" params={{ slug: "women" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">SHOP ALL WOMEN</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="accessories">
                  <AccordionTrigger className="text-sm font-bold tracking-wide uppercase">ACCESSORIES</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-3">
                      <Link to="/collections/$slug" params={{ slug: "accessories" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">SHOP ALL ACCESSORIES</Link>
                      <Link to="/collections/$slug" params={{ slug: "rings" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">RINGS</Link>
                      <Link to="/collections/$slug" params={{ slug: "chains" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">CHAINS</Link>
                      <Link to="/collections/$slug" params={{ slug: "socks" }} onClick={() => setMobileNavOpen(false)} className="py-2 text-sm tracking-wide">SOCKS</Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {user ? (
                <Link to="/account" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase">ACCOUNT</Link>
              ) : (
                <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block py-3 text-sm font-bold tracking-wide uppercase">LOGIN</Link>
              )}
              <Link to="/wishlist" onClick={() => setMobileNavOpen(false)} className="flex items-center justify-between py-3 text-sm font-bold tracking-wide uppercase">
                WISHLIST {wishSlugs.length > 0 && <span className="text-mono text-xs text-muted-foreground">({wishSlugs.length})</span>}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
