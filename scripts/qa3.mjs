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

// multi-role onboarding
await page.getByRole("button", { name: /Select all/i }).click();
await page.locator("#ob-name").fill("Amit Owner");
await page.locator("#ob-shop").fill("Jaipur Mart");
// also toggle maker off and on to prove multi
await page.getByRole("button", { name: /Checker/i }).click(); // off if was on from select all
await page.getByRole("button", { name: /Checker/i }).click(); // on again
await page.getByRole("button", { name: /Start StockScan|Start/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/final-home.png" });

// overflow
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("overflow", overflow);

// help tip
await page.goto(BASE + "/help");
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Feature help" }).nth(0).click();
await page.waitForTimeout(300);
console.log("tips", await page.locator('[role="tooltip"]').count());
await page.screenshot({ path: "/workspace/screenshots/final-help-tip.png" });

// sell flow
await page.goto(BASE + "/sell?mode=product");
await page.waitForTimeout(700);
await page.getByRole("button", { name: /Tata Salt/i }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: /Maggi/i }).click();
await page.waitForTimeout(200);
console.log("cart lines", await page.locator("text=/Cart \\(2\\)/i").count());
// increase qty
const plus = page.getByRole("button").filter({ has: page.locator("svg") }).nth(0);
// submit
await page.getByRole("button", { name: /Submit sale/i }).click();
await page.waitForTimeout(1000);
console.log("bill url", page.url());
await page.screenshot({ path: "/workspace/screenshots/final-bill.png" });

// payment partial
const amt = page.locator('input[type="number"]').first();
await amt.fill("20");
await page.getByRole("button", { name: /Record partial/i }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /On ledger|ledger/i }).first().click();
await page.waitForTimeout(300);
await page.locator("#wa").fill("9876543210");
await page.screenshot({ path: "/workspace/screenshots/final-payment.png" });

// hindi
await page.goto(BASE + "/profile");
await page.waitForTimeout(400);
await page.getByRole("button", { name: /हिन्दी/ }).click();
await page.waitForTimeout(400);
await page.goto(BASE + "/");
await page.waitForTimeout(600);
const hi = await page.locator("body").innerText();
console.log("hindi home", /होम|स्टॉक|फोटो/.test(hi));
await page.screenshot({ path: "/workspace/screenshots/final-hi.png" });

// guest skip
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Skip/i }).click();
await page.waitForTimeout(800);
console.log("guest home", /Guest/i.test(await page.locator("body").innerText()));
await page.screenshot({ path: "/workspace/screenshots/final-guest.png" });

console.log("errors", errors.slice(0, 12));
await browser.close();
