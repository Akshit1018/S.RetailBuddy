import type { Product } from "@/lib/types";

export type ListGuess = {
  raw: string;
  qty: number;
  query: string;
};

export type ListMatch = {
  raw: string;
  qty: number;
  query: string;
  product: Product | null;
  score: number;
};

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS: Record<string, string> = {
  doodh: "milk",
  milk: "milk",
  namak: "salt",
  salt: "salt",
  maggi: "maggi",
  noodles: "maggi",
  tel: "oil",
  oil: "oil",
  atta: "atta",
  rice: "rice",
  chawal: "rice",
  biscuit: "biscuit",
  biscuits: "biscuit",
  parle: "parle",
  dettol: "dettol",
  dahi: "curd",
  curd: "curd",
  yogurt: "curd",
  sugar: "sugar",
  cheeni: "sugar",
  amul: "amul",
  tata: "tata",
  fortune: "fortune",
  oreo: "oreo",
  chai: "tea",
  tea: "tea",
  sabun: "soap",
  soap: "soap",
};

function expandQuery(q: string) {
  const bits = q.toLowerCase().split(/\s+/);
  const extra = bits.map((w) => ALIAS[w]).filter(Boolean);
  return extra.length ? `${q} ${extra.join(" ")}` : q;
}

const QTY_RE =
  /(?:^|\s)(?:x|×)?\s*(\d{1,3}(?:\.\d+)?)\s*(?:x|×|pcs?|pkt|pkts|kg|g|l|ml|nos?|n\.?|packet|pack)?(?:\s|$)/i;

export function parseListText(text: string): ListGuess[] {
  const out: ListGuess[] = [];
  const chunks = text
    .split(/[\n,;]+/)
    .map((row) => row.replace(/^[\s\-\*\d]+[\.\)\-]\s*/, "").trim())
    .filter((line) => line.length >= 2);

  for (const line of chunks) {
    if (/invoice|total|date|gst|bill|rs\.|₹/i.test(line) && line.length < 18) {
      continue;
    }
    const m = line.match(QTY_RE);
    let qty = 1;
    let query = line;
    if (m) {
      qty = Math.max(1, Math.round(Number(m[1]) || 1));
      query = line.replace(m[0], " ").replace(/\s+/g, " ").trim();
    }
    query = query
      .replace(/\b(please|pls|and|or|ka|ki|ke|wale|walla|of|the)\b/gi, "")
      .trim();
    if (query.length < 2) continue;
    out.push({ raw: line, qty, query: expandQuery(query) });
  }
  return out.slice(0, 24);
}

export function scoreName(query: string, name: string, code: string) {
  const q = norm(expandQuery(query));
  const n = norm(name);
  const c = norm(code);
  if (!q) return 0;
  if (n === q || c === q) return 1;
  if (n.includes(q) || q.includes(n)) return 0.86;
  if (c && (c.includes(q) || q.includes(c))) return 0.8;
  const qw = q.split(" ").filter((w) => w.length > 2);
  const nw = n.split(" ");
  if (!qw.length) return 0;
  const hits = qw.filter((w) =>
    nw.some((x) => x.startsWith(w) || w.startsWith(x) || x.includes(w)),
  );
  return (hits.length / qw.length) * 0.78;
}

export function matchListToCatalog(
  guesses: ListGuess[],
  products: Product[],
): ListMatch[] {
  return guesses.map((g) => {
    let best: Product | null = null;
    let score = 0;
    for (const p of products) {
      const s = Math.max(
        scoreName(g.query, p.name, p.code),
        p.barcode ? scoreName(g.query, p.barcode, p.code) : 0,
      );
      if (s > score) {
        score = s;
        best = p;
      }
    }
    return {
      ...g,
      product: score >= 0.42 ? best : null,
      score,
    };
  });
}

export function demoListFromCatalog(products: Product[], seed: number): ListGuess[] {
  const stocked = products.filter((p) => p.quantity > 0);
  const pool = stocked.length ? stocked : products;
  if (!pool.length) {
    return [
      { raw: "2 Maggi", qty: 2, query: "Maggi" },
      { raw: "1 Tata salt", qty: 1, query: "Tata salt" },
      { raw: "Amul milk", qty: 1, query: "Amul milk" },
    ];
  }
  const start = Math.abs(seed) % pool.length;
  return [0, 1, 2]
    .map((i) => pool[(start + i) % pool.length]!)
    .filter(Boolean)
    .map((p, i) => ({
      raw: `${1 + (i % 3)} ${p.name.split(" ").slice(0, 2).join(" ")}`,
      qty: 1 + (i % 3),
      query: p.name,
    }));
}

export function demoListText(products: Product[]): string {
  return demoListFromCatalog(products, Date.now())
    .map((g) => g.raw)
    .join("\n");
}
