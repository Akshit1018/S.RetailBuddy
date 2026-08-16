import type { Installment, SaleRecord } from "@/lib/types";
import { remainingAmount } from "@/lib/payment";
import { formatINR } from "@/lib/utils";

const DAY = 24 * 60 * 60 * 1000;

export function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function addMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return ymd(d);
}

/** Split remaining amount into equal EMI rows. Last row takes the leftover paise. */
export function buildSchedule(opts: {
  remaining: number;
  count: number;
  firstDue: string;
  gapDays?: number;
  monthly?: boolean;
}): Installment[] {
  const count = Math.max(1, Math.min(24, Math.floor(opts.count) || 1));
  const total = Math.max(0, Math.round(opts.remaining * 100) / 100);
  const base = Math.floor((total / count) * 100) / 100;
  const rows: Installment[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i += 1) {
    const amount =
      i === count - 1 ? Math.round((total - allocated) * 100) / 100 : base;
    allocated += amount;
    const dueDate = opts.monthly
      ? addMonths(opts.firstDue, i)
      : addDays(opts.firstDue, i * (opts.gapDays ?? 7));
    rows.push({
      id: `emi_${i + 1}_${dueDate}`,
      dueDate,
      amount,
      paidAt: null,
      paidAmount: 0,
    });
  }
  return rows;
}

export function nextOpenInstallment(sale: SaleRecord): Installment | null {
  const list = sale.installments ?? [];
  return list.find((x) => x.paidAmount < x.amount - 0.01) ?? null;
}

export function installmentDueToday(
  sale: SaleRecord,
  today = ymd(),
): Installment | null {
  const list = sale.installments ?? [];
  return (
    list.find(
      (x) => x.dueDate <= today && x.paidAmount < x.amount - 0.01,
    ) ?? null
  );
}

export function applyPayToSchedule(
  list: Installment[],
  amount: number,
  at: string,
): Installment[] {
  let left = amount;
  return list.map((row) => {
    if (left <= 0) return row;
    const need = Math.max(0, row.amount - row.paidAmount);
    if (need <= 0) return row;
    const take = Math.min(need, left);
    left -= take;
    const paidAmount = row.paidAmount + take;
    return {
      ...row,
      paidAmount,
      paidAt: paidAmount >= row.amount - 0.01 ? at : row.paidAt,
    };
  });
}

export function dueCallList(
  sales: SaleRecord[],
  today = ymd(),
): Array<{
  sale: SaleRecord;
  due: number;
  dueDate: string;
  name: string;
  phone: string | null;
}> {
  const out: Array<{
    sale: SaleRecord;
    due: number;
    dueDate: string;
    name: string;
    phone: string | null;
  }> = [];
  for (const sale of sales) {
    const due = remainingAmount(sale);
    if (due <= 0.01) continue;
    const emi = installmentDueToday(sale, today);
    const dueDate = emi?.dueDate || sale.nextDueDate || sale.createdAt.slice(0, 10);
    if (dueDate > today && !emi) continue;
    const name =
      sale.customerSnapshot?.name || sale.soldByName || sale.billNo;
    const phone =
      sale.customerSnapshot?.whatsapp || sale.customerSnapshot?.phone || null;
    out.push({ sale, due: emi ? emi.amount - emi.paidAmount : due, dueDate, name, phone });
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function reminderText(opts: {
  shopName: string;
  customerName: string;
  billNo: string;
  amount: number;
  dueDate: string;
  upiLink?: string;
  payPage?: string;
}): string {
  return [
    `Namaste ${opts.customerName},`,
    `${opts.shopName} se yaad.`,
    `Bill ${opts.billNo} — aaj / due ${opts.dueDate}`,
    `Amount: ${formatINR(opts.amount)}`,
    opts.upiLink ? `Pay UPI: ${opts.upiLink}` : "",
    opts.payPage ? `Pay link: ${opts.payPage}` : "",
    `Dhanyavaad.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export { DAY };
