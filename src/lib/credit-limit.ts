export function openCreditForCustomer(
  customerId: string,
  sales: Array<{ customerId?: string | null; totalRevenue: number; amountPaid: number }>,
): number {
  return sales
    .filter((s) => s.customerId === customerId)
    .reduce((sum, s) => sum + Math.max(0, s.totalRevenue - s.amountPaid), 0);
}

export function creditCheck(opts: {
  customerId?: string | null;
  creditLimit?: number | null;
  cartTotal: number;
  sales: Array<{ customerId?: string | null; totalRevenue: number; amountPaid: number }>;
  enforce: boolean;
  defaultLimit: number;
}): { ok: boolean; open: number; limit: number; remaining: number; message?: string } {
  if (!opts.customerId) {
    return { ok: true, open: 0, limit: 0, remaining: Infinity };
  }
  const limit =
    opts.creditLimit != null && opts.creditLimit >= 0
      ? opts.creditLimit
      : opts.defaultLimit;
  const open = openCreditForCustomer(opts.customerId, opts.sales);
  const remaining = Math.max(0, limit - open);
  if (!opts.enforce) return { ok: true, open, limit, remaining };
  if (opts.cartTotal > remaining + 0.009) {
    return {
      ok: false,
      open,
      limit,
      remaining,
      message: `Credit limit ₹${Math.round(limit)}. Open ₹${Math.round(open)}. Room ₹${Math.round(remaining)}.`,
    };
  }
  return { ok: true, open, limit, remaining };
}
