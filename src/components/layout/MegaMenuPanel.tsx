import { Link } from "@tanstack/react-router";
import type { MegaMenuCategory } from "@/lib/megaMenu";

/** Link column + product tiles for one mega-menu category. Shared by the
 * desktop side panel, the mobile full-screen panel, and the admin's live
 * preview — driven entirely by the `category` prop, no data fetching of
 * its own. Desktop stacks tiles one below another (H&M-style, no scroll
 * arrows — capped at 3 tiles so they always fit); mobile scrolls
 * horizontally since it's a full-width swipeable row there instead. */
export function MegaMenuPanel({
  category,
  onNavigate,
  variant = "desktop",
}: {
  category: MegaMenuCategory;
  onNavigate: () => void;
  variant?: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";

  return (
    <div className={isDesktop ? "flex gap-8 p-6" : "flex flex-col gap-8 p-4"}>
      {category.links.length > 0 && (
        <div className={isDesktop ? "flex flex-col gap-1 min-w-[160px] shrink-0" : "flex flex-col gap-1"}>
          {category.links.map((l) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={l.id} to={l.href as any} onClick={onNavigate} className="py-2 text-sm tracking-wide hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {category.products.length > 0 && (
        isDesktop ? (
          <div className="flex flex-col gap-6 min-w-0">
            {category.products.map((p) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={p.id} to={p.href as any} onClick={onNavigate} className="group w-[190px]">
                <div className="relative w-full overflow-hidden bg-surface" style={{ aspectRatio: "4/5" }}>
                  <img
                    src={p.imageUrl}
                    alt={p.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-xs tracking-wide truncate">{p.label}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
              {category.products.map((p) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Link key={p.id} to={p.href as any} onClick={onNavigate} className="group shrink-0 w-[130px]">
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
        )
      )}

      {category.links.length === 0 && category.products.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing in this menu yet.</p>
      )}
    </div>
  );
}
