import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto("http://127.0.0.1:8080");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Skip/i }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/ux-home-clean.png" });

// open menu
await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/ux-side-menu.png" });

// click View stock specifically inside dialog
const dialog = page.getByRole("dialog");
await dialog.getByRole("link", { name: /^View stock/i }).click();
await page.waitForTimeout(600);
console.log("stock url", page.url());
console.log("menu closed", await page.getByRole("dialog").count() === 0);

await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(300);
await page.getByRole("dialog").getByRole("link", { name: /^Profile/i }).click();
await page.waitForTimeout(500);
console.log("profile url", page.url());
await page.screenshot({ path: "/workspace/screenshots/ux-profile.png" });

await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(300);
await page.getByRole("dialog").getByRole("link", { name: /^How to use|^Help/i }).click();
await page.waitForTimeout(500);
console.log("help url", page.url());

console.log("bottom nav", await page.locator("nav a").count());
console.log("errors", errors);
await browser.close();
