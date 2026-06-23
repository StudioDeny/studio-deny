import type { Order } from "./orders";

export const TIERS = [
  { name: "ROOKIE", min: 0 },
  { name: "RUNNER", min: 1000 },
  { name: "RIOT", min: 3000 },
  { name: "LEGEND", min: 8000 },
] as const;

export type Tier = (typeof TIERS)[number];

/**
 * A customer qualifies for the loyalty pool only if they have placed
 * at least ONE single order worth >= entryThreshold (default ₹5,000).
 * Cumulative smaller orders do NOT count toward qualification.
 */
export const isLoyaltyMember = (orders: Order[], entryThreshold = 5000): boolean =>
  orders.some(
    (o) =>
      o.status !== "CANCELLED" &&
      o.status !== "REFUNDED" &&
      o.total >= entryThreshold
  );

/**
 * Points earned ONLY after the user qualifies.
 * Formula: floor(total_spent / rupeesPerEarnedPoint)
 * Default: ₹50 = 1 point.
 */
export const pointsFromOrders = (
  orders: Order[],
  rupeesPerEarnedPoint = 50,
  entryThreshold = 5000
): number => {
  if (!isLoyaltyMember(orders, entryThreshold)) return 0;
  return Math.floor(
    orders
      .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
      .reduce((sum, o) => sum + o.total / rupeesPerEarnedPoint, 0)
  );
};

/** Qualifying order value toward entry (largest valid single order). */
export const qualifyingOrderValue = (orders: Order[]): number =>
  Math.max(
    0,
    ...orders
      .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
      .map((o) => o.total)
  );

export const tierFor = (pts: number): Tier =>
  [...TIERS].reverse().find((t) => pts >= t.min) ?? TIERS[0];
