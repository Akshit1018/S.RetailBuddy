import type { Holiday, WeatherNow } from "@/lib/public-apis";
import type { Product, SaleRecord } from "@/lib/types";
import { isExpired, isLowStock, isNearExpiry } from "@/lib/stock-buckets";
import { formatINR } from "@/lib/utils";

export type AdviceKind = "buy" | "skip" | "city";

export type BuyAdvice = {
  id: string;
  kind: AdviceKind;
  name: string;
  reason: string;
  productId?: string;
  code?: string;
  barcode?: string | null;
  image?: string | null;
  qtyHint?: string;
  alreadyInShop?: boolean;
};

export type CityPack = {
  id: string;
  label: string;
  match: string[];
  staples: Array<{ name: string; why: string; search: string; barcode?: string }>;
};

export const CITY_PACKS: CityPack[] = [
  {
    id: "rj",
    label: "Rajasthan",
    match: [
      "kota",
      "jaipur",
      "ajmer",
      "udaipur",
      "jodhpur",
      "bikaner",
      "alwar",
      "rajasthan",
    ],
    staples: [
      { name: "Wheat atta 10 kg", why: "Daily roti staple in this belt", search: "atta wheat flour india" },
      { name: "Kachi ghani mustard oil 1 L", why: "Preferred cooking oil in Rajasthan", search: "mustard oil india" },
      { name: "Rooh Afza sharbat", why: "Hot dry summers — sharbat moves fast", search: "rooh afza" },
      { name: "Bhujia / namkeen mix", why: "Evening snack demand in tier-2 cities", search: "haldiram namkeen" },
      { name: "Desi ghee 500 ml", why: "Wedding and winter demand here", search: "amul ghee" },
      { name: "Leaf tea 250 g", why: "Chai is a daily SKU", search: "tata tea" },
    ],
  },
  {
    id: "north",
    label: "North India",
    match: ["delhi", "noida", "gurgaon", "lucknow", "kanpur", "agra", "chandigarh", "punjab", "haryana"],
    staples: [
      { name: "Dairy milk / paneer", why: "North homes buy milk every day", search: "amul milk" },
      { name: "Mustard oil 1 L", why: "Default cooking oil in the north", search: "fortune mustard oil" },
      { name: "Atta 10 kg", why: "Roti households restock weekly", search: "aashirvaad atta" },
      { name: "Namkeen + biscuits", why: "Guest and tiffin demand", search: "parle-g" },
    ],
  },
  {
    id: "west",
    label: "West India",
    match: ["mumbai", "pune", "ahmedabad", "surat", "nagpur", "nashik", "goa", "maharashtra", "gujarat"],
    staples: [
      { name: "Poha / poha mix", why: "Breakfast staple on the west coast", search: "poha" },
      { name: "Groundnut oil 1 L", why: "Common cooking oil in this belt", search: "groundnut oil india" },
      { name: "Thepla / khakhra", why: "Gujarati travel snack demand", search: "khakhra" },
      { name: "Coconut oil 500 ml", why: "Coastal kitchens keep this", search: "parachute coconut oil" },
    ],
  },
  {
    id: "south",
    label: "South India",
    match: ["chennai", "bengaluru", "bangalore", "hyderabad", "kochi", "coimbatore", "madurai", "tamil", "kerala", "karnataka", "andhra", "telangana"],
    staples: [
      { name: "Idli / dosa rice 5 kg", why: "Daily breakfast grain", search: "idli rice" },
      { name: "Coconut oil 1 L", why: "Default cooking fat in the south", search: "coconut oil india" },
      { name: "Filter coffee powder", why: "South filter-coffee homes", search: "filter coffee" },
      { name: "Sambar powder 200 g", why: "Every kitchen restocks masala", search: "sambar powder" },
    ],
  },
  {
    id: "east",
    label: "East India",
    match: ["kolkata", "howrah", "patna", "ranchi", "bhubaneswar", "guwahati", "bengal", "bihar", "odisha", "assam"],
    staples: [
      { name: "Mustard oil 1 L", why: "East prefers mustard oil", search: "mustard oil" },
      { name: "Gobindobhog / rice 5 kg", why: "Rice-first kitchens", search: "rice india 5kg" },
      { name: "Rosogolla / sweets tin", why: "Festival and guest demand", search: "rosogolla" },
      { name: "Tea dust 250 g", why: "Strong daily chai culture", search: "red label tea" },
    ],
  },
];

export const INDIA_WEB_PICKS: Array<{
  name: string;
  brand: string;
  why: string;
  regions: string[];
  search: string;
}> = [
  { name: "2-Minute Noodles 70g", brand: "Maggi", why: "Rainy-day and late-night staple", regions: ["*"], search: "maggi" },
  { name: "Taaza Toned Milk 1L", brand: "Amul", why: "Daily milk — first to go empty", regions: ["*"], search: "amul milk" },
  { name: "Aashirvaad Atta 10kg", brand: "ITC", why: "Roti households restock weekly", regions: ["rj", "north"], search: "atta" },
  { name: "Kachi Ghani Mustard Oil 1L", brand: "Fortune", why: "Default cooking oil in Rajasthan / north", regions: ["rj", "north", "east"], search: "mustard oil" },
  { name: "Rooh Afza 750ml", brand: "Hamdard", why: "Hot dry cities drink this all summer", regions: ["rj", "north"], search: "rooh afza" },
  { name: "Aloo Bhujia 200g", brand: "Haldiram's", why: "Evening namkeen for tier-2 towns", regions: ["rj", "north"], search: "bhujia" },
  { name: "Tata Tea Gold 250g", brand: "Tata", why: "Daily chai — never skip", regions: ["*"], search: "tata tea" },
  { name: "Parle-G 800g", brand: "Parle", why: "Cheapest biscuit that always moves", regions: ["*"], search: "parle-g" },
  { name: "Ghee 500ml", brand: "Amul", why: "Wedding + winter demand", regions: ["rj", "north"], search: "ghee" },
  { name: "Coconut Oil 500ml", brand: "Parachute", why: "South / coastal kitchens", regions: ["south", "west"], search: "coconut oil" },
  { name: "Poha 1kg", brand: "Local mill", why: "West-India breakfast staple", regions: ["west"], search: "poha" },
  { name: "Idli rice 5kg", brand: "India Gate", why: "South breakfast grain", regions: ["south"], search: "idli rice" },
  { name: "Filter coffee 200g", brand: "Narasus", why: "South filter-coffee homes", regions: ["south"], search: "filter coffee" },
  { name: "Packaged drinking water 1L", brand: "Bisleri", why: "Heat-wave SKU", regions: ["*"], search: "bisleri" },
  { name: "Mango drink 600ml", brand: "Maaza", why: "Summer fridge item", regions: ["*"], search: "maaza" },
];

export function packForCity(city: string): CityPack {
  const n = city.toLowerCase();
  return CITY_PACKS.find((p) => p.match.some((m) => n.includes(m))) ?? CITY_PACKS[0]!;
}

export function webPicksFor(city: string): typeof INDIA_WEB_PICKS {
  const pack = packForCity(city);
  return INDIA_WEB_PICKS.filter(
    (p) => p.regions.includes("*") || p.regions.includes(pack.id),
  );
}

type Sold = { qty: number; revenue: number; lastAt: number };

function soldMap(sales: SaleRecord[], sinceMs: number): Map<string, Sold> {
  const map = new Map<string, Sold>();
  for (const s of sales) {
    const at = Date.parse(s.createdAt);
    if (!Number.isFinite(at) || at < sinceMs) continue;
    for (const line of s.lines) {
      const key = line.productId || line.productCode;
      const cur = map.get(key) ?? { qty: 0, revenue: 0, lastAt: 0 };
      cur.qty += line.quantity;
      cur.revenue += line.quantity * line.unitPrice;
      cur.lastAt = Math.max(cur.lastAt, at);
      map.set(key, cur);
      if (line.productCode && line.productCode !== key) {
        const byCode = map.get(line.productCode) ?? { qty: 0, revenue: 0, lastAt: 0 };
        byCode.qty += line.quantity;
        byCode.revenue += line.quantity * line.unitPrice;
        byCode.lastAt = Math.max(byCode.lastAt, at);
        map.set(line.productCode, byCode);
      }
    }
  }
  return map;
}

function nameHit(products: Product[], name: string): Product | undefined {
  const n = name.toLowerCase();
  const words = n.split(/\s+/).filter((w) => w.length > 3);
  return products.find((p) => {
    const pn = p.name.toLowerCase();
    return words.some((w) => pn.includes(w));
  });
}

export function analyzeShop(opts: {
  products: Product[];
  sales: SaleRecord[];
  city: string;
  weather?: WeatherNow | null;
  holiday?: Holiday | null;
}): {
  buy: BuyAdvice[];
  skip: BuyAdvice[];
  city: BuyAdvice[];
  summary: string;
  pack: CityPack;
} {
  const now = Date.now();
  const since = now - 14 * 24 * 60 * 60 * 1000;
  const sold = soldMap(opts.sales, since);
  const pack = packForCity(opts.city);
  const buy: BuyAdvice[] = [];
  const skip: BuyAdvice[] = [];

  for (const p of opts.products) {
    const rec = sold.get(p.id) ?? sold.get(p.code);
    const qtySold = rec?.qty ?? 0;
    const perDay = qtySold / 14;
    const cover = perDay > 0 ? p.quantity / perDay : Infinity;
    const low = isLowStock(p);
    const expired = isExpired(p);
    const near = isNearExpiry(p);

    if (expired) {
      skip.push({
        id: `skip-exp-${p.id}`,
        kind: "skip",
        name: p.name,
        productId: p.id,
        code: p.code,
        alreadyInShop: true,
        reason: "Expired — do not buy more. Return or write off.",
        qtyHint: `${p.quantity} left`,
      });
      continue;
    }

    if (qtySold >= 4 && (low || cover < 8)) {
      const need = Math.max(p.reorderLevel, Math.ceil(perDay * 14) - p.quantity);
      buy.push({
        id: `buy-${p.id}`,
        kind: "buy",
        name: p.name,
        productId: p.id,
        code: p.code,
        alreadyInShop: true,
        qtyHint: need > 0 ? `Buy ~${need}` : "Restock",
        reason: `Selling ${qtySold} in 14 days · ${formatINR(rec?.revenue ?? 0)}. Stock will finish soon.`,
      });
      continue;
    }

    if (qtySold === 0 && p.quantity > p.reorderLevel && p.quantity > 0) {
      skip.push({
        id: `skip-dead-${p.id}`,
        kind: "skip",
        name: p.name,
        productId: p.id,
        code: p.code,
        alreadyInShop: true,
        qtyHint: `${p.quantity} sitting`,
        reason: near
          ? "Not selling and near expiry — push this, do not buy more."
          : "No sale in 14 days. Money is stuck. Do not buy more.",
      });
    }
  }

  buy.sort((a, b) => (b.qtyHint || "").localeCompare(a.qtyHint || ""));
  skip.sort((a, b) => (b.qtyHint || "").localeCompare(a.qtyHint || ""));

  const city: BuyAdvice[] = [];
  const seen = new Set<string>();

  const extra: Array<{ name: string; why: string; search: string }> = [];
  if (opts.weather) {
    if (opts.weather.tempC >= 34) {
      extra.push(
        { name: "Packaged water / juice", why: `${opts.weather.tempC}° in ${opts.city} — cold drinks will move`, search: "bisleri water" },
        { name: "Dahi / lassi cup", why: "Heat wave SKU for this city", search: "amul lassi" },
      );
    } else if (opts.weather.tempC <= 16) {
      extra.push({ name: "Tea + biscuits combo", why: "Cold days push chai sales", search: "marie gold biscuit" });
    }
    if (opts.weather.code >= 51) {
      extra.push({ name: "Maggi / ready noodles", why: "Rainy day comfort food", search: "maggi noodles" });
    }
  }
  if (opts.holiday) {
    const hn = `${opts.holiday.name} ${opts.holiday.localName}`.toLowerCase();
    if (/diwali|deepavali|दीपावली/.test(hn)) {
      extra.push({ name: "Dry fruits mix", why: `${opts.holiday.localName} is coming — dry fruit gift boxes`, search: "dry fruits" });
    } else if (/holi|होली/.test(hn)) {
      extra.push({ name: "Thandai mix / gujiya atta", why: `${opts.holiday.localName} demand starts early`, search: "thandai" });
    } else if (/eid|ईद/.test(hn)) {
      extra.push({ name: "Dates + sewai", why: `${opts.holiday.localName} kitchen list`, search: "dates india" });
    }
  }

  for (const item of [...extra, ...pack.staples]) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const existing = nameHit(opts.products, item.name);
    if (existing && (sold.get(existing.id)?.qty ?? 0) > 2) continue;
    city.push({
      id: `city-${key.replace(/\s+/g, "-")}`,
      kind: "city",
      name: item.name,
      reason: item.why,
      alreadyInShop: Boolean(existing),
      productId: existing?.id,
      code: existing?.code,
      barcode: existing?.barcode ?? null,
    });
  }

  const topBuy = buy[0]?.name;
  const summary = topBuy
    ? `${opts.city}: buy more ${topBuy}. Skip dead stock. City list is for this area.`
    : `${opts.city}: watch dead stock, then add city staples people here actually buy.`;

  return {
    buy: buy.slice(0, 5),
    skip: skip.slice(0, 5),
    city: city.slice(0, 6),
    summary,
    pack,
  };
}
