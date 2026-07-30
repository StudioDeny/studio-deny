import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MegaMenuCategory } from "@/lib/megaMenu";

/** Link column + horizontally-scrollable image tile row for one mega-menu
 * category. Shared by the desktop hover dropdown, the mobile full-screen
 * panel, and the admin's live preview — driven entirely by the `category`
 * prop, no data fetching of its own. */
export function MegaMenuPanel({
  category,
  onNavigate,
  variant = "desktop",
}: {
  category: MegaMenuCategory;
  onNavigate: () => void;
  variant?: "desktop" | "mobile";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => scrollerRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  const isDesktop = variant === "desktop";

  return (
    <div className={isDesktop ? "flex gap-10 p-6" : "flex flex-col gap-8 p-4"}>
      {category.links.length > 0 && (
        <div className={isDesktop ? "flex flex-col gap-1 min-w-[180px] shrink-0" : "flex flex-col gap-1"}>
          {category.links.map((l) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={l.id} to={l.href as any} onClick={onNavigate} className="py-2 text-sm tracking-wide hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {category.products.length > 0 && (
        <div className="relative flex-1 min-w-0">
          {isDesktop && category.products.length > 2 && (
            <>
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Scroll left"
                className="hidden md:flex absolute -left-3 top-[calc(50%-14px)] -translate-y-1/2 z-10 size-8 items-center justify-center rounded-full bg-background border border-border hover:border-primary hover:text-primary"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Scroll right"
                className="hidden md:flex absolute -right-3 top-[calc(50%-14px)] -translate-y-1/2 z-10 size-8 items-center justify-center rounded-full bg-background border border-border hover:border-primary hover:text-primary"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
          <div ref={scrollerRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            {category.products.map((p) => (
              <Link
                key={p.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={p.href as any}
                onClick={onNavigate}
                className={`group shrink-0 ${isDesktop ? "w-[150px] sm:w-[170px]" : "w-[130px]"}`}
              >
                <div className="relative w-full overflow-hidden bg-surface" style={{ aspectRatio: "4/5" }}>
                  <img
                    src={p.imageUrl}
                    alt={p.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-xs tracking-wide text-center truncate">{p.label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {category.links.length === 0 && category.products.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing in this menu yet.</p>
      )}
    </div>
  );
}
