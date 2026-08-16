import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });

await page.goto(BASE + "/connect", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const close = page.getByRole("dialog").getByRole("button", { name: /^Close$/i });
if (await close.count()) await close.click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/workspace/screenshots/connect.png", fullPage: true });
const body = await page.locator("body").innerText();
console.log("connect has", {
  copilot: /Shop copilot|kitna/i.test(body),
  weather: /Weather|°|Hot|Pleasant|Rain/i.test(body),
  barcode: /Open Food|Barcode/i.test(body),
  holidays: /holiday|Diwali|Republic|Next/i.test(body),
});

await page.getByPlaceholder("kitna Maggi").fill("kitna Maggi");
await page.getByRole("button", { name: /^Ask$/i }).click();
await page.waitForTimeout(300);
const after = await page.locator("body").innerText();
console.log("copilot", /Maggi|units|stock/i.test(after));

await page.getByRole("button", { name: /Look up/i }).first().click();
await page.waitForTimeout(4000);
const afterOff = await page.locator("body").innerText();
console.log("off", /Fortune|oil|Sunlite|Not in|Network|Add to catalogue/i.test(afterOff), afterOff.includes("Add to catalogue"));

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/workspace/screenshots/home-insight.png" });
console.log("errors", [...new Set(errors)].slice(0,8));
await browser.close();
