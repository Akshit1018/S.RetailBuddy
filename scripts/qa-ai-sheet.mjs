import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const fatal = [];
page.on("pageerror", (e) => fatal.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(800);
const start = page.getByRole("button", { name: /get started|शुरू करें/i });
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(600);
}

const homeHasCard = await page.getByTestId("ai-enable").count();
const icon = page.getByTestId("ai-header-btn");
await icon.waitFor({ timeout: 8000 });
await page.screenshot({ path: "/workspace/screenshots/home-ai-icon.png" });
await icon.click();
await page.getByTestId("ai-sheet").waitFor({ timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/ai-sheet.png" });
const sheetText = await page.getByTestId("ai-sheet").innerText();
await page.getByTestId("ai-sheet-close").click();
await page.waitForTimeout(300);
const sheetGone = (await page.getByTestId("ai-sheet").count()) === 0;

const result = {
  homeHasEnableCard: homeHasCard,
  iconPresent: (await icon.count()) > 0,
  sheetHadBuy: /Buy more|और खरीदें/i.test(sheetText),
  sheetClosed: sheetGone,
  fatal,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (fatal.length || homeHasCard || !result.sheetHadBuy || !sheetGone) process.exit(2);
