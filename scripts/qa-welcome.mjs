import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto("http://127.0.0.1:8080");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

// Should land on dashboard with popup, no full login
const body = await page.locator("body").innerText();
console.log({
  hasDashboard: /Home|Products|Sell|Stock/i.test(body),
  hasPopup: /Quick setup|optional|Guest/i.test(body),
  hasX: await page.getByRole("button", { name: /^Close$/i }).count() >= 1,
  noFullOnboardStart: !(await page.getByRole("button", { name: /Start StockScan/i }).count()),
});
await page.screenshot({ path: "/workspace/screenshots/welcome-popup.png" });

// Info icon not eye
const infoCount = await page.getByRole("button", { name: /^Info$/i }).count();
console.log("info buttons", infoCount);

// Close with X
await page.getByRole("dialog").getByRole("button", { name: /^Close$/i }).click();
await page.waitForTimeout(400);
console.log("popup gone", await page.getByRole("dialog").count() === 0);
console.log("still home", /Home|Products|Sell/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/welcome-dismissed.png" });

// Fresh: open with OTP flow
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.getByRole("checkbox").check();
await page.locator("#w-phone").fill("9876543210");
await page.getByRole("button", { name: /Send OTP/i }).click();
await page.waitForTimeout(400);
await page.locator("#w-otp").fill("1234");
await page.getByRole("button", { name: /^Verify$/i }).click();
await page.waitForTimeout(300);
await page.locator("#w-name").fill("Amit");
await page.getByRole("button", { name: /Save profile/i }).click();
await page.waitForTimeout(700);
console.log("after save", {
  popup: await page.getByRole("dialog").count(),
  name: /Amit/i.test(await page.locator("body").innerText()),
});
await page.screenshot({ path: "/workspace/screenshots/welcome-saved.png" });

// info tip click
const info = page.getByRole("button", { name: /^Info$/i }).first();
if (await info.count()) {
  await info.click();
  await page.waitForTimeout(200);
  console.log("tooltip", await page.locator('[role=tooltip]').count());
}
console.log("errors", errors.slice(0,5));
await browser.close();
