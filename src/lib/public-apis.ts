/** Free public APIs (no keys). Fail soft — shop still works offline. */

export type OffProduct = {
  barcode: string;
  name: string;
  brand: string;
  quantity: string;
  image: string | null;
  categories: string;
  nutriscore: string | null;
};

export type PincodePlace = {
  pincode: string;
  name: string;
  district: string;
  state: string;
  block: string;
};

export type Holiday = {
  date: string;
  name: string;
  localName: string;
};

export type WeatherNow = {
  tempC: number;
  code: number;
  label: string;
  hint: string;
  lat: number;
  lon: number;
};

export type FxQuote = {
  from: string;
  to: string;
  rate: number;
  at: string;
};

const UA = "RetailBuddy/1.0 (kirana inventory; +https://github.com/Akshit1018/S.RetailBuddy)";

async function getJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(t);
  }
}

const LOCAL_OFF: Record<string, OffProduct> = {
  "8901030865123": {
    barcode: "8901030865123",
    name: "Sunlite Refined Oil 1L",
    brand: "Fortune",
    quantity: "1L",
    image: null,
    categories: "oils",
    nutriscore: null,
  },
  "8901262010014": {
    barcode: "8901262010014",
    name: "Taaza Toned Milk 1L",
    brand: "Amul",
    quantity: "1L",
    image: null,
    categories: "milk",
    nutriscore: null,
  },
  "8901058001234": {
    barcode: "8901058001234",
    name: "2-Minute Noodles 70g",
    brand: "Maggi",
    quantity: "70g",
    image: null,
    categories: "noodles",
    nutriscore: null,
  },
  "3017620422003": {
    barcode: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    quantity: "400g",
    image: null,
    categories: "spreads",
    nutriscore: "e",
  },
};

export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const code = barcode.replace(/\D/g, "");
  if (code.length < 8) return null;
  try {
    const data = (await getJson(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
    )) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        quantity?: string;
        image_front_small_url?: string;
        categories_tags?: string[];
        nutriscore_grade?: string;
      };
    };
    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = (p.product_name || p.product_name_en || "").trim();
      if (name) {
        return {
          barcode: code,
          name,
          brand: (p.brands || "").split(",")[0]?.trim() || "",
          quantity: p.quantity || "",
          image: p.image_front_small_url || null,
          categories: (p.categories_tags || []).slice(0, 3).join(", "),
          nutriscore: p.nutriscore_grade || null,
        };
      }
    }
  } catch {
    /* local fallback */
  }
  if (LOCAL_OFF[code]) return LOCAL_OFF[code]!;
  try {
    const data = (await getJson(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(code)}&search_simple=1&action=process&json=1&page_size=1`,
    )) as { products?: Array<{ code?: string; product_name?: string; brands?: string; quantity?: string; image_front_small_url?: string }> };
    const p = data.products?.[0];
    if (p?.product_name) {
      return {
        barcode: p.code || code,
        name: p.product_name,
        brand: (p.brands || "").split(",")[0]?.trim() || "",
        quantity: p.quantity || "",
        image: p.image_front_small_url || null,
        categories: "",
        nutriscore: null,
      };
    }
  } catch {
    /* ignore */
  }
  return LOCAL_OFF[code] ?? null;
}

export async function searchOffProducts(term: string, limit = 4): Promise<OffProduct[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  try {
    const data = (await getJson(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${limit}&tagtype_0=countries&tag_contains_0=contains&tag_0=india`,
      9000,
    )) as {
      products?: Array<{
        code?: string;
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        quantity?: string;
        image_front_small_url?: string;
        categories_tags?: string[];
      }>;
    };
    const out: OffProduct[] = [];
    for (const p of data.products || []) {
      const name = (p.product_name || p.product_name_en || "").trim();
      if (!name) continue;
      out.push({
        barcode: p.code || "",
        name,
        brand: (p.brands || "").split(",")[0]?.trim() || "",
        quantity: p.quantity || "",
        image: p.image_front_small_url || null,
        categories: (p.categories_tags || []).slice(0, 2).join(", "),
        nutriscore: null,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function lookupPincode(pin: string): Promise<PincodePlace | null> {
  const pincode = pin.replace(/\D/g, "").slice(0, 6);
  if (pincode.length !== 6) return null;
  const data = (await getJson(
    `https://api.postalpincode.in/pincode/${pincode}`,
  )) as Array<{
    Status?: string;
    PostOffice?: Array<{
      Name?: string;
      District?: string;
      State?: string;
      Block?: string;
    }>;
  }>;
  const first = data?.[0];
  const po = first?.PostOffice?.[0];
  if (!po) return null;
  return {
    pincode,
    name: po.Name || "",
    district: po.District || "",
    state: po.State || "",
    block: po.Block || "",
  };
}

const HOLIDAY_FALLBACK_2026: Holiday[] = [
  { date: "2026-01-26", name: "Republic Day", localName: "गणतंत्र दिवस" },
  { date: "2026-03-03", name: "Holi", localName: "होली" },
  { date: "2026-03-21", name: "Eid al-Fitr", localName: "ईद" },
  { date: "2026-04-14", name: "Ambedkar Jayanti", localName: "आंबेडकर जयंती" },
  { date: "2026-08-15", name: "Independence Day", localName: "स्वतंत्रता दिवस" },
  { date: "2026-10-02", name: "Gandhi Jayanti", localName: "गांधी जयंती" },
  { date: "2026-11-08", name: "Diwali", localName: "दीपावली" },
  { date: "2026-12-25", name: "Christmas", localName: "क्रिसमस" },
];

export async function fetchIndiaHolidays(year = new Date().getFullYear()) {
  try {
    const data = (await getJson(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`,
    )) as Array<{ date: string; name: string; localName: string }>;
    if (!Array.isArray(data) || !data.length) return HOLIDAY_FALLBACK_2026;
    return data.map((h) => ({
      date: h.date,
      name: h.name,
      localName: h.localName || h.name,
    }));
  } catch {
    return HOLIDAY_FALLBACK_2026;
  }
}

export function nextHoliday(list: Holiday[], from = new Date()): Holiday | null {
  const iso = from.toISOString().slice(0, 10);
  return list.find((h) => h.date >= iso) ?? null;
}

function weatherLabel(code: number, temp: number): { label: string; hint: string } {
  if (code >= 51 && code < 70)
    return { label: "Rain", hint: "Push Maggi, tea, candles, umbrellas." };
  if (code >= 80)
    return { label: "Showers", hint: "Hot snacks + packaged food will move." };
  if (temp >= 36)
    return { label: "Very hot", hint: "Push curd, cold drinks, water, ice." };
  if (temp >= 32)
    return { label: "Hot", hint: "Cold drinks and curd will sell faster." };
  if (temp <= 16)
    return { label: "Cold", hint: "Push tea, oil, biscuits, namkeen." };
  return { label: "Pleasant", hint: "Normal mix — keep milk and atta ready." };
}

export async function fetchWeather(
  lat = 25.2138,
  lon = 75.8648,
): Promise<WeatherNow> {
  const data = (await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
  )) as { current?: { temperature_2m?: number; weather_code?: number } };
  const temp = data.current?.temperature_2m ?? 32;
  const code = data.current?.weather_code ?? 0;
  const { label, hint } = weatherLabel(code, temp);
  return { tempC: Math.round(temp), code, label, hint, lat, lon };
}

export async function fetchUsdInr(): Promise<FxQuote> {
  try {
    const data = (await getJson(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
    )) as { date?: string; usd?: { inr?: number } };
    const rate = data.usd?.inr;
    if (rate) return { from: "USD", to: "INR", rate, at: data.date || "" };
  } catch {
    /* try next */
  }
  try {
    const data = (await getJson(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
    )) as { date?: string; rates?: { INR?: number } };
    if (data.rates?.INR) {
      return { from: "USD", to: "INR", rate: data.rates.INR, at: data.date || "" };
    }
  } catch {
    /* fallback */
  }
  return { from: "USD", to: "INR", rate: 83.5, at: "" };
}

export function festivalTemplate(h: Holiday, shop: string) {
  return `Namaste {name}! ${h.localName} (${h.name}) aa raha hai ${h.date} ko. ${shop} par special stock ready hai. Catalogue: {link}`;
}

void UA;
