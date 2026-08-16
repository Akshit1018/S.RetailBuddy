import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
const start = page.getByRole("button", { name: /Start StockScan|Start/i }).first();
const skip = page.getByRole("button", { name: /Skip/i }).first();
const sb = await start.boundingBox();
const kb = await skip.boundingBox();
console.log({ start: sb, skip: kb, startIn: sb && sb.y + sb.height <= 844, skipIn: kb && kb.y + kb.height <= 844 });
await page.screenshot({ path: "/workspace/screenshots/fix3-onboard.png" });
// no name submit should toast not leave
await start.click();
await page.waitForTimeout(400);
console.log("still onboard", /Set up|Start StockScan|name/i.test(await page.locator("body").innerText()));
await page.locator("#ob-name").fill("Ravi");
await start.click();
await page.waitForTimeout(900);
console.log("reached home", /Home|All features|Ravi/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/fix3-home.png" });
// sell
const sell = page.getByRole("button", { name: /Sell/i }).first();
console.log("sell text", await sell.innerText());
await sell.click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/fix3-sell.png" });
await browser.close();
