export type GstrSaleLine = {
  billNo: string;
  billDate: string;
  customerName?: string | null;
  customerGstin?: string | null;
  placeOfSupply?: string | null;
  isInterstate?: boolean;
  hsn?: string | null;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoiceValue: number;
};

function csvEscape(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cols: Array<string | number | null | undefined>) {
  return cols.map(csvEscape).join(",");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatIdt(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function buildB2bCsv(lines: GstrSaleLine[]) {
  const header = row([
    "GSTIN/UIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Invoice Type",
    "Rate",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
    "HSN",
  ]);
  const body = lines
    .filter((l) => l.customerGstin && l.customerGstin.length >= 15)
    .map((l) =>
      row([
        l.customerGstin,
        l.customerName,
        l.billNo,
        formatIdt(l.billDate),
        round2(l.invoiceValue),
        l.placeOfSupply || "",
        "N",
        "Regular",
        l.gstRate,
        round2(l.taxableValue),
        round2(l.cgst),
        round2(l.sgst),
        round2(l.igst),
        l.hsn || "",
      ]),
    );
  return [header, ...body].join("\n");
}

export function buildB2csCsv(lines: GstrSaleLine[]) {
  const header = row([
    "Type",
    "Place Of Supply",
    "Rate",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
  ]);
  const map = new Map<
    string,
    { pos: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }
  >();
  for (const l of lines) {
    if (l.customerGstin && l.customerGstin.length >= 15) continue;
    const pos = l.placeOfSupply || "97";
    const key = `${l.isInterstate ? "INTER" : "INTRA"}|${pos}|${l.gstRate}`;
    const cur = map.get(key) || {
      pos,
      rate: l.gstRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    cur.taxable += l.taxableValue;
    cur.cgst += l.cgst;
    cur.sgst += l.sgst;
    cur.igst += l.igst;
    map.set(key, cur);
  }
  const body = [...map.entries()].map(([k, v]) =>
    row([
      k.startsWith("INTER") ? "Inter State" : "Intra State",
      v.pos,
      v.rate,
      round2(v.taxable),
      round2(v.cgst),
      round2(v.sgst),
      round2(v.igst),
    ]),
  );
  return [header, ...body].join("\n");
}

export function buildHsnCsv(lines: GstrSaleLine[]) {
  const header = row([
    "HSN",
    "UQC",
    "Total Taxable Value",
    "Rate",
    "CGST",
    "SGST",
    "IGST",
  ]);
  const map = new Map<
    string,
    { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }
  >();
  for (const l of lines) {
    const hsn = (l.hsn || "0000").slice(0, 8);
    const key = `${hsn}|${l.gstRate}`;
    const cur = map.get(key) || {
      hsn,
      rate: l.gstRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    cur.taxable += l.taxableValue;
    cur.cgst += l.cgst;
    cur.sgst += l.sgst;
    cur.igst += l.igst;
    map.set(key, cur);
  }
  const body = [...map.values()].map((v) =>
    row([
      v.hsn,
      "NOS",
      round2(v.taxable),
      v.rate,
      round2(v.cgst),
      round2(v.sgst),
      round2(v.igst),
    ]),
  );
  return [header, ...body].join("\n");
}

export function salesToGstrLines(
  sales: Array<{
    billNo: string;
    createdAt: string;
    customerSnapshot?: {
      name?: string | null;
      gstin?: string | null;
      stateCode?: string | null;
    } | null;
    lines: Array<{
      quantity: number;
      unitPrice: number;
      hsn?: string | null;
      gstRate?: number | null;
    }>;
  }>,
  shopStateCode = "08",
): GstrSaleLine[] {
  const out: GstrSaleLine[] = [];
  for (const s of sales) {
    const billDate = s.createdAt.slice(0, 10);
    const custState = s.customerSnapshot?.stateCode || shopStateCode;
    const isInterstate = custState !== shopStateCode;
    for (const line of s.lines) {
      const rate = line.gstRate ?? 5;
      const gross = line.quantity * line.unitPrice;
      const taxable = rate > 0 ? gross / (1 + rate / 100) : gross;
      const tax = gross - taxable;
      out.push({
        billNo: s.billNo,
        billDate,
        customerName: s.customerSnapshot?.name,
        customerGstin: s.customerSnapshot?.gstin,
        placeOfSupply: custState,
        isInterstate,
        hsn: line.hsn,
        taxableValue: taxable,
        gstRate: rate,
        cgst: isInterstate ? 0 : tax / 2,
        sgst: isInterstate ? 0 : tax / 2,
        igst: isInterstate ? tax : 0,
        invoiceValue: gross,
      });
    }
  }
  return out;
}

export function downloadText(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
