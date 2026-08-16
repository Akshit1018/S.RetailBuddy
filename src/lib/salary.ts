import type { PayChannel, PfType, Profile, SalarySlip } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export const DEFAULT_PF_RATE = 12;

export function calcSlip(opts: {
  staff: Profile;
  month: string;
  basic?: number;
  pfType?: PfType;
  channel?: PayChannel;
  pfRate?: number;
}): Omit<SalarySlip, "id" | "createdAt"> {
  const basic = Math.max(0, opts.basic ?? opts.staff.salary ?? 0);
  const pfType = opts.pfType ?? opts.staff.pfType ?? "non_pf";
  const channel = opts.channel ?? opts.staff.payMode ?? "cash";
  const rate = (opts.pfRate ?? DEFAULT_PF_RATE) / 100;
  const pfEmployee = pfType === "pf" ? Math.round(basic * rate) : 0;
  const pfEmployer = pfType === "pf" ? Math.round(basic * rate) : 0;
  return {
    staffId: opts.staff.id,
    staffName: opts.staff.name,
    month: opts.month,
    basic,
    pfEmployee,
    pfEmployer,
    netPay: Math.max(0, basic - pfEmployee),
    channel,
    pfType,
    paidAt: null,
  };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function slipWhatsApp(shopName: string, slip: SalarySlip): string {
  return [
    `*${shopName}* — Salary slip`,
    `${slip.staffName} · ${monthLabel(slip.month)}`,
    ``,
    `Basic: ${formatINR(slip.basic)}`,
    slip.pfType === "pf"
      ? `PF (you): −${formatINR(slip.pfEmployee)}`
      : `PF: No (non-PF)`,
    slip.pfType === "pf" ? `PF (shop): ${formatINR(slip.pfEmployer)}` : "",
    `*Net pay: ${formatINR(slip.netPay)}*`,
    `Mode: ${slip.channel === "upi" ? "UPI" : "Cash"}`,
    slip.paidAt ? `Paid: yes` : `Status: not paid yet`,
    ``,
    `Keep this message as your slip.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function currentMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
