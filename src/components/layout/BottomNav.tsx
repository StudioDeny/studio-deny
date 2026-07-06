import { Link, useLocation } from "@tanstack/react-router";
import { Home, Grid2X2, ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

type NavItem = { to: string; icon: React.ElementType; label: string };

const NAV_ITEMS: NavItem[] = [
  { to: "/",         icon: Home,        label: "HOME"     },
  { to: "/shop",     icon: Grid2X2,     label: "SHOP"     },
  { to: "/cart",     icon: ShoppingBag, label: "CART"     },
  { to: "/wishlist", icon: Heart,       label: "WISHLIST" },
  { to: "/account",  icon: User,        label: "ACCOUNT"  },
];

export function BottomNav() {
  const location = useLocation();
  const { count } = useCart();
  const { user } = useAuth();
  const { slugs } = useWishlist();

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] sm:hidden border-t border-border"
      style={{
        background: "var(--color-background)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-[56px]">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          const isCart = to === "/cart";
          const isWishlist = to === "/wishlist";
          const dest = to === "/account" && !user ? "/login" : to;

          return (
            <Link
              key={to}
              to={dest}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-150 active:scale-95 ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`size-[19px] ${isWishlist && active ? "fill-primary" : ""}`}
                  strokeWidth={active ? 2.2 : 1.5}
                />
                {isCart && count > 0 && (
                  <span
                    className="absolute -top-[5px] -right-[7px] bg-primary text-primary-foreground font-bold rounded-full flex items-center justify-center leading-none"
                    style={{ fontSize: "8px", minWidth: "14px", height: "14px", padding: "0 2.5px" }}
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
                {isWishlist && slugs.length > 0 && (
                  <span
                    className="absolute -top-[5px] -right-[7px] bg-primary text-primary-foreground font-bold rounded-full flex items-center justify-center leading-none"
                    style={{ fontSize: "8px", minWidth: "14px", height: "14px", padding: "0 2.5px" }}
                  >
                    {slugs.length > 9 ? "9+" : slugs.length}
                  </span>
                )}
              </div>
              <span className="tracking-[0.1em] font-medium uppercase" style={{ fontSize: "7px" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
