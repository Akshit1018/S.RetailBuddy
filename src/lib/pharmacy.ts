import type { Product } from "@/lib/types";
import { daysUntilExpiry } from "@/lib/stock-buckets";

export const EXPIRY_BANDS = [30, 60, 90] as const;
export type ExpiryBand = (typeof EXPIRY_BANDS)[number];

export type ExpiryAlert = {
  product: Product;
  days: number;
  band: ExpiryBand;
};

export function bandForDays(days: number): ExpiryBand | null {
  if (days < 0) return null;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  if (days <= 90) return 90;
  return null;
}

export function expiryAlerts(products: Product[]): {
  band30: ExpiryAlert[];
  band60: ExpiryAlert[];
  band90: ExpiryAlert[];
  expired: Product[];
  all: ExpiryAlert[];
} {
  const band30: ExpiryAlert[] = [];
  const band60: ExpiryAlert[] = [];
  const band90: ExpiryAlert[] = [];
  const expired: Product[] = [];
  for (const p of products) {
    if (p.quantity <= 0) continue;
    const days = daysUntilExpiry(p.expiryDate);
    if (days === null) continue;
    if (days < 0) {
      expired.push(p);
      continue;
    }
    const band = bandForDays(days);
    if (!band) continue;
    const row = { product: p, days, band };
    if (band === 30) band30.push(row);
    else if (band === 60) band60.push(row);
    else band90.push(row);
  }
  const byDays = (a: ExpiryAlert, b: ExpiryAlert) => a.days - b.days;
  band30.sort(byDays);
  band60.sort(byDays);
  band90.sort(byDays);
  return {
    band30,
    band60,
    band90,
    expired,
    all: [...band30, ...band60, ...band90],
  };
}

export function expiryWhatsApp(
  shopName: string,
  alerts: ReturnType<typeof expiryAlerts>,
): string {
  const lines = [`*${shopName}* — Expiry watch`, ``];
  if (alerts.expired.length) {
    lines.push(`EXPIRED — do not sell:`);
    for (const p of alerts.expired.slice(0, 8)) {
      lines.push(`• ${p.name} · ${p.batchNo || "no batch"} · qty ${p.quantity}`);
    }
    lines.push("");
  }
  const pushBand = (label: string, rows: ExpiryAlert[]) => {
    if (!rows.length) return;
    lines.push(`${label}:`);
    for (const r of rows.slice(0, 8)) {
      lines.push(
        `• ${r.product.name} · ${r.days} days · batch ${r.product.batchNo || "—"} · qty ${r.product.quantity}`,
      );
    }
    lines.push("");
  };
  pushBand("Sell in 30 days", alerts.band30);
  pushBand("Sell in 60 days", alerts.band60);
  pushBand("Sell in 90 days", alerts.band90);
  if (lines.length <= 2) lines.push("No near-expiry stock today.");
  lines.push("Sell oldest batch first (FIFO).");
  return lines.join("\n");
}

export function isMedicineName(name: string): boolean {
  return /(crocin|dolo|combiflam|paracetamol|ors|betadine|tablet|syrup|capsule|ointment|drop)/i.test(
    name,
  );
}
