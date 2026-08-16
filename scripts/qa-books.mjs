import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// dismiss splash / welcome if present
for (const label of ["Get Started", "शुरू करें"]) {
  const btn = page.getByRole("button", { name: label });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(400);
  }
}
const closeWelcome = page.locator("[data-testid=welcome-popup] button, button[aria-label='Close']").first();
if (await page.locator("[data-testid=welcome-popup]").count()) {
  await page.locator("[data-testid=welcome-popup] button").first().click().catch(() => {});
}

await page.screenshot({ path: "/workspace/screenshots/books-home.png", fullPage: false });

const bell = page.locator("[data-testid=notice-bell]");
if (!(await bell.count())) throw new Error("notice bell missing");
await bell.click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/books-bell.png", fullPage: false });
const panel = page.locator("[data-testid=notice-panel]");
if (!(await panel.count())) throw new Error("notice panel missing");
const panelText = await panel.innerText();
await page.locator("button[aria-label='Close']").first().click().catch(() => {});
await page.keyboard.press("Escape").catch(() => {});
// click overlay
await page.locator("button.fixed.inset-0").click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);

await page.goto(BASE + "/bills", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/books-bills.png", fullPage: false });
const papers = await page.getByText("Bill paper").count();

await page.goto(BASE + "/bills/sale_demo_ledger", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/books-emi.png", fullPage: true });
const emi = await page.locator("[data-testid=installment-plan]").count();
const fmt = await page.locator("[data-testid=bill-format-picker]").count();

await page.goto(BASE + "/staff/staff_sunita", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/books-salary.png", fullPage: true });
const slip = await page.locator("[data-testid=salary-slip]").count();

await page.goto(BASE + "/ca", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/books-ca.png", fullPage: true });
const ca = await page.locator("[data-testid=ca-pack]").count();

await page.goto(BASE + "/profile", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/books-profile.png", fullPage: false });

console.log(
  JSON.stringify(
    {
      errors: errors.slice(0, 8),
      panelText: panelText.slice(0, 200),
      papers,
      emi,
      fmt,
      slip,
      ca,
    },
    null,
    2,
  ),
);

if (errors.length) {
  console.error("CONSOLE", errors);
}
if (!emi || !fmt || !slip || !ca) {
  process.exitCode = 1;
}

await browser.close();
