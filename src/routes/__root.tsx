import { Outlet, Link, createRootRoute, useLocation } from "@tanstack/react-router";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/Navbar";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { ChevronUp } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-display text-[10rem] leading-none text-primary text-glow-primary">404</h1>
        <p className="text-mono tracking-widest text-muted-foreground mt-2">PAGE NOT IN THE DROP</p>
        <Link to="/" className="inline-block mt-8 bg-foreground text-background px-6 py-3 text-mono text-xs tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
          BACK TO STORE
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

import { Preloader } from "@/components/layout/Preloader";
import { useEffect, useRef, useState } from "react";
import { seedIfEmpty } from "@/lib/seed";

import { SmoothScroll, useLenis } from "@/components/common/SmoothScroll";

function RootContent() {
  const [scrolled, setScrolled] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { lenis } = useLenis();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    seedIfEmpty();
    document.title = "STUDIO DENY";
  }, []);

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.style.setProperty("--topbar-h", "0px");
      return;
    }
    const el = topBarRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isAdmin]);

  const scrollToTop = () => {
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AuthProvider>
      <Preloader />
      <WishlistProvider>
        <CartProvider>
          {!isAdmin && (
            <div ref={topBarRef} className="fixed top-0 left-0 right-0 z-[100] flex flex-col">
              <AnnouncementBar />
              <Navbar />
            </div>
          )}
          <main className={isAdmin ? "min-h-screen" : "min-h-[60vh] pt-[var(--topbar-h)]"}>
            <Outlet />
          </main>
          {!isAdmin && (
            <>
              <Footer />
              <CartDrawer />
              {/* Scroll-to-top — visible on all viewports, appears after scrolling 400px */}
              <button
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className={`flex fixed bottom-5 right-5 z-30 size-12 rounded-full border border-border bg-background/80 backdrop-blur-md text-foreground items-center justify-center hover:bg-foreground hover:text-background transition-all duration-300 ${scrolled ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
              >
                <ChevronUp className="size-5" />
              </button>
            </>
          )}
          <Toaster
            theme="system"
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "!rounded-none !border !border-border !bg-background !text-foreground !shadow-xl !font-body",
                title: "!text-foreground !text-xs !tracking-[0.15em] !uppercase !font-bold",
                description: "!text-muted-foreground !text-xs !tracking-wide",
                actionButton: "!rounded-none !bg-foreground !text-background !text-[10px] !tracking-widest !uppercase",
                cancelButton: "!rounded-none !bg-surface !text-muted-foreground !text-[10px] !tracking-widest !uppercase",
                closeButton: "!rounded-none !border-border !text-muted-foreground hover:!text-foreground",
                success: "!border-l-4 !border-l-emerald-500",
                error: "!border-l-4 !border-l-red-500",
                warning: "!border-l-4 !border-l-amber-500",
                info: "!border-l-4 !border-l-blue-500",
              },
            }}
          />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}

function RootComponent() {
  return (
    <SmoothScroll duration={1.2} lerp={0.1} wheelMultiplier={1.0} touchMultiplier={1.5}>
      <RootContent />
    </SmoothScroll>
  );
}
