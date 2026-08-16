import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function dismiss() {
  const btn = page.locator('div[role="dialog"] button[aria-label="Close"]').first();
  if (await btn.count()) await btn.click({ timeout: 2000 }).catch(() => {});
}

const routes = [
  ["/", /Today|All features|Stock/i],
  ["/stock", /Stock|Search/i],
  ["/stock-in", /Add stock|Sample|Try OCR|Paste/i],
  ["/sell?mode=product", /Search stock|Confirm sale/i],
  ["/sell?mode=list", /Type the shopping list|Add list to cart/i],
  ["/bills", /Bills|Sales/i],
  ["/review", /Review/i],
  ["/whatsapp", /WhatsApp|Money to collect/i],
  ["/tools", /Shop settings|Backup/i],
  ["/crm", /CRM|Lead/i],
  ["/help", /How to use/i],
];

const out = {};
for (const [path, re] of routes) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await dismiss();
  const text = await page.locator("body").innerText();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  out[path] = { ok: re.test(text), overflow, sample: text.replace(/\s+/g, " ").slice(0, 80) };
}

console.log(JSON.stringify({ out, errors }, null, 2));
await browser.close();
const failed = Object.values(out).some((v) => !v.ok || v.overflow);
process.exit(failed || errors.length ? 1 : 0);
