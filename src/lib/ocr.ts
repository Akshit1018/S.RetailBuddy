import { generateProductCode, uid } from "@/lib/utils";
import type { LineItem, Product } from "@/lib/types";
import { guessGstRate, guessHsn } from "@/lib/gst";
import { prepareImageForOcr, prepareImageForOcrDetailed } from "@/lib/image-prep";
import { scoreName } from "@/lib/list-ocr";

export interface OcrResult {
  invoiceNo: string | null;
  supplier: string | null;
  billDate: string | null;
  rawText: string;
  lines: LineItem[];
  confidence: number;
  source: "tesseract" | "demo" | "paste";
  note?: string;
}

type TessWorker = {
  recognize: (
    image: string,
  ) => Promise<{ data: { text: string; confidence?: number } }>;
  setParameters: (params: Record<string, unknown>) => Promise<unknown>;
};

const DEMO_CATALOG = [
  {
    name: "Amul Taaza Toned Milk 1L",
    code: "AMUL-TAZ-1L",
    qty: 24,
    cost: 52,
    price: 62,
    mrp: 66,
    expiryDays: 7,
    batch: "AM2408",
  },
  {
    name: "Tata Salt Iodized 1kg",
    code: "TATA-SALT-1K",
    qty: 40,
    cost: 22,
    price: 28,
    mrp: 30,
    expiryDays: 365,
    batch: "TS1124",
  },
  {
    name: "Maggi 2-Minute Noodles 70g",
    code: "MAGGI-2M-70",
    qty: 96,
    cost: 12,
    price: 16,
    mrp: 18,
    expiryDays: 180,
    batch: "MG9082",
  },
  {
    name: "Parle-G Gold Biscuits 1kg",
    code: "PARLE-G-1K",
    qty: 30,
    cost: 95,
    price: 120,
    mrp: 130,
    expiryDays: 240,
    batch: "PG5521",
  },
  {
    name: "Fortune Sunlite Refined Oil 1L",
    code: "FORT-OIL-1L",
    qty: 18,
    cost: 145,
    price: 168,
    mrp: 175,
    expiryDays: 365,
    batch: "FO3310",
  },
  {
    name: "Britannia Good Day Cashew 200g",
    code: "BRIT-GD-200",
    qty: 48,
    cost: 38,
    price: 48,
    mrp: 50,
    expiryDays: 150,
    batch: "BG7712",
  },
  {
    name: "Dettol Antiseptic Liquid 550ml",
    code: "DETT-ANT-550",
    qty: 20,
    cost: 165,
    price: 198,
    mrp: 210,
    expiryDays: 720,
    batch: "DT4410",
  },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function buildDemoInvoice(seed = Date.now()): OcrResult {
  const start = seed % DEMO_CATALOG.length;
  const count = 3 + (seed % 3);
  const picked = Array.from({ length: count }, (_, i) => {
    const item = DEMO_CATALOG[(start + i) % DEMO_CATALOG.length]!;
    const omitCode = (seed + i) % 5 === 0;
    const code = omitCode ? generateProductCode(item.name) : item.code;
    const line: LineItem = {
      id: uid("line"),
      productCode: code,
      productName: item.name,
      quantity: item.qty + ((seed + i) % 6),
      unitCost: item.cost,
      unitPrice: item.price,
      mrp: item.mrp,
      expiryDate: addDays(item.expiryDays - ((seed + i) % 30)),
      batchNo: item.batch,
      codeGenerated: omitCode,
      hsn: guessHsn(item.name),
      gstRate: guessGstRate(item.name),
    };
    return line;
  });

  const invNo = `INV-${String(10000 + (seed % 90000))}`;
  const suppliers = [
    "Metro Wholesale Pvt Ltd",
    "Reliance Retail Dist.",
    "JioMart Supply Hub",
    "BigBasket Warehouse",
    "Local Kirana Distributors",
  ];
  const supplier = suppliers[seed % suppliers.length]!;
  const billDate = new Date(Date.now() - (seed % 5) * 86400000)
    .toISOString()
    .slice(0, 10);

  const rawText = [
    supplier,
    `Tax Invoice / E-Commerce Bill`,
    `Invoice No: ${invNo}`,
    `Date: ${billDate}`,
    `----------------------------------------`,
    ...picked.map(
      (l, i) =>
        `${i + 1}. ${l.productCode}  ${l.productName}\n   Qty: ${l.quantity}  Rate: ${l.unitCost}  Exp: ${l.expiryDate ?? "-"}  Batch: ${l.batchNo ?? "-"}`,
    ),
    `----------------------------------------`,
    `Total items: ${picked.length}`,
  ].join("\n");

  return {
    invoiceNo: invNo,
    supplier,
    billDate,
    rawText,
    lines: picked,
    confidence: 0.94,
    source: "demo",
    note: "Sample bill — edit any field before adding to stock.",
  };
}

/** Clean printed invoice Tesseract can actually read (for practice). */
export function renderPracticeInvoicePng(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 920;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("METRO WHOLESALE PVT LTD", 36, 52);
  ctx.font = "22px sans-serif";
  ctx.fillText("Tax Invoice", 36, 92);
  ctx.fillText("Invoice No: INV-88421", 36, 130);
  ctx.fillText("Date: 12/08/2026", 36, 164);
  ctx.fillText("GSTIN: 08AABCM1234F1Z5", 36, 198);
  ctx.beginPath();
  ctx.moveTo(36, 220);
  ctx.lineTo(880, 220);
  ctx.stroke();
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("CODE                 NAME                              QTY    RATE", 36, 258);
  ctx.font = "22px sans-serif";
  const rows = [
    "AMUL-TAZ-1L     Amul Taaza Toned Milk 1L        Qty: 24    Rate: 52.00",
    "TATA-SALT-1K    Tata Salt Iodized 1kg           Qty: 40    Rate: 22.00",
    "MAGGI-2M-70     Maggi 2-Minute Noodles 70g      Qty: 96    Rate: 12.00",
    "FORT-OIL-1L     Fortune Sunlite Refined Oil 1L  Qty: 18    Rate: 145.00",
  ];
  rows.forEach((row, i) => ctx.fillText(row, 36, 300 + i * 40));
  ctx.beginPath();
  ctx.moveTo(36, 470);
  ctx.lineTo(880, 470);
  ctx.stroke();
  ctx.font = "22px sans-serif";
  ctx.fillText("Total items: 4", 36, 514);
  ctx.fillText("Grand Total: Rs 6294.00", 36, 552);
  return canvas.toDataURL("image/png");
}

const SKIP_ROW =
  /^(s\.?no|sr|hsn|qty|rate|amount|total|taxable|cgst|sgst|igst|gst|invoice|tax invoice|bill to|ship to|grand total|subtotal|discount|round|page|authorised|e\.?&?o\.?e|code\s+name|description|particulars)/i;

const JUNK_LINE =
  /invoice\s*(no|num|#)|tax invoice|gstin|grand total|sub\s*total|total items|taxable|cgst|sgst|igst|round off|authorised|e\.?\s*&?\s*o\.?\s*e|page\s+\d|bill to|ship to|phone|mobile|address|pincode|dated?[:\s]|gst\s*in/i;

function isJunkName(name: string): boolean {
  const n = name.trim();
  if (n.length < 4) return true;
  if (JUNK_LINE.test(n)) return true;
  if (/^(tax|invoice|bill|total|gst|hsn|qty|rate|amount|date|no)$/i.test(n))
    return true;
  if ((n.match(/[A-Za-z]/g) || []).length < 3) return true;
  return false;
}

function makeLine(
  name: string,
  qty: number,
  cost: number,
  code?: string,
  generated = !code,
): LineItem {
  const clean = name.replace(/\s+/g, " ").trim();
  const unitCost = Number.isFinite(cost) ? cost : 0;
  return {
    id: uid("line"),
    productCode: code || generateProductCode(clean),
    productName: clean,
    quantity: Math.max(1, Math.min(99999, Math.round(qty) || 1)),
    unitCost,
    unitPrice: unitCost ? Math.round(unitCost * 1.18 * 100) / 100 : 0,
    expiryDate: null,
    batchNo: null,
    mrp: null,
    codeGenerated: generated,
    hsn: guessHsn(clean),
    gstRate: guessGstRate(clean),
  };
}

function lineFromProduct(p: Product, qty: number, cost?: number): LineItem {
  const unitCost = cost && cost > 0 ? cost : p.unitCost;
  return {
    id: uid("line"),
    productCode: p.code,
    productName: p.name,
    quantity: Math.max(1, qty),
    unitCost,
    unitPrice: p.unitPrice,
    expiryDate: p.expiryDate,
    batchNo: p.batchNo,
    mrp: p.mrp,
    codeGenerated: false,
    hsn: p.hsn ?? guessHsn(p.name),
    gstRate: p.gstRate ?? guessGstRate(p.name),
  };
}

function extractQtyRate(row: string): { qty: number; rate: number } {
  const labeledQty = row.match(/(?:qty|qnty|pcs|nos)[:\s]+(\d{1,5})/i);
  const labeledRate = row.match(/(?:rate|rs|mrp|@)[:\s]+(\d+(?:\.\d{1,2})?)/i);
  if (labeledQty || labeledRate) {
    return {
      qty: labeledQty ? Number(labeledQty[1]) : 1,
      rate: labeledRate ? Number(labeledRate[1]) : 0,
    };
  }
  const stripped = row
    .replace(/\d+(?:\.\d+)?\s*(?:ml|l|ltr|kg|g|gm|gms|pkts?|pcs)\b/gi, " ")
    .replace(/\b\d+-/g, " ");
  const nums = [...stripped.matchAll(/(\d+(?:\.\d{1,2})?)/g)].map((m) => Number(m[1]));
  if (nums.length >= 3) {
    const amount = nums[nums.length - 1]!;
    const rate = nums[nums.length - 2]!;
    const qty = nums[nums.length - 3]!;
    if (qty >= 1 && qty < 20000 && rate < 100000) return { qty, rate };
    if (rate >= 1 && amount > rate) return { qty: Math.max(1, Math.round(amount / rate)), rate };
  }
  if (nums.length === 2) {
    const [a, b] = nums;
    if ((a ?? 0) < 20000 && (b ?? 0) < 100000) return { qty: a ?? 1, rate: b ?? 0 };
  }
  if (nums.length === 1 && (nums[0] ?? 0) < 20000) {
    return { qty: nums[0] ?? 1, rate: 0 };
  }
  return { qty: 1, rate: 0 };
}

function stripNoise(row: string): string {
  return row
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/\b(?:hsn|gst|cgst|sgst|igst)\b[:\s]*\d*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLinesFromText(text: string): LineItem[] {
  const lines: LineItem[] = [];
  const seen = new Set<string>();
  const rows = text
    .split(/\n+/)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter((r) => r.length > 3 && !SKIP_ROW.test(r));

  const patterns: RegExp[] = [
    /^([A-Z0-9][A-Z0-9\-]{3,})\s+([A-Za-z][A-Za-z0-9 .\/&%()+-]{3,50}?)\s+(\d{1,5})\s+(\d+(?:\.\d{1,2})?)(?:\s+(\d+(?:\.\d{1,2})?))?$/,
    /^\d+[\.\)]\s*([A-Za-z][A-Za-z0-9 .\/&%()+-]{3,50}?)\s+(\d{1,5})\s+(\d+(?:\.\d{1,2})?)/,
    /([A-Za-z][A-Za-z0-9 .\/&%()+-]{3,50}?)\s+(?:qty|qnty|pcs|nos)[:\s]+(\d{1,5})\s+(?:rate|rs|mrp|@)?[:\s]*(\d+(?:\.\d{1,2})?)/i,
    /^([A-Za-z][A-Za-z0-9 .\/&%()+-]{4,48}?)\s+(\d{1,5})\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)$/,
  ];

  for (const row of rows) {
    if (/^\d{6,}$/.test(row)) continue;
    if (JUNK_LINE.test(row)) continue;
    if (/pvt|ltd|llc|wholesale|distributor|warehouse/i.test(row) && !/\d{1,4}\s+\d/.test(row))
      continue;
    let item: LineItem | null = null;

    let m = row.match(patterns[0]!);
    if (m) item = makeLine(m[2]!, Number(m[3]), Number(m[4]), m[1], false);
    if (!item && (m = row.match(patterns[1]!))) {
      item = makeLine(m[1]!, Number(m[2]), Number(m[3]));
    }
    if (!item && (m = row.match(patterns[2]!))) {
      item = makeLine(m[1]!, Number(m[2]), Number(m[3]));
    }
    if (!item && (m = row.match(patterns[3]!))) {
      item = makeLine(m[1]!, Number(m[2]), Number(m[3]));
    }

    if (!item) {
      const cleaned = stripNoise(row);
      const namePart = cleaned
        .replace(/(\d+(?:\.\d{1,2})?)(\s+\d+(?:\.\d{1,2})?){1,3}\s*$/, "")
        .replace(/^[A-Z0-9][A-Z0-9\-]{3,}\s+/, "")
        .trim();
      const { qty, rate } = extractQtyRate(cleaned);
      if (
        namePart.length >= 4 &&
        /[A-Za-z]/.test(namePart) &&
        !isJunkName(namePart) &&
        qty > 0 &&
        qty < 5000
      ) {
        const codeMatch = cleaned.match(/^([A-Z0-9][A-Z0-9\-]{3,})\s+/);
        item = makeLine(namePart, qty, rate, codeMatch?.[1], !codeMatch);
      }
    }

    if (!item) continue;
    if (isJunkName(item.productName) || item.quantity >= 5000) continue;
    const key = `${item.productName.toLowerCase()}|${item.quantity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const exp = row.match(
      /(?:exp(?:iry)?|best before|use by)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    );
    if (exp) item.expiryDate = normalizeDate(exp[1]!);
    const batch = row.match(/(?:batch|bno|lot)[:\s]*([A-Z0-9\-]{3,})/i);
    if (batch) item.batchNo = batch[1]!;
    lines.push(item);
    if (lines.length >= 40) break;
  }

  return lines;
}

export function extractCatalogHits(text: string, products: Product[]): LineItem[] {
  if (!products.length || !text.trim()) return [];
  const rows = text
    .split(/\n+/)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter((r) => r.length > 2 && !SKIP_ROW.test(r) && !JUNK_LINE.test(r));
  const used = new Set<string>();
  const out: LineItem[] = [];

  for (const row of rows) {
    let best: { p: Product; score: number } | null = null;
    for (const p of products) {
      const s = Math.max(
        scoreName(row, p.name, p.code),
        p.barcode ? scoreName(row, p.barcode, p.code) : 0,
      );
      if (!best || s > best.score) best = { p, score: s };
    }
    if (best && best.score >= 0.48 && !used.has(best.p.id)) {
      const { qty, rate } = extractQtyRate(row);
      const safeQty = qty >= 5000 ? 1 : qty;
      used.add(best.p.id);
      out.push(lineFromProduct(best.p, safeQty, rate));
    }
  }

  const blob = text.toLowerCase();
  for (const p of products) {
    if (used.has(p.id)) continue;
    const full = p.name.toLowerCase();
    const short = full.split(" ").slice(0, 2).join(" ");
    const code = p.code.toLowerCase();
    if (
      (full.length > 8 && blob.includes(full)) ||
      (code.length > 4 && blob.includes(code)) ||
      (short.length > 6 && blob.includes(short))
    ) {
      used.add(p.id);
      out.push(lineFromProduct(p, 1, p.unitCost));
    }
  }
  return out;
}

function mergeLines(primary: LineItem[], extra: LineItem[]): LineItem[] {
  const out = [...primary];
  for (const line of extra) {
    const dup = out.some(
      (x) =>
        x.productCode.toLowerCase() === line.productCode.toLowerCase() ||
        x.productName.toLowerCase() === line.productName.toLowerCase(),
    );
    if (!dup) out.push(line);
  }
  return out;
}

export function matchLinesToCatalog(
  lines: LineItem[],
  products: Product[],
): LineItem[] {
  if (!products.length) return lines;
  return lines.map((line) => {
    let best: Product | null = null;
    let score = 0;
    for (const p of products) {
      const s = Math.max(
        scoreName(line.productName, p.name, p.code),
        scoreName(line.productCode, p.name, p.code),
        p.barcode ? scoreName(line.productName, p.barcode, p.code) : 0,
      );
      if (s > score) {
        score = s;
        best = p;
      }
    }
    if (!best || score < 0.5) return line;
    return {
      ...line,
      productCode: best.code,
      productName: best.name,
      unitPrice: best.unitPrice || line.unitPrice,
      unitCost: line.unitCost || best.unitCost,
      hsn: best.hsn ?? line.hsn,
      gstRate: best.gstRate ?? line.gstRate,
      expiryDate: line.expiryDate || best.expiryDate,
      codeGenerated: false,
    };
  });
}

function normalizeDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (c!.length === 2) c = `20${c}`;
    const first = Number(a);
    const second = Number(b);
    // Indian bills are DD/MM/YYYY. Use that unless the day slot is impossible.
    if (first > 12 && second <= 12) {
      return `${c}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`;
    }
    return `${c}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`;
  }
  return s;
}

function extractMeta(text: string): {
  invoiceNo: string | null;
  supplier: string | null;
  billDate: string | null;
} {
  const inv =
    text.match(
      /(?:invoice\s*(?:no|num|number|#)?|bill\s*no|inv\.?\s*no)[\s.:#-]*([A-Z0-9][A-Z0-9\-\/]{2,})/i,
    )?.[1] ?? null;
  const date =
    text.match(
      /(?:date|dt|dated)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    )?.[1] ?? null;
  const firstLines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 70);
  const supplier =
    firstLines.find(
      (l) =>
        /pvt|ltd|llc|inc|wholesale|retail|distributor|warehouse|mart|store|traders|agency/i.test(
          l,
        ) && !JUNK_LINE.test(l),
    ) ?? null;

  return {
    invoiceNo: inv && !/^INVOICE$/i.test(inv) ? inv : null,
    supplier,
    billDate: date ? normalizeDate(date) : null,
  };
}

export function parseInvoiceText(
  text: string,
  catalog: Product[] = [],
): Omit<OcrResult, "source" | "confidence" | "note"> {
  const catalogLines = extractCatalogHits(text, catalog);
  let parsed = parseLinesFromText(text);
  if (catalog.length) parsed = matchLinesToCatalog(parsed, catalog);
  const catalogCodes = new Set(catalog.map((p) => p.code.toLowerCase()));
  const unknown = parsed.filter((l) => {
    if (isJunkName(l.productName)) return false;
    if (catalogCodes.has(l.productCode.toLowerCase())) return true;
    const matched = catalog.some(
      (p) => p.name.toLowerCase() === l.productName.toLowerCase(),
    );
    if (matched) return true;
    return l.unitCost > 0 && l.quantity < 500 && !JUNK_LINE.test(l.productName);
  });
  const lines = mergeLines(catalogLines, unknown);
  const meta = extractMeta(text);
  return {
    invoiceNo: meta.invoiceNo,
    supplier: meta.supplier,
    billDate: meta.billDate,
    rawText: text,
    lines,
  };
}

export function extractInvoiceFromText(
  text: string,
  catalog: Product[] = [],
): OcrResult {
  const parsed = parseInvoiceText(text, catalog);
  const chars = text.replace(/\s/g, "").length;
  return {
    ...parsed,
    confidence: parsed.lines.length ? 0.82 : chars > 8 ? 0.4 : 0.1,
    source: "paste",
    note: parsed.lines.length
      ? `Read ${parsed.lines.length} line${parsed.lines.length === 1 ? "" : "s"} from text. Check qty and rate.`
      : "Could not find product lines. Add from your stock or type a row.",
  };
}

let tessWorker: TessWorker | null = null;
let tessLoading: Promise<TessWorker> | null = null;

async function getWorker(onProgress?: (msg: string) => void): Promise<TessWorker> {
  if (tessWorker) return tessWorker;
  if (tessLoading) return tessLoading;
  tessLoading = (async () => {
    onProgress?.("Loading reader (first time only)…");
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          onProgress?.(`Reading… ${Math.round((m.progress || 0) * 100)}%`);
        } else if (m.status === "loading language traineddata") {
          onProgress?.("Downloading language pack…");
        } else if (m.status === "initializing tesseract" || m.status === "loading tesseract core") {
          onProgress?.("Starting reader…");
        }
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: "1",
      user_defined_dpi: "150",
    });
    tessWorker = worker;
    return worker;
  })();
  return tessLoading;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("OCR timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function textScore(text: string) {
  return text.replace(/[^A-Za-z0-9]/g, "").length;
}

async function runTesseract(
  imageDataUrl: string,
  onProgress?: (msg: string) => void,
): Promise<string> {
  const worker = await getWorker(onProgress);
  const recognize = async (src: string) => {
    const result = await withTimeout(worker.recognize(src), 50000);
    return (result.data.text || "").replace(/\r/g, "").trim();
  };

  onProgress?.("Preparing photo…");
  const first = await prepareImageForOcrDetailed(imageDataUrl, { mode: "auto" });
  if (first.stats.dark) {
    onProgress?.("Brightening a dim photo…");
  } else if (first.stats.uneven) {
    onProgress?.("Evening out the light…");
  } else {
    onProgress?.("Reading text on the bill…");
  }
  let text = await recognize(first.dataUrl);
  let best = await textScore(text);

  if (best < 28 && first.mode !== "night") {
    onProgress?.("Trying a night / shadow pass…");
    const night = await prepareImageForOcr(imageDataUrl, { mode: "night" });
    const alt = await recognize(night);
    const score = await textScore(alt);
    if (score > best) {
      text = alt;
      best = score;
    }
  } else if (best < 28 && first.mode !== "adaptive") {
    onProgress?.("Trying a high-contrast pass…");
    const sharp = await prepareImageForOcr(imageDataUrl, { mode: "adaptive" });
    const alt = await recognize(sharp);
    if ((await textScore(alt)) > best) text = alt;
  }
  return text;
}

export async function extractInvoiceFromImage(
  imageDataUrl: string,
  onProgress?: (msg: string) => void,
  catalog: Product[] = [],
): Promise<OcrResult> {
  let rawText = "";
  try {
    rawText = await runTesseract(imageDataUrl, onProgress);
  } catch (e) {
    return {
      invoiceNo: null,
      supplier: null,
      billDate: null,
      rawText: "",
      lines: [],
      confidence: 0,
      source: "tesseract",
      note:
        e instanceof Error
          ? `${e.message}. Paste the bill text or add rows by hand.`
          : "Could not read this photo. Paste the text or type rows.",
    };
  }

  onProgress?.("Matching products…");
  const parsed = parseInvoiceText(rawText, catalog);
  const chars = rawText.replace(/\s/g, "").length;
  if (!rawText || chars < 8) {
    return {
      ...parsed,
      rawText,
      lines: [],
      confidence: 0.2,
      source: "tesseract",
      note: "Could not read enough text. Hold the bill flatter — shop lamps and a phone torch are fine — or paste / type the lines.",
    };
  }

  const conf = Math.min(
    0.93,
    0.38 + parsed.lines.length * 0.08 + Math.min(0.25, chars / 800),
  );

  return {
    ...parsed,
    rawText,
    confidence: parsed.lines.length ? conf : 0.4,
    source: "tesseract",
    note: parsed.lines.length
      ? `Read ${parsed.lines.length} line${parsed.lines.length === 1 ? "" : "s"}. Check every qty and rate before saving.`
      : "Text was read but lines were unclear. Add from your stock, or type what you see.",
  };
}

export async function identifyProductFromImage(
  imageDataUrl: string,
  catalog: Array<{ code: string; name: string }>,
): Promise<{
  code: string;
  name: string;
  confidence: number;
  generated: boolean;
  suggestions: Array<{ code: string; name: string; score: number }>;
}> {
  const suggestions: Array<{ code: string; name: string; score: number }> = [];
  try {
    const text = await runTesseract(imageDataUrl);
    const rows = [text.replace(/\s+/g, " ").trim(), ...text.split(/\n+/)];
    for (const p of catalog) {
      let score = 0;
      for (const row of rows) {
        score = Math.max(
          score,
          scoreName(row, p.name, p.code),
          scoreName(p.name, row, p.code),
        );
      }
      if (score >= 0.32) suggestions.push({ code: p.code, name: p.name, score });
    }
    suggestions.sort((a, b) => b.score - a.score);
    const top = suggestions[0];
    if (top && top.score >= 0.5) {
      return {
        code: top.code,
        name: top.name,
        confidence: top.score,
        generated: false,
        suggestions: suggestions.slice(0, 5),
      };
    }
    const words = text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(" ");
    if (words.length > 3) {
      return {
        code: generateProductCode(words),
        name: words.slice(0, 48),
        confidence: 0.35,
        generated: true,
        suggestions: suggestions.slice(0, 5),
      };
    }
  } catch {
    /* fall through */
  }

  return {
    code: "",
    name: "",
    confidence: 0,
    generated: true,
    suggestions: suggestions.slice(0, 5),
  };
}

export async function extractShoppingListFromImage(
  imageDataUrl: string,
  onProgress?: (msg: string) => void,
): Promise<{ text: string; source: "tesseract" | "demo"; note?: string }> {
  onProgress?.("Reading the list…");
  try {
    const text = await runTesseract(imageDataUrl, onProgress);
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
    if (lines.length >= 1 || text.replace(/\s/g, "").length > 8) {
      return { text, source: "tesseract" };
    }
    return {
      text: "",
      source: "tesseract",
      note: "Could not read handwriting. Type the list instead.",
    };
  } catch {
    return {
      text: "",
      source: "tesseract",
      note: "Could not read the photo. Type the list instead.",
    };
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function emptyInvoiceDraft(): OcrResult {
  return {
    invoiceNo: null,
    supplier: null,
    billDate: new Date().toISOString().slice(0, 10),
    rawText: "",
    lines: [
      {
        id: uid("line"),
        productCode: generateProductCode("New Product"),
        productName: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        codeGenerated: true,
        expiryDate: null,
        batchNo: null,
        mrp: null,
      },
    ],
    confidence: 1,
    source: "demo",
    note: "Type the bill yourself, or add products from your stock.",
  };
}

export { hashString };
