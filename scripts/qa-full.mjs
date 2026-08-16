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
await page.waitForTimeout(700);

// 1. Sticky continue + skip visible without scroll
const start = page.getByRole("button", { name: /Start StockScan|Start|शुरू/i }).first();
const skip = page.getByRole("button", { name: /Skip|Guest|छोड़ें/i }).first();
const startBox = await start.boundingBox();
const skipBox = await skip.boundingBox();
console.log("start y", startBox?.y, "in view", startBox && startBox.y < 820);
console.log("skip y", skipBox?.y, "in view", skipBox && skipBox.y < 844);
await page.screenshot({ path: "/workspace/screenshots/fix2-onboard.png" });

// 2. Skip guest
await skip.click();
await page.waitForTimeout(900);
console.log("home after skip", /Home|All features|Sell/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/fix2-home.png" });

// 3. Sell button labeled Sell
const sellBtn = page.getByRole("button", { name: /Open sell|Sell/i }).first();
const sellText = await sellBtn.innerText();
console.log("sell label", sellText);
await sellBtn.click();
await page.waitForTimeout(400);
const menu = await page.locator("body").innerText();
console.log("three options", {
  bill: /Bill/i.test(menu),
  product: /Product/i.test(menu),
  barcode: /Barcode/i.test(menu),
});
await page.screenshot({ path: "/workspace/screenshots/fix2-sell-menu.png" });

// 4. Product sell flow
await page.getByRole("button", { name: /Product photo|Product/i }).first().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /Tata Salt|Amul|Maggi|Fortune/i }).first().click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: /Submit sale/i }).click();
await page.waitForTimeout(1000);
console.log("on bill detail", page.url().includes("/bills/"));
await page.screenshot({ path: "/workspace/screenshots/fix2-bill.png" });

// payment partial
if (page.url().includes("/bills/")) {
  const num = page.locator('input[type="number"]').first();
  if (await num.count()) {
    await num.fill("10");
    await page.getByRole("button", { name: /Record partial|partial/i }).click();
    await page.waitForTimeout(300);
  }
  await page.locator("#wa").fill("9876543210");
  console.log("wa share", await page.getByRole("button", { name: /Share|WhatsApp/i }).count());
}

// 5. Profile QR upload section
await page.goto(BASE + "/profile");
await page.waitForTimeout(500);
console.log("qr section", /QR|Upload/i.test(await page.locator("body").innerText()));
// inject fake QR
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("stockscan-v4"));
  raw.state.paymentQrDataUrl = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#fff"/><text x="10" y="50" fill="#000">QR</text></svg>');
  localStorage.setItem("stockscan-v4", JSON.stringify(raw));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/fix2-profile-qr.png" });
console.log("qr shown", await page.locator('img[alt="QR"]').count());

// 6. Stock-in OCR demo path (upload tiny png via file input)
await page.goto(BASE + "/stock-in");
await page.waitForTimeout(500);
// create tiny file
const buffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
  "base64",
);
// find file inputs
const inputs = page.locator('input[type=file]');
console.log("file inputs", await inputs.count());
if (await inputs.count()) {
  await inputs.nth(1).setInputFiles({ name: "bill.png", mimeType: "image/png", buffer });
  await page.waitForTimeout(4000); // OCR
  await page.screenshot({ path: "/workspace/screenshots/fix2-stockin-ocr.png" });
  const body = await page.locator("body").innerText();
  console.log("ocr table", /Line items|Add to stock|accuracy|Invoice/i.test(body));
  console.log("proof img", await page.locator('img[alt="Captured bill"]').count());
  const add = page.getByRole("button", { name: /Add to stock/i });
  if (await add.count() && await add.isEnabled()) {
    await add.click();
    await page.waitForTimeout(1000);
    console.log("review after stockin", page.url().includes("/review"));
    await page.screenshot({ path: "/workspace/screenshots/fix2-review.png" });
  }
}

// 7. Review maker-checker
if (page.url().includes("/review") || true) {
  await page.goto(BASE + "/review");
  await page.waitForTimeout(500);
  const check = page.getByRole("button", { name: /Mark checked|check/i });
  if (await check.count()) {
    await check.first().click();
    await page.waitForTimeout(400);
  }
  const verify = page.getByRole("button", { name: /Verify|finalize/i });
  if (await verify.count()) {
    await verify.first().click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "/workspace/screenshots/fix2-review-done.png" });
}

// 8. Create named profile path
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.waitForTimeout(600);
await page.locator("#ob-name").fill("Shop Owner");
await page.getByRole("button", { name: /Select all|सभी/i }).click().catch(()=>{});
await page.getByRole("button", { name: /Start StockScan|Start|शुरू/i }).first().click();
await page.waitForTimeout(900);
console.log("named profile home", /Shop Owner|Home/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/fix2-named.png" });

console.log("errors", errors.slice(0, 12));
await browser.close();
