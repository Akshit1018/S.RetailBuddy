import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

// Onboarding visibility
const startBtn = page.getByRole("button", { name: /Start StockScan|Start|शुरू/i });
const skipBtn = page.getByRole("button", { name: /Skip|Guest|छोड़ें/i });
console.log("start visible", await startBtn.isVisible().catch(()=>false));
console.log("skip visible", await skipBtn.isVisible().catch(()=>false));
console.log("start in viewport", await startBtn.boundingBox().then(b => b && b.y < 844).catch(()=>false));
console.log("skip in viewport", await skipBtn.boundingBox().then(b => b && b.y < 844).catch(()=>false));
await page.screenshot({ path: "/workspace/screenshots/fix-onboard.png", fullPage: true });

// scroll bottom of onboarding
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/fix-onboard-bottom.png" });

// create account
await page.locator("#ob-name").fill("Amit");
await page.locator("#ob-shop").fill("Jaipur Mart");
await startBtn.scrollIntoViewIfNeeded();
await startBtn.click();
await page.waitForTimeout(1000);
console.log("after start url", page.url());
console.log("home?", /Home|All features|Stock/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/fix-home.png" });

// sell fab
const sell = page.getByRole("button", { name: /Open sell|Sell/i });
console.log("sell fab", await sell.count());
if (await sell.count()) {
  await sell.first().click();
  await page.waitForTimeout(400);
  console.log("sell menu", await page.locator("body").innerText().then(t => ({
    bill: /Bill/i.test(t), product: /Product/i.test(t), barcode: /Barcode/i.test(t)
  })));
  await page.screenshot({ path: "/workspace/screenshots/fix-sell-menu.png" });
}

// profile QR
await page.goto(BASE + "/profile");
await page.waitForTimeout(500);
console.log("profile has QR", /QR|Upload/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/fix-profile.png" });

// stock-in
await page.goto(BASE + "/stock-in");
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/fix-stockin.png" });

// bills
await page.goto(BASE + "/bills");
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/fix-bills.png" });

console.log("errors", errors.slice(0,10));
await browser.close();
