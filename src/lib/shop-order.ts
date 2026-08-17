import type { ShopOrderLine } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export type OrderPayload = {
  v: 1;
  name: string;
  phone: string;
  note: string;
  fulfill: "pickup" | "delivery";
  lines: ShopOrderLine[];
  total: number;
};

const PREFIX = "SS1.";

export function encodeOrder(p: OrderPayload): string {
  const json = JSON.stringify(p);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return PREFIX + b64;
}

export function decodeOrder(raw: string): OrderPayload | null {
  const text = raw.trim();
  const idx = text.indexOf(PREFIX);
  if (idx < 0) return tryLooseParse(text);
  const token = text
    .slice(idx)
    .split(/\s+/)[0]!
    .replace(/[^A-Za-z0-9._-]/g, "");
  const b64 = token
    .slice(PREFIX.length)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const json = decodeURIComponent(escape(atob(pad)));
    const p = JSON.parse(json) as OrderPayload;
    if (!p?.lines?.length) return null;
    return p;
  } catch {
    return tryLooseParse(text);
  }
}

function tryLooseParse(text: string): OrderPayload | null {
  const lines: ShopOrderLine[] = [];
  for (const row of text.split("\n")) {
    const m = row.match(
      /(?:^|\s)(\d+)[\.\)]?\s+(.+?)\s+[x×]\s*(\d+)\s*(?:=?\s*₹?\s*([\d,.]+))?/i,
    );
    if (!m) continue;
    const name = m[2]!.trim();
    const qty = Number(m[3]);
    const price = Number((m[4] || "0").replace(/,/g, "")) || 0;
    lines.push({
      productCode: name.slice(0, 12).toUpperCase().replace(/\s+/g, "-"),
      productName: name,
      quantity: qty,
      unitPrice: qty ? price / qty : price,
    });
  }
  if (!lines.length) return null;
  const phone = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}/)?.[0] ?? "";
  return {
    v: 1,
    name: text.match(/(?:name|naam)[:\s]+([A-Za-z][A-Za-z .]{1,40})/i)?.[1] ?? "Customer",
    phone,
    note: "",
    fulfill: /deliver/i.test(text) ? "delivery" : "pickup",
    lines,
    total: lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
  };
}

export function buildOrderWhatsAppText(opts: {
  shopName: string;
  payload: OrderPayload;
  token: string;
}): string {
  const items = opts.payload.lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.productName} × ${l.quantity} = ${formatINR(l.quantity * l.unitPrice)}`,
    )
    .join("\n");
  return [
    `Namaste! Order for *${opts.shopName}*`,
    ``,
    items,
    ``,
    `*Total: ${formatINR(opts.payload.total)}*`,
    `Name: ${opts.payload.name}`,
    opts.payload.phone ? `WhatsApp: ${opts.payload.phone}` : "",
    `Mode: ${opts.payload.fulfill === "delivery" ? "Delivery" : "Pickup"}`,
    opts.payload.note ? `Note: ${opts.payload.note}` : "",
    ``,
    `---`,
    `Shop: paste this in Retail Buddy → Orders`,
    opts.token,
  ]
    .filter(Boolean)
    .join("\n");
}

export function fillTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  let s = body;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, v);
  }
  return s;
}

export function shopPageUrl(): string {
  if (typeof window === "undefined") return "/shop";
  return `${window.location.origin}/shop`;
}

export function qrImageUrl(data: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}
