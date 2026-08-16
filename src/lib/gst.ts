import type { LineItem, SaleLine } from "@/lib/types";

/** Default GST slab for kirana / FMCG when unknown */
export const DEFAULT_GST = 5;

export function gstSplit(amountIncl: number, rate = DEFAULT_GST) {
  const r = Math.max(0, rate);
  const taxable = r > 0 ? amountIncl / (1 + r / 100) : amountIncl;
  const gst = amountIncl - taxable;
  const half = gst / 2;
  return {
    taxable: round2(taxable),
    gst: round2(gst),
    cgst: round2(half),
    sgst: round2(gst - half),
    rate: r,
  };
}

export function gstOnExclusive(taxable: number, rate = DEFAULT_GST) {
  const gst = (taxable * rate) / 100;
  const half = gst / 2;
  return {
    taxable: round2(taxable),
    gst: round2(gst),
    cgst: round2(half),
    sgst: round2(gst - half),
    total: round2(taxable + gst),
    rate,
  };
}

export function summarizeGst(
  lines: Array<{ quantity: number; unitPrice: number; gstRate?: number }>,
) {
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  for (const l of lines) {
    const gross = l.quantity * l.unitPrice;
    const part = gstSplit(gross, l.gstRate ?? DEFAULT_GST);
    taxable += part.taxable;
    cgst += part.cgst;
    sgst += part.sgst;
  }
  return {
    taxable: round2(taxable),
    cgst: round2(cgst),
    sgst: round2(sgst),
    gstTotal: round2(cgst + sgst),
    grand: round2(taxable + cgst + sgst),
  };
}

export function guessHsn(name: string): string {
  const n = name.toLowerCase();
  if (/crocin|dolo|combiflam|paracetamol|tablet|capsule|syrup|ors|betadine/.test(n))
    return "3004";
  if (/milk|dahi|curd|paneer|ghee/.test(n)) return "0401";
  if (/oil|sunlite|refined/.test(n)) return "1507";
  if (/salt/.test(n)) return "2501";
  if (/atta|flour|rice|dal/.test(n)) return "1101";
  if (/noodle|maggi|pasta/.test(n)) return "1902";
  if (/biscuit|oreo|cookie/.test(n)) return "1905";
  if (/soap|dettol|sanitizer/.test(n)) return "3401";
  return "2106";
}

export function guessGstRate(name: string): number {
  const n = name.toLowerCase();
  if (/crocin|dolo|combiflam|paracetamol|tablet|ors|betadine/.test(n)) return 12;
  if (/milk|dahi|curd|salt|atta/.test(n)) return 5;
  if (/oil|ghee/.test(n)) return 5;
  if (/soap|dettol/.test(n)) return 18;
  return 5;
}

export function withGstFields<T extends LineItem | SaleLine>(
  line: T,
  name = "productName" in line ? line.productName : "",
): T {
  return {
    ...line,
    hsn: line.hsn || guessHsn(name),
    gstRate: line.gstRate ?? guessGstRate(name),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
