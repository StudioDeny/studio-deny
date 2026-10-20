import { createFileRoute } from "@tanstack/react-router";
import { buildMeta, buildLinks, SITE_URL } from "@/lib/seo";
import { useEffect, useMemo, useState } from "react";
import { listProducts, type Product } from "@/lib/productsStore";
import { listCategories, type Category } from "@/lib/catalog";
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

export const Route = createFileRoute("/shop")({
  validateSearch: validateFilterSearch,
  component: Shop,
  head: () => ({
    meta: buildMeta({
      title: "Shop All Drops — STUDIO DENY",
      description: "Shop the latest streetwear drops from Studio Deny. Hoodies, tees, cargos, outerwear — limited runs, built different.",
      url: `${SITE_URL}/shop`,
    }),
    links: buildLinks(`${SITE_URL}/shop`),
  }),
});

const ITEMS_PER_PAGE = 12;

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState(DEFAULT_LOYALTY_SETTINGS);
  const facts = useFilterFacts();

  useEffect(() => {
    listProducts().then(async (p) => {
      setProducts(p);
      // Hold the loading screen until the first screenful of photos is warm,
      // so the grid arrives complete instead of filling in tile by tile.
      await preloadResponsive(
        p.slice(0, ITEMS_PER_PAGE).map((item) =>
          responsiveImage(item.image, { maxWidth: 1280, sizes: "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" }),
        ),
      );
      setLoaded(true);
    });
  }, []);
  useEffect(() => { listCategories().then(setCategories); }, []);
  useEffect(() => { getLoyaltySettings().then(setLoyaltySettings); }, []);

  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const page = search.page ?? 1;

  const options = useMemo(
    () => buildFilterOptions(products, facts, categories, { curatedColors: loyaltySettings.filterColors }),
    [products, facts, categories, loyaltySettings],
  );
  const filteredItems = useMemo(() => applyFilters(products, filters, facts, categories), [products, filters, facts, categories]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const items = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  // Filters apply as they change; replace (not push) so Back leaves the page
  // instead of stepping through every tap.
  const setFilters = (patch: Partial<Filters>) =>
    navigate({ search: searchFromFilters({ ...filters, ...patch }), replace: true, resetScroll: false });
  const clearAll = () =>
    navigate({ search: searchFromFilters({ ...filtersFromSearch({}), sort: filters.sort }), replace: true, resetScroll: false });
  const goToPage = (n: number) => {
    navigate({ search: { ...search, page: n > 1 ? n : undefined }, resetScroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 pb-24">
      <div className="mb-6">
        {/* ?best=1 is the Best Sellers page (home page Best Sellers buttons). */}
        <div className="text-mono text-primary mb-2" style={{ fontSize: "11px", letterSpacing: "0.35em" }}>◢ {filters.best ? "MOST WANTED" : "ALL DROPS"}</div>
        <h1 className="text-display leading-none" style={{ fontSize: "clamp(52px, 8vw, 96px)" }}>{filters.best ? "BEST SELLERS" : "SHOP"}</h1>
      </div>

      <ProductFilterBar
        filters={filters}
        options={options}
        onChange={setFilters}
        onClear={clearAll}
        resultCount={filteredItems.length}
        allCategoriesLabel="ALL CATEGORIES"
        showSearch
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
        ) : items.length === 0 ? (
          <div className="py-32 text-center">
            <div className="text-display text-muted-foreground/30" style={{ fontSize: "clamp(48px, 8vw, 96px)" }}>
              NOTHING
            </div>
            <p className="text-mono text-muted-foreground mt-3" style={{ fontSize: "11px", letterSpacing: "0.3em" }}>
              TRY ANOTHER FILTER COMBO
            </p>
            {activeFilterCount(filters) > 0 && (
              <button
                onClick={clearAll}
                className="mt-6 border border-border px-6 py-2.5 text-mono text-muted-foreground hover:border-primary hover:text-primary transition-colors inline-block"
                style={{ fontSize: "11px", letterSpacing: "0.2em" }}
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} priority={i < 4} />)}
            </div>

            {totalPages > 1 && (
              <div className="mt-20 border-t border-border pt-10 flex items-center justify-between">
                <button
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                  className="text-mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-20 hover:text-primary transition-colors"
                >
                  ← PREV
                </button>
                <div className="flex gap-4">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i + 1)}
                      aria-current={page === i + 1 ? "page" : undefined}
                      className={`text-mono text-[11px] tracking-widest ${page === i + 1 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => goToPage(page + 1)}
                  className="text-mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-20 hover:text-primary transition-colors"
                >
                  NEXT →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
