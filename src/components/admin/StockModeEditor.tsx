// Stock section with a "Single item" switch: either one quantity box (no
// colours or sizes) or the colour-card editor. Used by the product form and
// the products-list stock panel.
import { StockEditor } from "@/components/admin/StockEditor";
import { cardsStockSummary, DEFAULT_COLOUR, emptyCard, type ColourCard } from "@/lib/stockEditor";

export function StockModeEditor({
  single,
  onSingleChange,
  singleQty,
  onSingleQtyChange,
  cards,
  onCardsChange,
  sizeLabels,
  productPrice,
  productCompareAt,
}: {
  single: boolean;
  onSingleChange: (single: boolean) => void;
  singleQty: string;
  onSingleQtyChange: (qty: string) => void;
  cards: ColourCard[];
  onCardsChange: (cards: ColourCard[]) => void;
  sizeLabels: string[];
  productPrice: number;
  productCompareAt?: number;
}) {
  const toggle = () => {
    if (!single) {
      const { options, pieces } = cardsStockSummary(cards);
      if (options > 0 && !confirm(
        `Make this a single item (no colours or sizes)?\n\n` +
        `The stock for ${options} colour/size option(s) (${pieces} pcs) will be removed when you save. ` +
        `Options that were already sold are kept at 0 so old bills still work.`,
      )) return;
      onSingleChange(true);
      return;
    }
    const qty = /^\d+$/.test(singleQty.trim()) ? Number(singleQty) : 0;
    if (qty > 0 && !confirm(
      `Switch to colours & sizes?\n\nThe single-item stock (${qty} pcs) will be removed when you save — enter stock per colour and size instead.`,
    )) return;
    if (cards.length === 0) onCardsChange([emptyCard(DEFAULT_COLOUR.name, DEFAULT_COLOUR.hex)]);
    onSingleChange(false);
  };

  const n = /^\d+$/.test(singleQty.trim()) ? Number(singleQty) : null;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
        <button
          type="button"
          role="switch"
          aria-checked={single}
          onClick={toggle}
          className={`relative w-10 h-5 border border-foreground transition-colors ${single ? "bg-foreground" : "bg-background"}`}
        >
          <span className={`absolute top-[2px] w-3.5 h-3.5 transition-all ${single ? "left-[21px] bg-background" : "left-[2px] bg-foreground"}`} />
        </button>
        <span className="text-mono text-[11px] tracking-widest">SINGLE ITEM (NO COLOURS OR SIZES)</span>
      </label>

      {single ? (
        <div className="border border-border bg-surface p-3 space-y-2">
          <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}`}</style>
          <label className="block max-w-[200px]">
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">STOCK QUANTITY *</div>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              autoFocus={singleQty === ""}
              value={singleQty}
              onChange={(e) => onSingleQtyChange(e.target.value)}
              placeholder="e.g. 25"
              className={`inp ${singleQty.trim() === "" ? "!border-amber-500" : ""}`}
            />
          </label>
          <p className={`text-mono text-[10px] tracking-widest ${
            n === 0 ? "text-red-500" : n !== null && n <= 5 ? "text-amber-600" : "text-muted-foreground"
          }`}>
            {singleQty.trim() === "" ? "ENTER HOW MANY PIECES YOU HAVE" : n === 0 ? "SOLD OUT" : n !== null && n <= 5 ? "LOW STOCK" : "IN STOCK"}
            {" · "}SOLD AT THE PRODUCT PRICE · BILLED WITH ONE TAP, NO SIZE PICKER
          </p>
        </div>
      ) : (
        <StockEditor
          cards={cards}
          onChange={onCardsChange}
          sizeLabels={sizeLabels}
          productPrice={productPrice}
          productCompareAt={productCompareAt}
        />
      )}
    </div>
  );
}
