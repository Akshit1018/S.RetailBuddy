import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
const close = page.getByRole("dialog").getByRole("button", { name: /^Close$/i });
if (await close.count()) await close.click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/all-home.png" });
const body = await page.locator("body").innerText();
console.log("home", { today: /Today|Sales|StockScan/i.test(body), expire: /Expire|Low stock/i.test(body) });

for (const path of ["/suppliers","/returns","/close-day","/tools","/stock-in","/sell?mode=product","/bills"]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const t = await page.locator("body").innerText();
  const blank = t.replace(/\s+/g,"").length < 20;
  console.log(path, { blank, sample: t.slice(0,80).replace(/\n/g," ") });
}
console.log("errors", [...new Set(errors)].slice(0,12));
await page.screenshot({ path: "/workspace/screenshots/all-tools.png" });
await browser.close();
