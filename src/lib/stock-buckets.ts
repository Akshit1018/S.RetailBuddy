import type { Product, ShopSettings, StockBucket } from "@/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "@/lib/types";

export type BucketOpts = Pick<ShopSettings, "nearExpiryDays" | "defaultReorderLevel">;

function optsOf(o?: Partial<BucketOpts>): BucketOpts {
  return {
    nearExpiryDays: o?.nearExpiryDays ?? DEFAULT_SHOP_SETTINGS.nearExpiryDays,
    defaultReorderLevel:
      o?.defaultReorderLevel ?? DEFAULT_SHOP_SETTINGS.defaultReorderLevel,
  };
}

export function daysUntilExpiry(expiryDate?: string | null): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

export function isExpired(p: Product): boolean {
  const d = daysUntilExpiry(p.expiryDate);
  return d !== null && d < 0;
}

export function isNearExpiry(p: Product, settings?: Partial<BucketOpts>): boolean {
  const d = daysUntilExpiry(p.expiryDate);
  const days = optsOf(settings).nearExpiryDays;
  return d !== null && d >= 0 && d <= days;
}

export function isLowStock(p: Product, settings?: Partial<BucketOpts>): boolean {
  const fallback = optsOf(settings).defaultReorderLevel;
  const level = p.reorderLevel ?? fallback;
  return p.quantity > 0 && p.quantity <= level;
}

/** Primary bucket for a product (priority: expired > near expiry > reorder > current) */
export function primaryBucket(p: Product, settings?: Partial<BucketOpts>): StockBucket {
  if (isExpired(p)) return "expired";
  if (isNearExpiry(p, settings)) return "near_expiry";
  if (isLowStock(p, settings) || p.quantity === 0) return "reorder";
  return "current";
}

export function filterByBucket(
  products: Product[],
  bucket: StockBucket,
  settings?: Partial<BucketOpts>,
): Product[] {
  switch (bucket) {
    case "expired":
      return products.filter(isExpired);
    case "near_expiry":
      return products.filter((p) => isNearExpiry(p, settings) && !isExpired(p));
    case "reorder":
      return products.filter(
        (p) => (isLowStock(p, settings) || p.quantity === 0) && !isExpired(p),
      );
    case "current":
    default:
      return products.filter((p) => p.quantity > 0);
  }
}

export function bucketCounts(products: Product[], settings?: Partial<BucketOpts>) {
  return {
    current: filterByBucket(products, "current", settings).length,
    reorder: filterByBucket(products, "reorder", settings).length,
    near_expiry: filterByBucket(products, "near_expiry", settings).length,
    expired: filterByBucket(products, "expired", settings).length,
  };
}

export const BUCKET_META: Record<
  StockBucket,
  { label: string; short: string; hint: string; tone: "white" | "green" | "yellow" | "red" }
> = {
  current: {
    label: "Current stock",
    short: "Stock",
    hint: "All on-hand inventory",
    tone: "white",
  },
  reorder: {
    label: "Need to buy",
    short: "Buy",
    hint: "Low or zero stock — reorder",
    tone: "green",
  },
  near_expiry: {
    label: "Near expiry",
    short: "Expiry",
    hint: "Sell soon · consider discount",
    tone: "yellow",
  },
  expired: {
    label: "Expired",
    short: "Expired",
    hint: "Past expiry date",
    tone: "red",
  },
};
