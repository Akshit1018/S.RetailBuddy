import type {
  CreditNote,
  DayClose,
  GstScheme,
  Invoice,
  MonthClose,
  SaleRecord,
  SalarySlip,
  ShopCard,
} from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { monthLabel } from "@/lib/salary";
import {
  buildB2bCsv,
  buildB2csCsv,
  buildHsnCsv,
  salesToGstrLines,
} from "@/lib/gstr1-export";

export type CaPack = {
  month: string;
  scheme: GstScheme;
  salesCount: number;
  salesTotal: number;
  salesPaid: number;
  salesCredit: number;
  purchaseCount: number;
  purchaseTotal: number;
  gstOut: number;
  gstIn: number;
  gstNet: number;
  cash: number;
  upi: number;
  credit: number;
  returns: number;
  salaries: number;
  salaryPf: number;
  dayCloses: number;
  daysOpen: number;
};

export function inMonth(iso: string, month: string): boolean {
  return iso.slice(0, 7) === month;
}

export function buildCaPack(opts: {
  month: string;
  scheme: GstScheme;
  sales: SaleRecord[];
  invoices: Invoice[];
  returns: CreditNote[];
  dayCloses: DayClose[];
  slips: SalarySlip[];
}): CaPack {
  const sales = opts.sales.filter((s) => inMonth(s.createdAt, opts.month));
  const purchases = opts.invoices.filter(
    (i) => i.kind === "stock_in" && inMonth(i.billDate || i.createdAt, opts.month),
  );
  const returns = opts.returns.filter((r) => inMonth(r.createdAt, opts.month));
  const closes = opts.dayCloses.filter((d) => d.date.startsWith(opts.month));
  const slips = opts.slips.filter((s) => s.month === opts.month);

  const salesTotal = sales.reduce((a, s) => a + s.totalRevenue, 0);
  const salesPaid = sales.reduce((a, s) => a + s.amountPaid, 0);
  const gstOut = sales.reduce((a, s) => a + (s.gstTotal ?? 0), 0);
  const gstIn = purchases.reduce((a, i) => a + (i.gstTotal ?? 0), 0);
  const cash = closes.reduce((a, d) => a + d.cash, 0);
  const upi = closes.reduce((a, d) => a + d.upi, 0);

  return {
    month: opts.month,
    scheme: opts.scheme,
    salesCount: sales.length,
    salesTotal,
    salesPaid,
    salesCredit: Math.max(0, salesTotal - salesPaid),
    purchaseCount: purchases.length,
    purchaseTotal: purchases.reduce((a, i) => a + i.totalCost, 0),
    gstOut,
    gstIn,
    gstNet: Math.max(0, gstOut - gstIn),
    cash,
    upi,
    credit: closes.reduce((a, d) => a + d.credit, 0),
    returns: returns.reduce((a, r) => a + r.total, 0),
    salaries: slips.reduce((a, s) => a + s.netPay, 0),
    salaryPf: slips.reduce((a, s) => a + s.pfEmployee + s.pfEmployer, 0),
    dayCloses: closes.length,
    daysOpen: new Set(sales.map((s) => s.createdAt.slice(0, 10))).size,
  };
}

export function schemeLabel(scheme: GstScheme): string {
  if (scheme === "composition") return "Composition (1% / 5% — no tax on bill)";
  if (scheme === "unregistered") return "Not registered for GST";
  return "Regular GST (tax invoice + GSTR-1)";
}

export function packWhatsApp(shop: ShopCard, pack: CaPack): string {
  const gstLine =
    pack.scheme === "regular"
      ? `GST out ${formatINR(pack.gstOut)} − in ${formatINR(pack.gstIn)} = net ${formatINR(pack.gstNet)}`
      : pack.scheme === "composition"
        ? `Composition — no output GST on bills. Turnover ${formatINR(pack.salesTotal)}`
        : `Unregistered — no GST. Sales ${formatINR(pack.salesTotal)}`;
  return [
    `*${shop.name}* — CA pack ${monthLabel(pack.month)}`,
    `GSTIN: ${shop.gstin || "—"}`,
    `Scheme: ${schemeLabel(pack.scheme)}`,
    ``,
    `Sales: ${pack.salesCount} bills · ${formatINR(pack.salesTotal)}`,
    `  Paid ${formatINR(pack.salesPaid)} · Udhaar ${formatINR(pack.salesCredit)}`,
    `Purchase: ${pack.purchaseCount} · ${formatINR(pack.purchaseTotal)}`,
    `Returns: ${formatINR(pack.returns)}`,
    gstLine,
    `Day close: cash ${formatINR(pack.cash)} · UPI ${formatINR(pack.upi)} (${pack.dayCloses} days)`,
    `Salary: ${formatINR(pack.salaries)} · PF ${formatINR(pack.salaryPf)}`,
    ``,
    `Full pack is a PIN-locked file from StockScan. Ask the shop for the 4-digit PIN.`,
  ].join("\n");
}

export function downloadText(name: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportGstrZipLike(
  month: string,
  sales: SaleRecord[],
  stateCode: string,
) {
  const monthSales = sales.filter((s) => inMonth(s.createdAt, month));
  const lines = salesToGstrLines(monthSales, stateCode);
  downloadText(`gstr1-b2b-${month}.csv`, buildB2bCsv(lines), "text/csv");
  downloadText(`gstr1-b2cs-${month}.csv`, buildB2csCsv(lines), "text/csv");
  downloadText(`gstr1-hsn-${month}.csv`, buildHsnCsv(lines), "text/csv");
}

/** Self-contained HTML the CA opens; numbers stay hidden until PIN. */
export function buildLockedHtml(opts: {
  shop: ShopCard;
  pack: CaPack;
  pin: string;
  closes: DayClose[];
  slips: SalarySlip[];
}): string {
  const { shop, pack, pin, closes, slips } = opts;
  const rows = [
    ["Sales bills", String(pack.salesCount), formatINR(pack.salesTotal)],
    ["Money received", "", formatINR(pack.salesPaid)],
    ["Udhaar still open", "", formatINR(pack.salesCredit)],
    ["Purchases", String(pack.purchaseCount), formatINR(pack.purchaseTotal)],
    ["Returns", "", formatINR(pack.returns)],
    ["GST collected", "", formatINR(pack.gstOut)],
    ["GST on purchase", "", formatINR(pack.gstIn)],
    ["GST payable (est.)", "", formatINR(pack.gstNet)],
    ["Cash (day close)", "", formatINR(pack.cash)],
    ["UPI (day close)", "", formatINR(pack.upi)],
    ["Salary paid", "", formatINR(pack.salaries)],
    ["PF (both sides)", "", formatINR(pack.salaryPf)],
  ]
    .map(
      ([a, b, c]) =>
        `<tr><td>${a}</td><td>${b}</td><td style="text-align:right">${c}</td></tr>`,
    )
    .join("");
  const dayRows = closes
    .filter((d) => d.date.startsWith(pack.month))
    .map(
      (d) =>
        `<tr><td>${d.date}</td><td>${formatINR(d.cash)}</td><td>${formatINR(d.upi)}</td><td>${formatINR(d.credit)}</td></tr>`,
    )
    .join("");
  const salRows = slips
    .filter((s) => s.month === pack.month)
    .map(
      (s) =>
        `<tr><td>${s.staffName}</td><td>${s.pfType}</td><td>${s.channel}</td><td style="text-align:right">${formatINR(s.netPay)}</td></tr>`,
    )
    .join("");

  const body = `
    <h1>${escapeHtml(shop.name)}</h1>
    <p>CA monthly pack · ${escapeHtml(monthLabel(pack.month))}<br/>
    GSTIN ${escapeHtml(shop.gstin || "—")} · ${escapeHtml(schemeLabel(pack.scheme))}<br/>
    ${escapeHtml(shop.address)} ${escapeHtml(shop.city)}</p>
    <h2>Summary</h2>
    <table><thead><tr><th>Head</th><th></th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Day close</h2>
    <table><thead><tr><th>Date</th><th>Cash</th><th>UPI</th><th>Credit</th></tr></thead><tbody>${dayRows || "<tr><td colspan=4>No day closed</td></tr>"}</tbody></table>
    <h2>Salaries</h2>
    <table><thead><tr><th>Staff</th><th>PF</th><th>Mode</th><th>Net</th></tr></thead><tbody>${salRows || "<tr><td colspan=4>No slip this month</td></tr>"}</tbody></table>
    <p style="font-size:12px;color:#555">Prepared in StockScan. Print this page to PDF (Ctrl/Cmd+P). Not a filed GST return — give to your CA.</p>
  `;

  const token = btoa(unescape(encodeURIComponent(pin.trim() || "0000")));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(shop.name)} CA ${pack.month}</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left;font-size:14px}
  h1{font-size:22px;margin:0 0 8px}
  #gate{max-width:320px;margin:20vh auto;text-align:center}
  input{font-size:20px;letter-spacing:.3em;padding:10px;width:160px;text-align:center}
  button{margin-top:12px;padding:10px 20px;font-size:16px}
  .err{color:#b91c1c;font-size:13px}
</style></head>
<body>
<div id="gate">
  <h1>CA pack locked</h1>
  <p>Enter the 4-digit PIN the shop sent you.</p>
  <input id="pin" type="password" inputmode="numeric" maxlength="8" />
  <div><button id="go">Open pack</button></div>
  <p class="err" id="err"></p>
</div>
<div id="pack" hidden>${body}</div>
<script>
var ok = ${JSON.stringify(token)};
document.getElementById("go").onclick = function(){
  var v = document.getElementById("pin").value.trim();
  try {
    if (btoa(unescape(encodeURIComponent(v))) === ok) {
      document.getElementById("gate").hidden = true;
      document.getElementById("pack").hidden = false;
    } else {
      document.getElementById("err").textContent = "Wrong PIN";
    }
  } catch(e) { document.getElementById("err").textContent = "Wrong PIN"; }
};
</script>
</body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

export function downloadLockedPack(opts: {
  shop: ShopCard;
  pack: CaPack;
  pin: string;
  closes: DayClose[];
  slips: SalarySlip[];
}) {
  downloadText(
    `CA-${opts.shop.name.replace(/\s+/g, "-")}-${opts.pack.month}.html`,
    buildLockedHtml(opts),
    "text/html",
  );
}

export function monthCloseFromPack(
  pack: CaPack,
  actorName: string,
  pin: string | null,
): MonthClose {
  return {
    id: `mclose_${pack.month}`,
    month: pack.month,
    scheme: pack.scheme,
    salesTotal: pack.salesTotal,
    purchaseTotal: pack.purchaseTotal,
    gstOut: pack.gstOut,
    gstIn: pack.gstIn,
    cash: pack.cash,
    upi: pack.upi,
    credit: pack.credit,
    salaries: pack.salaries,
    note: null,
    closedAt: new Date().toISOString(),
    closedByName: actorName,
    pin,
  };
}
