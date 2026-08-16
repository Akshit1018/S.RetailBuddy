import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message || e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

async function shot(name) {
  await page.screenshot({
    path: `/workspace/screenshots/${name}.png`,
    fullPage: false,
  });
}

async function dismissWelcome() {
  for (let i = 0; i < 3; i++) {
    const close = page.locator('button[aria-label="Close"]');
    const n = await close.count();
    if (!n) break;
    await close.last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
  // Also tap guest continue if still up
  const guest = page.getByRole("button", { name: /Guest|अतिथि|Continue/i }).first();
  if (await guest.isVisible().catch(() => false)) {
    await guest.click({ force: true });
    await page.waitForTimeout(250);
  }
}

try {
  await page.goto(base + "/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(800);
  await dismissWelcome();
  await shot("rbac-home");

  const homeText = await page.locator("body").innerText();
  const hasTodayMoney = /₹|Rs|Today|आज/.test(homeText);
  const hasDemoCta = await page.locator('[data-testid="home-demo-cta"]').count();
  if (hasDemoCta) {
    await page.locator('[data-testid="demo-sync-btn"], [data-testid="home-demo-cta"] button').first().click();
    await page.waitForTimeout(500);
  }

  await page.goto(base + "/bills", { waitUntil: "networkidle" });
  await dismissWelcome();
  await page.waitForTimeout(400);
  await shot("rbac-bills");
  const billsText = await page.locator("body").innerText();
  const billsOk = /SS-10|Ravi|Sita|Mohan|Paid|Pending|Overdue|Ledger/.test(billsText);

  await page.goto(base + "/whatsapp", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot("rbac-wa");
  const waText = await page.locator("body").innerText();
  const waOk = /Sita|Mohan|Ravi|₹/.test(waText);

  await page.goto(base + "/review", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot("rbac-review");
  const reviewText = await page.locator("body").innerText();
  const reviewOk = /INV-MET|JD-441|pending|checked|Oreo|Tata/i.test(reviewText);

  await page.goto(base + "/tools", { waitUntil: "networkidle" });
  await dismissWelcome();
  await page.waitForTimeout(400);
  await shot("rbac-tools");
  const toolsText = await page.locator("body").innerText();
  const toolsOk =
    (await page.locator('[data-testid="demo-panel"]').count()) > 0 &&
    (await page.locator('[data-testid="mig-panel"]').count()) > 0 &&
    /v10|Demo shop|Upgrade/.test(toolsText);

  await page.goto(base + "/profile", { waitUntil: "networkidle" });
  await dismissWelcome();
  await page.waitForTimeout(400);
  await shot("rbac-profile");
  const priya = page.locator('[data-testid="role-chip-bar"] button', {
    hasText: "Priya",
  });
  if (await priya.count()) {
    await priya.first().click({ force: true });
    await page.waitForTimeout(300);
  } else {
    await page.getByRole("button", { name: /Priya/ }).first().click({ force: true });
    await page.waitForTimeout(300);
  }

  await page.goto(base + "/stock-in", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot("rbac-stockin-priya");
  const lockCount = await page.locator('[data-testid="role-lock"]').count();

  await page.goto(base + "/profile", { waitUntil: "networkidle" });
  await dismissWelcome();
  await page.waitForTimeout(300);
  const ramesh = page.locator('[data-testid="role-chip-bar"] button', {
    hasText: "Ramesh",
  });
  if (await ramesh.count()) {
    await ramesh.first().click({ force: true });
  } else {
    await page.getByRole("button", { name: /Ramesh/ }).first().click({ force: true });
  }
  await page.goto(base + "/stock-in", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot("rbac-stockin-ramesh");
  const rameshLock = await page.locator('[data-testid="role-lock"]').count();
  const rameshCanAdd = await page.getByText(/Add to stock|Stock in|Photograph|Photo/i).count();

  await page.goto(base + "/close-day", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot("rbac-day-ramesh");
  const dayLock = await page.locator('[data-testid="role-lock"]').count();

  const result = {
    hasTodayMoney,
    billsOk,
    waOk,
    reviewOk,
    toolsOk,
    priyaStockInLocked: lockCount > 0,
    rameshStockInOpen: rameshLock === 0 && rameshCanAdd > 0,
    rameshDayLocked: dayLock > 0,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  const fail =
    !billsOk ||
    !reviewOk ||
    !toolsOk ||
    !result.priyaStockInLocked ||
    !result.rameshStockInOpen ||
    !result.rameshDayLocked ||
    errors.length > 0;
  await browser.close();
  process.exit(fail ? 2 : 0);
} catch (err) {
  console.error(err);
  await browser.close();
  process.exit(1);
}
