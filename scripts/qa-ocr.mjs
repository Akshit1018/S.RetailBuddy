import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

async function dismissChrome() {
  for (const sel of [
    'div[role="dialog"] button[aria-label="Close"]',
    'button[aria-label="Close"]',
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.count()) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }
}

async function shot(name) {
  await page.screenshot({
    path: `/workspace/screenshots/${name}.png`,
    fullPage: false,
  });
}

function has(text, re) {
  return re.test(text);
}

const report = {};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await dismissChrome();
await shot("ocr-home");
report.home = has(await page.locator("body").innerText(), /StockScan|Today|All features/i);

// --- stock-in: sample bill ---
await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismissChrome();
await page.getByRole("button", { name: /Sample bill/i }).click();
await page.waitForTimeout(400);
await shot("ocr-sample");
const sampleText = await page.locator("body").innerText();
report.sampleLines = /Amul|Maggi|Tata|Fortune|Line items/i.test(sampleText);
report.sampleBadge = /Sample/i.test(sampleText);

// --- stock-in: paste text ---
await page.getByRole("button", { name: /^Paste$/i }).click();
await page.waitForTimeout(200);
await page.locator("#paste-bill").fill(
  "METRO WHOLESALE PVT LTD\nInvoice No: INV-QA-1\nDate: 12/08/2026\nAmul Taaza Toned Milk 1L  12  52\nTata Salt Iodized 1kg  8  22\nMaggi 2-Minute Noodles 70g  20  12",
);
await page.getByRole("button", { name: /Read this text/i }).click();
await page.waitForTimeout(400);
await shot("ocr-paste");
const pasteNames = await page.locator("input").evaluateAll((els) =>
  els.map((e) => e.value).join(" | "),
);
report.pasteMatched = /Amul|Tata Salt|Maggi/i.test(pasteNames);
report.pasteInputs = pasteNames.slice(0, 180);
report.pasteBadge = /Pasted text/i.test(await page.locator("body").innerText());

// catalog pick
const search = page.getByPlaceholder(/Search your stock/i);
await search.fill("Fortune");
await page.waitForTimeout(200);
const fortuneBtn = page.getByRole("button", { name: /Fortune Sunlite/i }).first();
if (await fortuneBtn.count()) {
  await fortuneBtn.click();
  await page.waitForTimeout(200);
}
await shot("ocr-catalog");
report.catalogPick = /Fortune Sunlite/i.test(await page.locator("body").innerText());

await page.getByRole("button", { name: /Add to stock/i }).click();
await page.waitForTimeout(800);
await shot("ocr-review");
report.reviewAfterStockIn = /Review|pending|INV-QA/i.test(
  await page.locator("body").innerText(),
);

// --- sell list: type ---
await page.goto(BASE + "/sell?mode=list", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismissChrome();
await shot("ocr-sell-list");
await page.locator("textarea").first().fill("2 Maggi\n1 Tata salt\nAmul milk");
await page.getByRole("button", { name: /Add list to cart/i }).click();
await page.waitForTimeout(400);
await shot("ocr-sell-list-cart");
const listBody = await page.locator("body").innerText();
report.listCart = /Maggi|Tata Salt|Amul/i.test(listBody) && /Cart \(/.test(listBody);

await page.getByRole("button", { name: /Confirm sale/i }).click();
await page.waitForTimeout(800);
await shot("ocr-sale-done");
report.saleDone = /Bill|Pay|UPI|Share|Print/i.test(await page.locator("body").innerText());

// --- sell product search ---
await page.goto(BASE + "/sell?mode=product", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismissChrome();
await page.getByPlaceholder(/Search stock/i).fill("oil");
await page.waitForTimeout(200);
await shot("ocr-sell-product");
report.productSearch = /Fortune|oil/i.test(await page.locator("body").innerText());

// --- practice OCR (real tesseract) ---
await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await dismissChrome();
await page.getByRole("button", { name: /Try OCR/i }).click();
const ocrOk = await page
  .waitForFunction(
    () => /Live OCR|Read \d+ line|Amul Taaza|Tata Salt|Maggi/i.test(document.body.innerText),
    null,
    { timeout: 70000 },
  )
  .then(() => true)
  .catch(() => false);
await shot("ocr-practice");
const practiceText = await page.locator("body").innerText();
report.practiceOcr = ocrOk && /Live OCR|Amul|Maggi|Tata/i.test(practiceText);
report.practiceNote = (practiceText.match(/Read \d+ line[s]?[^\n]*/i) || [""])[0];

// mobile overflow
report.overflowX = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 2,
);

report.errors = errors.slice(0, 10);
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.sampleLines && report.pasteMatched && report.listCart ? 0 : 1);
