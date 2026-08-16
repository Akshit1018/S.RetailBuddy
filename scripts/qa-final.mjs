import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

// language + multi role + start
await page.getByRole("button", { name: /हिन्दी/ }).click();
await page.getByRole("button", { name: /Select all|सभी/i }).click();
await page.locator("#ob-name").fill("Amit");
await page.locator("#ob-shop").fill("Jaipur Mart");
await page.getByRole("button", { name: /शुरू|Start/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/done-home-hi.png" });
console.log("hi home", /होम|स्टॉक/.test(await page.locator("body").innerText()));
console.log("overflow", await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));

// switch en via profile
await page.goto(BASE + "/profile");
await page.waitForTimeout(400);
await page.getByRole("button", { name: /^English$/ }).click();
await page.waitForTimeout(300);

// help tip
await page.goto(BASE + "/help");
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Feature help" }).nth(1).click();
await page.waitForTimeout(200);
console.log("tips", await page.locator('[role="tooltip"]').count());
await page.screenshot({ path: "/workspace/screenshots/done-help-tip.png" });

// sell + payment
await page.goto(BASE + "/sell?mode=product");
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Tata Salt/i }).click();
await page.getByRole("button", { name: /Submit sale/i }).click();
await page.waitForTimeout(900);
console.log("on bill", page.url().includes("/bills/"));
await page.locator('input[type="number"]').first().fill("10");
await page.getByRole("button", { name: /Record partial/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /On ledger|ledger/i }).first().click();
await page.waitForTimeout(200);
await page.locator("#wa").fill("9876543210");
await page.screenshot({ path: "/workspace/screenshots/done-payment.png" });
const payText = await page.locator("body").innerText();
console.log("progress", /Payment progress|10|ledger|On ledger/i.test(payText));

// guest skip
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Skip/i }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/done-guest.png" });
console.log("guest", /Guest/i.test(await page.locator("body").innerText()));

// buckets
await page.getByRole("button", { name: /^Buy$/i }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: /^Expiry$/i }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: /^Expired$/i }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/done-buckets.png" });

console.log("errors", errors);
await browser.close();
