import type { BillFormat, GstScheme } from "@/lib/types";

export type BillLayer = "A" | "B" | "C" | "E";

export type BillFormatMeta = {
  id: BillFormat;
  /** Short name a kirana owner will recognise */
  label: string;
  /** One-line Hindi-English hint */
  hint: string;
  /** When to pick this paper */
  when: string;
  layer: BillLayer;
  /** Official GST name */
  official: string;
  gstNeeded: boolean;
  compositionOk: boolean;
};

/** Official GST papers + shop papers, written for a layman. */
export const BILL_FORMATS: BillFormatMeta[] = [
  {
    id: "retail",
    label: "Shop bill",
    hint: "Daily kirana / medical sale. Simplest.",
    when: "Walk-in customer, cash or UPI.",
    layer: "A",
    official: "Retail / tax invoice (simplified)",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "tax_invoice",
    label: "GST bill",
    hint: "Tax invoice — buyer can claim GST.",
    when: "Registered shop selling to another GST shop.",
    layer: "C",
    official: "Tax Invoice (Sec 31)",
    gstNeeded: true,
    compositionOk: false,
  },
  {
    id: "bill_of_supply",
    label: "Bill without tax",
    hint: "Composition shop — no GST on the bill.",
    when: "You are on composition scheme.",
    layer: "C",
    official: "Bill of Supply (Rule 49)",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "invoice_cum_bos",
    label: "Mixed GST bill",
    hint: "Some items with tax, some without.",
    when: "One bill has taxable + exempt items.",
    layer: "C",
    official: "Invoice-cum-bill of supply",
    gstNeeded: true,
    compositionOk: false,
  },
  {
    id: "receipt_voucher",
    label: "Advance receipt",
    hint: "Customer paid first, goods later.",
    when: "Advance / booking money.",
    layer: "B",
    official: "Receipt Voucher",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "payment_voucher",
    label: "We paid",
    hint: "You paid a supplier or expense.",
    when: "Cash/UPI out of the shop.",
    layer: "B",
    official: "Payment Voucher",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "refund_voucher",
    label: "Refund slip",
    hint: "You returned money to the customer.",
    when: "Advance cancelled or extra paid.",
    layer: "B",
    official: "Refund Voucher",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "credit_note",
    label: "Return note",
    hint: "Customer returned goods. Cuts the old bill.",
    when: "Return / rate drop after a GST bill.",
    layer: "C",
    official: "Credit Note (Sec 34)",
    gstNeeded: true,
    compositionOk: true,
  },
  {
    id: "debit_note",
    label: "Extra charge note",
    hint: "You charged more after the bill.",
    when: "Rate went up or freight added later.",
    layer: "C",
    official: "Debit Note (Sec 34)",
    gstNeeded: true,
    compositionOk: true,
  },
  {
    id: "delivery_challan",
    label: "Delivery slip",
    hint: "Goods moving, bill later.",
    when: "Send stock to another shop / job work.",
    layer: "A",
    official: "Delivery Challan (Rule 55)",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "self_invoice",
    label: "Self bill",
    hint: "You buy from an unregistered person.",
    when: "RCM — you make the bill yourself.",
    layer: "C",
    official: "Self Invoice (RCM)",
    gstNeeded: true,
    compositionOk: false,
  },
  {
    id: "e_invoice",
    label: "E-invoice",
    hint: "IRN from GST portal. We store the number.",
    when: "Turnover above e-invoice limit. Paste IRN here.",
    layer: "E",
    official: "E-invoice (IRN)",
    gstNeeded: true,
    compositionOk: false,
  },
  {
    id: "e_way",
    label: "E-way bill",
    hint: "For goods on a vehicle. Paste EWB no.",
    when: "Consignment above e-way limit.",
    layer: "E",
    official: "E-way Bill",
    gstNeeded: false,
    compositionOk: true,
  },
  {
    id: "estimate",
    label: "Estimate / quote",
    hint: "Price talk only. Not a tax bill.",
    when: "Customer asks “kitna lagega?”",
    layer: "A",
    official: "Proforma / estimate",
    gstNeeded: false,
    compositionOk: true,
  },
];

export const BILL_FORMAT_IDS = BILL_FORMATS.map((f) => f.id);

export function formatMeta(id: BillFormat): BillFormatMeta {
  return BILL_FORMATS.find((f) => f.id === id) ?? BILL_FORMATS[0]!;
}

export function formatsForScheme(scheme: GstScheme): BillFormat[] {
  if (scheme === "composition") {
    return BILL_FORMATS.filter((f) => f.compositionOk).map((f) => f.id);
  }
  if (scheme === "unregistered") {
    return ["retail", "estimate", "delivery_challan", "receipt_voucher", "payment_voucher"];
  }
  return BILL_FORMATS.map((f) => f.id);
}

export function defaultFormatsFor(scheme: GstScheme): BillFormat[] {
  if (scheme === "composition") return ["bill_of_supply", "retail"];
  if (scheme === "unregistered") return ["retail"];
  return ["tax_invoice", "retail"];
}

export function printTitle(formats: BillFormat[] | undefined, scheme: GstScheme): string {
  const list = formats?.length ? formats : defaultFormatsFor(scheme);
  const primary = formatMeta(list[0]!);
  if (list.length === 1) return primary.label.toUpperCase();
  return list.map((id) => formatMeta(id).label).join(" + ").toUpperCase();
}
