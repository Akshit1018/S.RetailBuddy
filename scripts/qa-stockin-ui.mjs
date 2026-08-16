import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const close = page.locator('button[aria-label="Close"]');
if (await close.first().count()) {
  await close.first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
}
const text = await page.locator("body").innerText();
await page.screenshot({
  path: "/workspace/screenshots/ocr-lowlight-ui.png",
});
console.log({
  dimBtn: /Test dim light/i.test(text),
  shopCopy: /shop lamps|phone torch/i.test(text),
});
await browser.close();
