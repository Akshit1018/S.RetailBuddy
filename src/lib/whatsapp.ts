import type { SaleRecord } from "@/lib/types";
import { formatINR } from "@/lib/utils";

/** Build wa.me link with prefilled payment / bill message */
export function buildWhatsAppBillLink(opts: {
  phone: string;
  sale: SaleRecord;
  shopName?: string | null;
  hasQr?: boolean;
  upiLink?: string;
}): string {
  const digits = opts.phone.replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const items = opts.sale.lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.productName} x${l.quantity} = ${formatINR(l.quantity * l.unitPrice)}`,
    )
    .join("\n");
  const remaining = Math.max(0, opts.sale.totalRevenue - opts.sale.amountPaid);
  const shop = opts.shopName || "StockScan";
  const text = [
    `*${shop}* — Bill ${opts.sale.billNo}`,
    ``,
    items,
    ``,
    `*Total: ${formatINR(opts.sale.totalRevenue)}*`,
    opts.sale.amountPaid > 0
      ? `Paid: ${formatINR(opts.sale.amountPaid)} | Due: ${formatINR(remaining)}`
      : `Amount to pay: ${formatINR(remaining || opts.sale.totalRevenue)}`,
    opts.hasQr
      ? `\nPay UPI / scan shop QR.`
      : opts.upiLink
        ? `\nPay UPI: ${opts.upiLink}`
        : `\nPlease confirm payment with the shop.`,
    ``,
    `Thank you!`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildPartyStatement(opts: {
  shopName: string;
  customerName: string;
  sales: SaleRecord[];
  upiId?: string | null;
}) {
  const mine = opts.sales.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const open = mine.reduce(
    (s, x) => s + Math.max(0, x.totalRevenue - x.amountPaid),
    0,
  );
  const lines = [
    `*${opts.shopName}* — Account statement`,
    `Customer: ${opts.customerName}`,
    ``,
  ];
  for (const s of mine.slice(-12)) {
    const due = Math.max(0, s.totalRevenue - s.amountPaid);
    lines.push(
      `${s.createdAt.slice(0, 10)} ${s.billNo}: ${formatINR(s.totalRevenue)}` +
        (due > 0 ? ` (due ${formatINR(due)})` : " (paid)"),
    );
  }
  lines.push(``);
  lines.push(`*Open balance: ${formatINR(open)}*`);
  if (opts.upiId) {
    lines.push(`Pay UPI: ${opts.upiId}`);
  }
  lines.push(`Thank you`);
  return lines.join("\n");
}
