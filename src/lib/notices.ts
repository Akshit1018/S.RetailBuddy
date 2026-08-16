import type { Product, SaleRecord, SalarySlip, ShopSettings } from "@/lib/types";
import { dueCallList, ymd } from "@/lib/installments";
import { remainingAmount } from "@/lib/payment";
import { expiryAlerts } from "@/lib/pharmacy";
import { currentMonth } from "@/lib/salary";

export type NoticeKind = "due_call" | "expiry" | "salary" | "reorder";

export type AppNotice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  amount?: number;
  phone?: string | null;
  href?: string;
  at: string;
};

export function buildNotices(opts: {
  sales: SaleRecord[];
  products: Product[];
  slips: SalarySlip[];
  settings: ShopSettings;
  shopKind?: string;
}): AppNotice[] {
  const today = ymd();
  const out: AppNotice[] = [];

  for (const row of dueCallList(opts.sales, today)) {
    out.push({
      id: `due_${row.sale.id}_${row.dueDate}`,
      kind: "due_call",
      title: `Call ${row.name}`,
      body: `${row.sale.billNo} · due ${row.dueDate}`,
      amount: row.due,
      phone: row.phone,
      href: `/bills/${row.sale.id}`,
      at: row.dueDate,
    });
  }

  const exp = expiryAlerts(opts.products);
  if (exp.expired.length) {
    out.push({
      id: `exp_dead_${exp.expired.length}`,
      kind: "expiry",
      title: `${exp.expired.length} expired — do not sell`,
      body: exp.expired
        .slice(0, 3)
        .map((p) => p.name)
        .join(", "),
      href: "/stock",
      at: today,
    });
  }
  if (exp.band30.length) {
    out.push({
      id: `exp_30_${exp.band30.length}`,
      kind: "expiry",
      title: `${exp.band30.length} finish in 30 days`,
      body: exp.band30
        .slice(0, 3)
        .map((r) => `${r.product.name} (${r.days}d)`)
        .join(", "),
      href: "/stock",
      at: today,
    });
  } else if (exp.band60.length) {
    out.push({
      id: `exp_60_${exp.band60.length}`,
      kind: "expiry",
      title: `${exp.band60.length} finish in 60 days`,
      body: exp.band60
        .slice(0, 2)
        .map((r) => r.product.name)
        .join(", "),
      href: "/stock",
      at: today,
    });
  }

  const month = currentMonth();
  const unpaid = opts.slips.filter((s) => s.month === month && !s.paidAt);
  if (unpaid.length) {
    out.push({
      id: `sal_${month}_${unpaid.length}`,
      kind: "salary",
      title: `${unpaid.length} salary slip not paid`,
      body: unpaid.map((s) => s.staffName).join(", "),
      amount: unpaid.reduce((a, s) => a + s.netPay, 0),
      href: "/staff",
      at: today,
    });
  }

  const low = opts.products.filter(
    (p) => p.quantity > 0 && p.quantity <= (p.reorderLevel || opts.settings.defaultReorderLevel),
  );
  if (low.length >= 2) {
    out.push({
      id: `reo_${low.length}`,
      kind: "reorder",
      title: `${low.length} items need buying`,
      body: low
        .slice(0, 3)
        .map((p) => p.name)
        .join(", "),
      href: "/stock",
      at: today,
    });
  }

  void remainingAmount;
  return out;
}

export function unreadCount(notices: AppNotice[], readIds: string[]): number {
  const set = new Set(readIds);
  return notices.filter((n) => !set.has(n.id)).length;
}
