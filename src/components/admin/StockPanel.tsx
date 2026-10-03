// Right-side panel opened from the products list: the product's colours,
// sizes and stock in the same colour-card editor as the product form.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StockEditor } from "@/components/admin/StockEditor";
import { listSizesForCategory } from "@/lib/sizes";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/productsStore";
import {
  cardsFromVariants, colorsFromCards, describeSaveResult, listVariantRows, planStockSave, saveStockPlan,
  validateCards, type ColourCard, type VariantRow,
} from "@/lib/stockEditor";

export function StockPanel({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [cards, setCards] = useState<ColourCard[]>([]);
  const [sizeLabels, setSizeLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async (p: Product) => {
    setLoading(true);
    try {
      const [r, sizes] = await Promise.all([
        listVariantRows(p.slug),
        p.categoryId ? listSizesForCategory(p.categoryId) : Promise.resolve([]),
      ]);
      setRows(r);
      setCards(cardsFromVariants(r, p.colors, p.price, p.compareAt));
      setSizeLabels(sizes.map((s) => s.label));
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product) load(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug]);

  const close = () => {
    if (dirty && !confirm("You have unsaved stock changes. Close without saving?")) return;
    onClose();
  };

  const save = async () => {
    if (!product) return;
    const problem = validateCards(cards, product.is_active ?? true);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const plan = planStockSave(rows, cards, product.price, product.compareAt);
      // Keep the storefront colour swatches in step with the colour cards.
      const { error } = await supabase.from("products").update({ colors: colorsFromCards(cards) }).eq("slug", product.slug);
      if (error) throw new Error(error.message);
      const result = await saveStockPlan(product.slug, plan);
      const note = describeSaveResult(result);
      await load(product);
      onSaved();
      if (note) toast.warning(note, { duration: 10000 });
      else toast.success("Stock saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!product} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        {product && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 bg-muted overflow-hidden shrink-0">
                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-display text-2xl truncate">{product.name.toUpperCase()}</SheetTitle>
                  <SheetDescription className="text-mono text-[10px] tracking-widest">
                    {product.category || "NO CATEGORY"} · ₹{product.price}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {!product.categoryId ? (
                <p className="text-mono text-[11px] text-muted-foreground">
                  This product has no category, so there are no sizes to stock. Open the full edit form to pick one.
                </p>
              ) : loading ? (
                <p className="text-mono text-[11px] text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Loading stock…
                </p>
              ) : (
                <>
                  {rows.length === 0 && (
                    <p className="text-mono text-[11px] bg-amber-100 text-amber-800 p-2">
                      NEEDS SIZE COUNTS — this product only has one overall stock number. Tap each size and enter how many you have.
                    </p>
                  )}
                  <StockEditor
                    cards={cards}
                    onChange={(c) => { setCards(c); setDirty(true); }}
                    sizeLabels={sizeLabels}
                    productPrice={product.price}
                    productCompareAt={product.compareAt}
                  />
                  <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t border-border">
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving || !dirty}
                      className="flex-1 bg-primary text-primary-foreground h-11 text-mono text-xs tracking-widest disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      {saving ? "SAVING…" : dirty ? "SAVE STOCK" : "NO CHANGES"}
                    </button>
                    <Link
                      to="/admin/products/$slug"
                      params={{ slug: product.slug }}
                      className="border border-border h-11 px-4 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary"
                    >
                      <Pencil className="size-3" /> FULL EDIT
                    </Link>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
