import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto("http://127.0.0.1:8080");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
// dismiss popup
const close = page.getByRole("dialog").getByRole("button", { name: /^Close$/i });
if (await close.count()) await close.click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/polish-home.png" });
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log({ theme, bg, errors });
// stock in
await page.goto("http://127.0.0.1:8080/stock-in");
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/polish-stockin.png" });
await browser.close();
