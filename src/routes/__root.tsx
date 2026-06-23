import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { BottomNav } from "@/components/layout/BottomNav";
import { useRouterState } from "@tanstack/react-router";
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
import { useEffect } from "react";
import { seedIfEmpty } from "@/lib/seed";

function RootComponent() {
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/" });
  useEffect(() => {
    seedIfEmpty();

    const titles = [
      "𝗦𝗧𝗨𝗗𝗜𝗢 𝗗𝗘𝗡𝗬",
      "🏷️ 𝟮𝟬% 𝗢𝗳𝗳 𝗢𝗿𝗱𝗲𝗿𝘀",
      "🔥 𝗡𝗲𝘄 𝗗𝗿𝗼𝗽𝘀 𝗟𝗶𝘃𝗲",
      "🖤 𝗝𝗼𝗶𝗻 𝘁𝗵𝗲 𝗦𝘆𝗻𝗱𝗶𝗰𝗮𝘁𝗲",
      "⚡️ 𝗦𝘁𝗿𝗲𝗲𝘁𝘄𝗲𝗮𝗿 𝗙𝗼𝗿 𝗧𝗵𝗲 𝗥𝗲𝘀𝘁𝗹𝗲𝘀𝘀"
    ];
    let i = 0;
    document.title = titles[0];

    const interval = setInterval(() => {
      i = (i + 1) % titles.length;
      document.title = titles[i];
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <Preloader />
        <WishlistProvider>
          <CartProvider>
            <Navbar />
            <main className={`min-h-[60vh] pb-16 sm:pb-0 ${!isHome ? "pt-28 sm:pt-36" : ""}`}>
              <Outlet />
            </main>
            <Footer />
            <CartDrawer />
            <BottomNav />
            {/* WhatsApp — lifted above bottom nav on mobile */}
            <a
              href="https://wa.me/919999999999?text=Hi!%20I'm%20interested%20in%20Studio%20Deny%20products."
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="fixed bottom-[74px] sm:bottom-5 right-5 z-30 size-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold glow-lime hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
            </a>
            {/* Scroll-to-top — hidden on mobile (bottom nav has home tab) */}
            <button
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="hidden sm:flex fixed bottom-[84px] right-5 z-30 size-12 rounded-full border border-border bg-background/80 backdrop-blur-md text-foreground items-center justify-center hover:bg-foreground hover:text-background transition-all duration-300"
            >
              <ChevronUp className="size-5" />
            </button>
            <Toaster theme="system" position="top-right" />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
