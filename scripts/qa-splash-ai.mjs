import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const fatal = [];
page.on("pageerror", (e) => fatal.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);

const start = page.getByRole("button", { name: /get started|शुरू करें/i });
await start.waitFor({ timeout: 15000 });
const splashText = await page.locator("body").innerText();
await page.screenshot({ path: `${outDir}/splash.png`, fullPage: true });

await start.click();
await page.waitForTimeout(1000);
const enable = page.getByTestId("ai-enable-btn");
await enable.waitFor({ timeout: 10000 });
await page.screenshot({ path: `${outDir}/home-after-splash.png`, fullPage: true });

await enable.click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${outDir}/home-ai-on.png`, fullPage: true });
const aiText = await page.locator("body").innerText();

const desktop = await browser.newPage({
  viewport: { width: 1280, height: 800 },
});
await desktop.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await desktop.waitForTimeout(800);
await desktop.screenshot({ path: `${outDir}/home-desktop.png` });

const result = {
  splashHasTitle: /Track Your Sales|बिक्री आसानी/i.test(splashText),
  splashHasSignIn: /Sign in|साइन इन/i.test(splashText),
  homeHasEnable: (await enable.count()) >= 0,
  aiPanel: await page.getByTestId("ai-panel").count(),
  hasBuy: /Buy more|और खरीदें/i.test(aiText),
  hasSkip: /Do not buy|मत खरीदें/i.test(aiText),
  hasBrands: /Maggi|Amul|Haldiram|Tata Tea/i.test(aiText),
  fatal,
};
console.log(JSON.stringify(result, null, 2));

await browser.close();
if (fatal.length || !result.splashHasTitle || !result.aiPanel) process.exit(2);
