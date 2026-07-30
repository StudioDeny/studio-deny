import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getStoredProduct, upsertProduct, type Product } from "@/lib/productsStore";
import { toast } from "sonner";
import { ProductForm } from "./admin.products.new";

export const Route = createFileRoute("/admin/products/$slug")({
  component: EditProduct,
});

function EditProduct() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Product | null>(null);

  useEffect(() => {
    getStoredProduct(slug).then((product) => setP(product));
  }, [slug]);

  if (!p) return <div className="text-mono text-xs">LOADING…</div>;

  return (
    <ProductForm
      initial={p}
      onSave={async (np) => { await upsertProduct(np); toast.success("Saved"); nav({ to: "/admin/products" }); }}
    />
  );
}
