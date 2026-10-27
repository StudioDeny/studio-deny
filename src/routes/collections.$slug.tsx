import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollAnchor } from "@/hooks/useScrollAnchor";
import { productsInCategory, listCategories } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import type { Product } from "@/lib/productsStore";
import { getLoyaltySettings, DEFAULT_LOYALTY_SETTINGS } from "@/lib/settings";
import {
  applyFilters,
  buildFilterOptions,
  filtersFromSearch,
  searchFromFilters,
  validateFilterSearch,
  activeFilterCount,
  type Filters,
} from "@/lib/productFilters";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilterBar, useFilterFacts } from "@/components/product/ProductFilterBar";
import { QuoteLoader } from "@/components/ui/QuoteLoader";
import { preloadResponsive } from "@/lib/preload";
import { responsiveImage } from "@/lib/image";
import { buildMeta, buildLinks, SITE_URL, collectionJsonLd } from "@/lib/seo";

const COL_DESC: Record<string, string> = {
  men: "Shop men's streetwear from Studio Deny. Heavyweight tees, oversized hoodies, cargos, and outerwear — built for those who move different.",
  women: "Shop women's streetwear from Studio Deny. Premium fabrics, raw silhouettes, and limited drops made for the streets.",
  accessories: "Studio Deny accessories — caps, bags, and essentials that complete the fit without trying too hard.",
  tops: "Shop all tops from Studio Deny. Graphic tees, shirts, and hoodies in heavyweight cotton with a structured, oversized cut.",
  bottoms: "Cargos, joggers, and trousers from Studio Deny. Built for movement, styled for the streets.",
  outerwear: "Studio Deny outerwear. Bombers, windbreakers, and jackets that outlast every season.",
};

export const Route = createFileRoute("/collections/$slug")({
  validateSearch: validateFilterSearch,
  component: CollectionPage,
  head: ({ params }) => {
    const slug = params.slug;
    const name = slug.replace(/-/g, " ").toUpperCase();
    const desc = COL_DESC[slug] ?? `Shop the ${name} collection from Studio Deny. Limited drops, premium streetwear.`;
    const url = `${SITE_URL}/collections/${slug}`;
    return {
      meta: buildMeta({ title: `${name} Collection — STUDIO DENY`, description: desc, url }),
      links: buildLinks(url),
      scripts: [{ type: "application/ld+json", children: collectionJsonLd(name, url) }],
    };
  },
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 4>(4);
  const [all, setAll] = useState<Category[]>([]);
  const [loyaltySettings, setLoyaltySettings] = useState(DEFAULT_LOYALTY_SETTINGS);
  const facts = useFilterFacts();
  const pageRef = useRef<HTMLElement>(null);
  useScrollAnchor(pageRef);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    productsInCategory(slug).then(async (r) => {
      if (cancelled) return;
      setItems(r);
      // Hold the loading screen until the first screenful of photos is warm,
      // so the grid arrives complete instead of filling in tile by tile.
      await preloadResponsive(
        r.slice(0, 12).map((item) =>
          responsiveImage(item.image, { maxWidth: 1280, sizes: "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" }),
        ),
      );
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [slug]);
  useEffect(() => { listCategories().then(setAll); }, []);
  useEffect(() => { getLoyaltySettings().then(setLoyaltySettings); }, []);

  const cat = useMemo(() => all.find((c) => c.slug.toLowerCase() === slug.toLowerCase()), [all, slug]);
  const title = (cat?.name ?? slug.replace(/-/g, " ")).toUpperCase();

  // On a collection, the category filter picks one of its subcategories.
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const options = useMemo(
    () => buildFilterOptions(items, facts, cat ? all : [], { scope: cat, curatedColors: loyaltySettings.filterColors }),
    [items, facts, all, cat, loyaltySettings],
  );
  const filtered = useMemo(() => applyFilters(items, filters, facts, all), [items, filters, facts, all]);

  const setFilters = (patch: Partial<Filters>) =>
    navigate({ search: searchFromFilters({ ...filters, ...patch }), replace: true, resetScroll: false });
  const clearAll = () =>
    navigate({ search: searchFromFilters({ ...filtersFromSearch({}), sort: filters.sort }), replace: true, resetScroll: false });

  const gridSwitcher = (
    <div className="hidden sm:flex items-center border border-border">
      <button
        type="button"
        aria-label="2 columns view"
        aria-pressed={gridCols === 2}
        onClick={() => setGridCols(2)}
        className={`px-2.5 h-[34px] transition-colors ${gridCols === 2 ? "bg-foreground text-background" : "hover:text-primary"}`}
      >
        <div className="w-4 h-4 border border-current flex justify-between p-[1px]">
          <div className="w-[6px] h-full bg-current" />
          <div className="w-[6px] h-full bg-current" />
        </div>
      </button>
      <button
        type="button"
        aria-label="4 columns view"
        aria-pressed={gridCols === 4}
        onClick={() => setGridCols(4)}
        className={`px-2.5 h-[34px] transition-colors border-l border-border ${gridCols === 4 ? "bg-foreground text-background" : "hover:text-primary"}`}
      >
        <div className="w-4 h-4 grid grid-cols-2 gap-[1px] p-[1px]">
          <div className="bg-current" />
          <div className="bg-current" />
          <div className="bg-current" />
          <div className="bg-current" />
        </div>
      </button>
    </div>
  );

  const gridClass = `grid gap-4 sm:gap-6 ${gridCols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`;

  return (
    <section ref={pageRef} className="px-4 md:px-8 mt-4 md:mt-8 pb-16 max-w-[1700px] mx-auto">
      <div className="mb-6">
        <div className="text-mono text-[10px] tracking-[0.3em] text-primary mb-2">COLLECTION</div>
        <h1 className="text-display text-5xl md:text-7xl">{title}.</h1>
      </div>

      <ProductFilterBar
        filters={filters}
        options={options}
        onChange={setFilters}
        onClear={clearAll}
        resultCount={filtered.length}
        allCategoriesLabel={`ALL ${title}`}
        trailing={gridSwitcher}
      />

      <div className="mt-6">
        {/* Stays mounted and is told when to leave, so it can hold for its
            minimum time and fade out over the finished grid. */}
        <QuoteLoader active={!loaded} />
        {!loaded ? (
          // The loader is fixed and portalled, so it adds no height. With the
          // grid empty the document collapses to header + filters + footer,
          // and the scroll position carried over from the last page lands the
          // visitor at the bottom of it. This holds the page at normal height.
          <div className="min-h-screen" aria-hidden />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border p-8">
            <p className="text-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
              {items.length === 0 ? "Nothing in this collection yet." : "No products match these filters."}
            </p>
            {activeFilterCount(filters) > 0 && (
              <button onClick={clearAll} className="text-mono text-xs font-bold tracking-widest text-primary hover:underline">
                CLEAR FILTERS →
              </button>
            )}
          </div>
        ) : (
          <div className={gridClass}>
            {filtered.map((p, i) => (
              <ProductCard
                key={p.slug}
                product={p}
                priority={i < 4}
                imageSizes={gridCols === 2 ? "(min-width: 640px) 50vw, 100vw" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
