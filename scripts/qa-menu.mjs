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
const homeText = await page.locator("body").innerText();
console.log("no all-features grid", !/How to use|Review bills|Payments/.test(homeText.split("Menu")[0] || homeText));
console.log("has menu btn", await page.getByRole("button", { name: /Open menu/i }).count());
await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/ux-side-menu.png" });
const menu = await page.locator('[role=dialog]').innerText().catch(()=>"");
console.log("menu items", {
  stock: /View stock|Stock/i.test(menu),
  sell: /Sell/i.test(menu),
  bills: /Bills/i.test(menu),
  review: /Review/i.test(menu),
  profile: /Profile/i.test(menu),
  help: /How to use|Help/i.test(menu),
  theme: /Theme|Light|Dark/i.test(menu),
});
// navigate via menu
await page.getByRole("link", { name: /View stock|Stock/i }).first().click();
await page.waitForTimeout(500);
console.log("stock", page.url().includes("/stock"));
// reopen
await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(300);
await page.getByRole("link", { name: /Profile/i }).first().click();
await page.waitForTimeout(500);
console.log("profile", page.url().includes("/profile"));
await page.screenshot({ path: "/workspace/screenshots/ux-profile.png" });
// bottom nav 4
console.log("bottom nav", await page.locator("nav a").count());
console.log("errors", errors);
await browser.close();
