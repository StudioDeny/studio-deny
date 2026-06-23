import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navUseSolidBar = !isHomeRoute || scrollY > 12 || mobileNavOpen;

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
            <div className="w-[1px] h-4 bg-white/20 mx-1 hidden lg:block"></div>
            {user ? (
              <Link to="/account" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase">ACCOUNT</Link>
            ) : (
              <Link to="/login" className="text-sm tracking-wide hover:opacity-60 transition-opacity uppercase">LOGIN</Link>
            )}
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
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-11 w-11 items-center justify-center hover:opacity-60 transition-opacity"
            >
              {isLight ? <Moon className="size-4" strokeWidth={1.5} /> : <Sun className="size-4" strokeWidth={1.5} />}
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

        {/* Mobile Nav */}
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
