import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { listProducts, type Product } from "@/lib/productsStore";
import { ProductCard } from "@/components/product/ProductCard";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
  head: () => ({ meta: [{ title: "Wishlist — STUDIO DENY" }] }),
});

function WishlistPage() {
  const { slugs, clear } = useWishlist();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  useEffect(() => { listProducts().then(setAllProducts); }, []);
  const items = allProducts.filter((p) => slugs.includes(p.slug));

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ SAVED FOR LATER</div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
        <h1 className="text-display text-5xl md:text-7xl">WISHLIST.</h1>
        {items.length > 0 && (
          <button onClick={clear} className="text-mono text-[11px] tracking-widest text-muted-foreground hover:text-primary">CLEAR ALL</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-muted-foreground">No saves yet. Tap the heart on what hits.</p>
          <Link to="/shop" className="mt-4 inline-block text-mono text-xs tracking-widest text-primary hover:underline">→ EXPLORE THE DROP</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} />)}
        </div>
      )}
    </section>
  );
}
