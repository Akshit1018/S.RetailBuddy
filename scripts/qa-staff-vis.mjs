import { chromium } from "playwright";

const origin = "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const fatal = [];
page.on("pageerror", (e) => fatal.push(String(e)));

await page.goto(origin, { waitUntil: "networkidle" });
const start = page.getByTestId("splash-start");
if (await start.count()) await start.click();
await page.waitForTimeout(600);
const x = page.getByRole("button", { name: /close|dismiss/i });
if (await x.count()) await x.first().click().catch(() => {});
await page.keyboard.press("Escape").catch(() => {});

await page.goto(`${origin}/staff/staff_ramesh`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const heading = page.getByText(/Name, pay, permissions|What they can do/i).first();
console.log("perms count", await heading.count());
if (await heading.count()) await heading.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/staff-ramesh-perms.png" });

const saleId = await page.evaluate(() => {
  const raw = localStorage.getItem("stockscan-v8");
  const st = JSON.parse(raw).state || JSON.parse(raw);
  return st.sales?.[0]?.id || null;
});
if (saleId) {
  await page.goto(`${origin}/bills/${saleId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const proof = page.getByText(/Payment proof/i).first();
  console.log("proof count", await proof.count());
  if (await proof.count()) await proof.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "/workspace/screenshots/staff-bill-proof.png" });
}
console.log(JSON.stringify({ saleId, fatal, url: page.url() }, null, 2));
await browser.close();
