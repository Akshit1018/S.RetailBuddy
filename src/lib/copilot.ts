import type { AppState, Product } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { effectivePaymentStatus } from "@/lib/payment";
import { isExpired, isLowStock, isNearExpiry } from "@/lib/stock-buckets";

export type CopilotReply = {
  text: string;
  intent:
    | "stock"
    | "sell"
    | "low"
    | "expiry"
    | "money"
    | "credit"
    | "help"
    | "unknown";
  sell?: { code: string; name: string; qty: number };
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function findProduct(products: Product[], q: string): Product | undefined {
  const n = norm(q);
  if (!n) return undefined;
  return (
    products.find((p) => p.code.toLowerCase() === n) ||
    products.find((p) => p.barcode && p.barcode.includes(n.replace(/\s/g, ""))) ||
    products.find((p) => norm(p.name).includes(n)) ||
    products.find((p) => n.split(" ").some((w) => w.length > 2 && norm(p.name).includes(w)))
  );
}

export function runCopilot(q: string, state: AppState): CopilotReply {
  const raw = q.trim();
  const n = norm(raw);
  if (!n) return { text: "Type something — e.g. kitna Maggi, low stock, udhaar.", intent: "help" };

  if (/^(help|madad|kya kar|commands?)$/.test(n)) {
    return {
      intent: "help",
      text: "Try: kitna Maggi · low stock · expiry · aaj sale · udhaar · profit · sell 2 Maggi",
    };
  }

  const sellM = n.match(
    /(?:sell|bech|bhech|nikal)\s+(\d+(?:\.\d+)?)\s+(.+)/,
  );
  if (sellM) {
    const qty = Number(sellM[1]);
    const p = findProduct(state.products, sellM[2]!);
    if (!p) return { intent: "sell", text: `No product matching “${sellM[2]}”.` };
    return {
      intent: "sell",
      sell: { code: p.code, name: p.name, qty },
      text: `Ready to sell ${qty} × ${p.name} (${p.quantity} in stock) @ ${formatINR(p.unitPrice)}. Confirm in Sell.`,
    };
  }

  if (/low|khatam|reorder|kharid|buy more|kam stock/.test(n)) {
    const list = state.products.filter((p) => isLowStock(p));
    if (!list.length) return { intent: "low", text: "Nothing is low. Green bucket is empty." };
    return {
      intent: "low",
      text: `Buy soon (${list.length}): ${list
        .slice(0, 6)
        .map((p) => `${p.name} (${p.quantity})`)
        .join(" · ")}`,
    };
  }

  if (/expir|expiry|pehle bech|near exp|kharab/.test(n)) {
    const near = state.products.filter((p) => isNearExpiry(p) || isExpired(p));
    if (!near.length) return { intent: "expiry", text: "No near-expiry or expired stock." };
    return {
      intent: "expiry",
      text: near
        .slice(0, 6)
        .map((p) => `${p.name} → ${p.expiryDate || "?"} (${p.quantity})`)
        .join("\n"),
    };
  }

  if (/udhaar|credit|owe|pending pay|kisne nahi/.test(n)) {
    const due = state.sales.filter((s) => effectivePaymentStatus(s) !== "paid");
    if (!due.length) return { intent: "credit", text: "No open credit. All bills green." };
    const sum = due.reduce((a, s) => a + Math.max(0, s.totalRevenue - s.amountPaid), 0);
    return {
      intent: "credit",
      text: `Open credit ${formatINR(sum)} on ${due.length} bills. ${due
        .slice(0, 4)
        .map((s) => `${s.customerSnapshot?.name || s.billNo} ${formatINR(s.totalRevenue - s.amountPaid)}`)
        .join(" · ")}`,
    };
  }

  if (/profit|faida|margin|kitna kamaya/.test(n)) {
    const rev = state.sales.reduce((a, s) => a + s.totalRevenue, 0);
    const cost = state.sales.reduce((a, s) => a + s.totalCost, 0);
    return {
      intent: "money",
      text: `Sales ${formatINR(rev)} · cost ${formatINR(cost)} · profit ${formatINR(rev - cost)}.`,
    };
  }

  if (/aaj|today sale|aaj ki sale|today/.test(n) && /sale|bech|bill|aaj/.test(n)) {
    const day = new Date().toISOString().slice(0, 10);
    const todays = state.sales.filter((s) => s.createdAt.slice(0, 10) === day);
    const rev = todays.reduce((a, s) => a + s.totalRevenue, 0);
    return {
      intent: "money",
      text: `Today ${todays.length} bills · ${formatINR(rev)}.`,
    };
  }

  if (/kitna|how many|stock of|qty of|quantity/.test(n) || findProduct(state.products, n)) {
    const cleaned = n.replace(/kitna|how many|stock of|qty of|quantity|hai|hain|ka|ki|ke/g, " ");
    const p = findProduct(state.products, cleaned) || findProduct(state.products, n);
    if (p) {
      return {
        intent: "stock",
        text: `${p.name}\n${p.quantity} units · sell ${formatINR(p.unitPrice)} · cost ${formatINR(p.unitCost)}\nCode ${p.code}${p.expiryDate ? ` · exp ${p.expiryDate}` : ""}`,
      };
    }
  }

  return {
    intent: "unknown",
    text: "Didn’t catch that. Try “kitna Maggi”, “low stock”, “udhaar”, or “sell 2 Maggi”.",
  };
}
