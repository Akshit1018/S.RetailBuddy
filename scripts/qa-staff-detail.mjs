import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const fatal = [];
page.on("pageerror", (e) => fatal.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => {
  // keep existing shop if any; just mark splash seen
  const raw = localStorage.getItem("stockscan-v8");
  if (!raw) return;
});
const start = page.getByRole("button", { name: /get started|शुरू करें/i });
if (await start.count()) await start.click();
await page.waitForTimeout(500);
await page.goto("http://127.0.0.1:8080/staff/staff_ramesh", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/staff-ramesh.png" });
const text = await page.locator("body").innerText();
console.log(JSON.stringify({ hasCal: /Attendance|हाजिरी/i.test(text), hasPunch: /Punch/i.test(text), fatal }, null, 2));
await browser.close();
if (fatal.length) process.exit(2);
