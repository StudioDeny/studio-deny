import { Link } from "@tanstack/react-router";
import type { MegaMenuCategory, MegaMenuProduct } from "@/lib/megaMenu";
import { formatINR } from "@/context/CartContext";

/** Link column + product tiles for one mega-menu category. Shared by the
 * desktop side panel, the mobile full-screen panel, and the admin's live
 * preview — driven entirely by the `category` prop, no data fetching of
 * its own. Desktop: the 2 featured products sit edge-to-edge side by side
 * filling the panel's other half, name overlaid on the image. Mobile: a
 * 2-up shop-style grid (photo, discount badge, name, price) since there
 * are never more than 2 — no scrolling needed to see them both. */
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

  const nameOverlay = (label: string) => (
    <>
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      <p className="absolute bottom-3 left-3 right-3 text-white font-semibold tracking-wide truncate" style={{ fontSize: "13px" }}>
        {label}
      </p>
    </>
  );

  return (
    <div className={isDesktop ? "flex gap-8 items-stretch" : "flex flex-col gap-6"}>
      {category.links.length > 0 && (
        <div className={isDesktop ? "flex flex-col gap-1 flex-1 min-w-0 py-6 pl-6" : "flex flex-col gap-1 px-4 pt-4"}>
          {category.links.map((l) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={l.id} to={l.href as any} onClick={onNavigate} className="py-2 text-sm tracking-wide hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {category.products.length > 0 && (
        isDesktop ? (
          <div className="grid grid-cols-2 flex-1 min-w-0 min-h-[360px]">
            {category.products.map((p) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={p.id} to={p.href as any} onClick={onNavigate} className="group relative min-w-0 overflow-hidden bg-surface">
                <img
                  src={p.imageUrl}
                  alt={p.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {nameOverlay(p.label)}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {category.products.map((p) => <MobileProductCard key={p.id} product={p} onNavigate={onNavigate} />)}
          </div>
        )
      )}

      {category.links.length === 0 && category.products.length === 0 && (
        <p className="text-sm text-muted-foreground p-6">Nothing in this menu yet.</p>
      )}
    </div>
  );
}

function MobileProductCard({ product, onNavigate }: { product: MegaMenuProduct; onNavigate: () => void }) {
  const discountPct = product.compareAt && product.compareAt > product.price
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : null;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={product.href as any} onClick={onNavigate} className="group block">
      <div className="relative w-full overflow-hidden bg-surface" style={{ aspectRatio: "4/5" }}>
        <img
          src={product.imageUrl}
          alt={product.label}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discountPct !== null && (
          <span className="absolute top-2 left-2 bg-red-600 text-white font-bold px-1.5 py-0.5" style={{ fontSize: "10px" }}>
            -{discountPct}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xs tracking-wide truncate">{product.label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold">{formatINR(product.price)}</span>
        {discountPct !== null && (
          <span className="text-xs text-muted-foreground line-through">{formatINR(product.compareAt!)}</span>
        )}
      </div>
    </Link>
  );
}
