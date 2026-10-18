// Colour cards with per-size stock. Tapping a size chip selects it and
// asks for its stock right underneath, in the same column. Used by the
// product form and the products-list stock panel.
import { useEffect, useRef, useState } from "react";
import { Copy, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { emptyCard, ONE_SIZE, type ColourCard } from "@/lib/stockEditor";
import { thumbImage } from "@/lib/image";

export function StockEditor({
  cards,
  onChange,
  sizeLabels,
  productPrice,
  productCompareAt,
}: {
  cards: ColourCard[];
  onChange: (cards: ColourCard[]) => void;
  sizeLabels: string[]; // category sizes in display order; [] = ONE SIZE
  productPrice: number;
  productCompareAt?: number;
}) {
  const baseSizes = sizeLabels.length > 0 ? sizeLabels : [ONE_SIZE];
  const total = cards.reduce(
    (sum, c) => sum + Object.values(c.sizes).reduce((s, q) => s + (/^\d+$/.test(q.trim()) ? Number(q) : 0), 0),
    0,
  );

  const update = (key: string, patch: Partial<ColourCard>) =>
    onChange(cards.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const copyToOthers = (src: ColourCard) => {
    onChange(
      cards.map((c) =>
        c.key === src.key ? c : { ...c, sizes: { ...src.sizes }, price: src.price, compareAt: src.compareAt },
      ),
    );
    toast.success(`Copied sizes, stock and price from ${src.name.trim() || "this colour"} to ${cards.length - 1} other colour(s). Edit any of them before saving.`);
  };

  return (
    <div className="space-y-3">
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:14px}`}</style>
      <div className="flex items-center justify-between">
        <p className="text-mono text-[10px] tracking-widest text-muted-foreground">
          TAP A SIZE, THEN ENTER HOW MANY PIECES YOU HAVE. 0 = SOLD OUT.
        </p>
        <span className="text-mono text-[11px] tracking-widest">TOTAL: <b>{total}</b></span>
      </div>

      {cards.map((card) => {
        const extra = Object.keys(card.sizes).filter((s) => !baseSizes.includes(s));
        const sizes = [...baseSizes, ...extra];
        const selectedCount = Object.keys(card.sizes).length;
        return (
          <div key={card.key} className="border border-border bg-surface p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ColorPicker value={card.hex} onChange={(hex) => update(card.key, { hex })} compact />
              <input
                value={card.name}
                onChange={(e) => update(card.key, { name: e.target.value })}
                placeholder={cards.length === 1 ? "Colour name (blank = White)" : "Colour name, e.g. Black"}
                className="inp flex-1"
              />
              {cards.length > 1 && (
                <button
                  type="button"
                  title="Remove this colour"
                  onClick={() => {
                    if (selectedCount > 0 && !confirm(`Remove ${card.name.trim() || "this colour"} and its stock?`)) return;
                    onChange(cards.filter((c) => c.key !== card.key));
                  }}
                  className="h-10 w-10 shrink-0 border border-border flex items-center justify-center hover:border-red-500 hover:text-red-500"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const selected = size in card.sizes;
                const qty = card.sizes[size] ?? "";
                const n = /^\d+$/.test(qty.trim()) ? Number(qty) : null;
                const notInCategory = extra.includes(size);
                return (
                  <div key={size} className="flex flex-col items-stretch w-16">
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...card.sizes };
                        if (selected) delete next[size];
                        else next[size] = "";
                        update(card.key, { sizes: next });
                      }}
                      title={notInCategory ? "This size is not in the category's size list any more" : undefined}
                      className={`h-9 border text-sm font-semibold transition-colors ${
                        selected ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary hover:text-primary"
                      } ${notInCategory ? "border-dashed" : ""}`}
                    >
                      {size}
                    </button>
                    {selected ? (
                      <>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          autoFocus={qty === ""}
                          value={qty}
                          onChange={(e) => update(card.key, { sizes: { ...card.sizes, [size]: e.target.value } })}
                          placeholder="Qty"
                          className={`mt-1 h-9 w-full border bg-background px-1 text-center text-mono text-sm ${
                            qty.trim() === "" ? "border-amber-500" : "border-border"
                          }`}
                        />
                        <span
                          className={`text-mono text-[9px] text-center mt-0.5 ${
                            n === 0 ? "text-red-500" : n !== null && n <= 5 ? "text-amber-600" : "text-muted-foreground"
                          }`}
                        >
                          {qty.trim() === "" ? "ENTER QTY" : n === 0 ? "SOLD OUT" : n !== null && n <= 5 ? "LOW" : "IN STOCK"}
                        </span>
                      </>
                    ) : (
                      <span className="text-mono text-[9px] text-center text-muted-foreground mt-1">NOT MADE</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = { ...card.sizes };
                  baseSizes.forEach((s) => { if (!(s in next)) next[s] = ""; });
                  update(card.key, { sizes: next });
                }}
                className="text-mono text-[10px] tracking-widest text-primary hover:underline"
              >
                SELECT ALL SIZES
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => update(card.key, { sizes: {} })}
                  className="text-mono text-[10px] tracking-widest text-muted-foreground hover:text-red-500"
                >
                  CLEAR
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">PRICE ₹ (blank = ₹{productPrice})</div>
                <input
                  type="number"
                  min={0}
                  value={card.price}
                  onChange={(e) => update(card.key, { price: e.target.value })}
                  placeholder={String(productPrice)}
                  className="inp"
                />
              </label>
              <label className="block">
                <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">
                  COMPARE AT ₹ (blank = {productCompareAt ? `₹${productCompareAt}` : "none"})
                </div>
                <input
                  type="number"
                  min={0}
                  value={card.compareAt}
                  onChange={(e) => update(card.key, { compareAt: e.target.value })}
                  placeholder={productCompareAt ? String(productCompareAt) : ""}
                  className="inp"
                />
              </label>
            </div>

            <ColourPhotos
              colourName={card.name.trim()}
              images={card.images}
              onChange={(images) => update(card.key, { images })}
            />

            {cards.length > 1 && (
              <label className="flex items-center gap-2 cursor-pointer text-mono text-[10px] tracking-widest text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => copyToOthers(card)}
                  className="w-4 h-4"
                />
                <Copy className="size-3" /> COPY THESE SIZES, STOCK &amp; PRICE TO ALL OTHER COLOURS
              </label>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...cards, emptyCard("", "#000000")])}
        className="flex items-center gap-2 border border-dashed border-border h-10 px-4 text-mono text-[11px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="size-3.5" /> ADD COLOUR VARIANT
      </button>
    </div>
  );
}

// Colour wheel + hex box, kept in sync. The native picker only accepts
// #rrggbb, so the text box is what holds partial/typed values until they
// become a valid hex.
export function ColorPicker({ value, onChange, compact }: { value: string; onChange: (hex: string) => void; compact?: boolean }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer border border-border bg-background p-0.5 shrink-0"
      />
      {!compact && (
        <input
          value={text}
          onChange={(e) => {
            const t = e.target.value.trim();
            setText(t);
            const hex = t.startsWith("#") ? t : "#" + t;
            if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toLowerCase());
            else if (t === "") onChange("");
          }}
          className="inp w-28"
          placeholder="#1e40ff"
        />
      )}
    </div>
  );
}

const MAX_COLOUR_PHOTOS = 8;

// Optional photos for one colour. Shown on the product page when a shopper
// picks this colour; a colour without photos shows the main product photos.
function ColourPhotos({ colourName, images, onChange }: {
  colourName: string;
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, MAX_COLOUR_PHOTOS - images.length)) {
        urls.push((await uploadToCloudinary(f)).secure_url);
      }
      onChange([...images, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">
        PHOTOS FOR {colourName ? colourName.toUpperCase() : "THIS COLOUR"} (OPTIONAL)
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="relative w-16 h-20 border border-border bg-background">
            <img src={thumbImage(url, 240)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -top-2 -right-2 size-5 bg-foreground text-background flex items-center justify-center hover:bg-red-500"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {images.length < MAX_COLOUR_PHOTOS && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-16 h-20 border border-dashed border-border flex flex-col items-center justify-center gap-1 text-mono text-[9px] tracking-widest text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <><ImagePlus className="size-4" /> ADD</>}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Shown when a shopper picks this colour (first photo first). Leave empty to show the main product photos.
      </p>
    </div>
  );
}
