import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function dismiss() {
  const close = page.locator('button[aria-label="Close"]');
  if (await close.first().count()) {
    await close.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function waitOcr() {
  await page
    .locator("text=/Brightening|Reading|Preparing|Downloading|Starting reader/i")
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await page
    .locator("text=/Read \\d+ line|Could not read|Could not find|Paste the bill/i")
    .first()
    .waitFor({ timeout: 80000 });
  await page.waitForTimeout(400);
}

await page.goto(BASE + "/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await dismiss();
await page.getByTestId("ocr-night").click({ force: true });
await waitOcr();
const inputs = await page.locator("input").evaluateAll((els) =>
  els.map((e) => e.value).filter(Boolean).join(" | "),
);
const body = await page.locator("body").innerText();
await page.screenshot({
  path: "/workspace/screenshots/ocr-dim-night.png",
  fullPage: true,
});
const ok = /Amul|Tata|Maggi|Fortune/i.test(inputs);
console.log(
  JSON.stringify(
    {
      ok,
      note: (body.match(/Read \d+ line[s]?[^\n]*/i) || [])[0] || "",
      inputs: inputs.slice(0, 240),
    },
    null,
    2,
  ),
);
await browser.close();
if (!ok) process.exit(1);
