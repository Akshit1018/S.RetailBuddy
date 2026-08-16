import type { AppState } from "@/lib/types";

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  app: "StockScan";
  state: Partial<AppState>;
};

const KEYS: (keyof AppState)[] = [
  "theme",
  "locale",
  "onboardingDone",
  "welcomeDismissed",
  "splashSeen",
  "aiEnabled",
  "profiles",
  "activeProfileId",
  "products",
  "invoices",
  "sales",
  "customers",
  "customerSeq",
  "paymentQrDataUrl",
  "upiId",
  "staffPinHash",
  "suppliers",
  "returns",
  "dayCloses",
  "voiceHints",
  "shop",
  "shopOrders",
  "leads",
  "waTemplates",
  "settings",
  "shopDataVersion",
  "demoSyncedAt",
];

export function buildBackup(state: AppState): BackupPayload {
  const slice: Partial<AppState> = {};
  for (const k of KEYS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (slice as any)[k] = state[k];
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "StockScan",
    state: slice,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur.trim());
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur.trim());
      if (row.some((x) => x)) rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur.trim());
    if (row.some((x) => x)) rows.push(row);
  }
  return rows;
}

export function productsToCsv(
  products: AppState["products"],
): string {
  const header = [
    "code",
    "name",
    "quantity",
    "unitCost",
    "unitPrice",
    "mrp",
    "expiryDate",
    "batchNo",
    "barcode",
    "reorderLevel",
    "hsn",
    "gstRate",
  ];
  const lines = [header.join(",")];
  for (const p of products) {
    const cells = [
      p.code,
      p.name,
      p.quantity,
      p.unitCost,
      p.unitPrice,
      p.mrp ?? "",
      p.expiryDate ?? "",
      p.batchNo ?? "",
      p.barcode ?? "",
      p.reorderLevel,
      p.hsn ?? "",
      p.gstRate ?? "",
    ].map((v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}
