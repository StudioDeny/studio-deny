// A "single item" (no colours or sizes - e.g. a tote or a gift card) is
// stored as one ONE SIZE stock row with no colour, so it moves through
// billing, online orders and returns exactly like any other variant.
// Rows left over from before switching to single item are kept only at 0
// stock (because they were already sold), so they never count as options.
export const ONE_SIZE = "ONE SIZE";

type StockRow = { size: string | null; color: string | null; stock: number };

export function singleItemVariant<T extends StockRow>(rows: T[]): T | null {
  const single = rows.find((r) => r.size === ONE_SIZE && !(r.color ?? "").trim());
  if (!single) return null;
  const others = rows.filter((r) => r !== single);
  if (others.some((r) => r.stock > 0)) return null;
  // Sold out with leftovers around: can't tell which mode was meant, so
  // fall back to showing the options.
  if (single.stock === 0 && others.length > 0) return null;
  return single;
}
