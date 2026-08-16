import type { PaymentStatus, SaleRecord } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Resolve effective payment status (auto yellow → red after overdueDays) */
export function effectivePaymentStatus(
  sale: SaleRecord,
  now = Date.now(),
  overdueDays = 1,
): PaymentStatus {
  if (sale.paymentStatus === "paid") return "paid";
  if (sale.paymentStatus === "ledger" || sale.ledgerActive) return "ledger";
  if (sale.amountPaid >= sale.totalRevenue - 0.01) return "paid";

  // Partial payments stay pending (yellow) or ledger
  if (sale.amountPaid > 0 && sale.paymentStatus !== "overdue") {
    return "pending";
  }

  if (sale.paymentStatus === "overdue") return "overdue";

  // Auto: pending with no payment and older than 24h → overdue (red)
  const ref = sale.paymentUpdatedAt || sale.createdAt;
  const age = now - new Date(ref).getTime();
  if (sale.amountPaid <= 0 && age > overdueDays * DAY_MS) return "overdue";

  return sale.paymentStatus || "pending";
}

export function paymentTone(
  status: PaymentStatus,
): "green" | "yellow" | "red" | "ledger" {
  if (status === "paid") return "green";
  if (status === "pending") return "yellow";
  if (status === "ledger") return "ledger";
  return "red";
}

export function remainingAmount(sale: SaleRecord): number {
  return Math.max(0, Math.round((sale.totalRevenue - sale.amountPaid) * 100) / 100);
}

export function paidProgress(sale: SaleRecord): number {
  if (sale.totalRevenue <= 0) return 0;
  return Math.min(100, Math.round((sale.amountPaid / sale.totalRevenue) * 100));
}
