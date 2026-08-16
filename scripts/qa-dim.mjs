import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function dismiss() {
  const close = page.locator('button[aria-label="Close"]');
  if (await close.first().count()) {
    await close.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  const guest = page.getByRole("button", { name: /guest|skip|continue/i });
  if (await guest.first().isVisible().catch(() => false)) {
    await guest.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

function inputsJoined() {
  return page.locator("input").evaluateAll((els) =>
    els.map((e) => e.value).filter(Boolean).join(" | "),
  );
}

async function waitOcr() {
  await page
    .locator("text=/Brightening|Reading|Preparing|Downloading|Starting reader|Matching/i")
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await page
    .locator("text=/Read \\d+ line|Could not read|Could not find|Paste the bill text or add rows/i")
    .first()
    .waitFor({ timeout: 80000 });
  await page.waitForTimeout(500);
}

await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await dismiss();

await page.getByTestId("ocr-dim").click({ force: true, timeout: 8000 });
await waitOcr();
const dimInputs = await inputsJoined();
const dimBody = await page.locator("body").innerText();
const dimOk =
  /Amul|Tata|Maggi|Fortune/i.test(dimInputs) &&
  /Read [3-9] line/i.test(dimBody);
await page.screenshot({
  path: "/workspace/screenshots/ocr-dim-shop.png",
  fullPage: true,
});

await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismiss();
await page.getByTestId("ocr-night").click({ force: true });
await waitOcr();
const nightInputs = await inputsJoined();
const nightBody = await page.locator("body").innerText();
const nightOk =
  /Amul|Tata|Maggi|Fortune/i.test(nightInputs) &&
  /Read [2-9] line/i.test(nightBody);
await page.screenshot({
  path: "/workspace/screenshots/ocr-dim-night.png",
  fullPage: true,
});

await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismiss();
await page.getByTestId("ocr-torch").click({ force: true });
await waitOcr();
const torchInputs = await inputsJoined();
const torchBody = await page.locator("body").innerText();
const torchOk =
  /Amul|Tata|Maggi|Fortune/i.test(torchInputs) &&
  /Read [2-9] line/i.test(torchBody);
await page.screenshot({
  path: "/workspace/screenshots/ocr-dim-torch.png",
  fullPage: true,
});

console.log(
  JSON.stringify(
    {
      dimOk,
      dimNote: (dimBody.match(/Read \d+ line[s]?[^\n]*/i) || [])[0] || "",
      dimInputs: dimInputs.slice(0, 220),
      nightOk,
      nightNote: (nightBody.match(/Read \d+ line[s]?[^\n]*/i) || [])[0] || "",
      torchOk,
      torchNote: (torchBody.match(/Read \d+ line[s]?[^\n]*/i) || [])[0] || "",
      errors,
    },
    null,
    2,
  ),
);

await browser.close();
if (!dimOk) process.exit(1);
