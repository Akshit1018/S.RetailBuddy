import { chromium } from "playwright";
const page = await (await chromium.launch({ headless: true, args: ["--no-sandbox"] })).newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.locator('div[role="dialog"] button[aria-label="Close"]').click();
await page.waitForTimeout(400);
const main = page.locator("main");
await main.evaluate((el) => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(200);
// nudge up to reveal dock
await main.evaluate((el) => { el.scrollTop = Math.max(0, el.scrollTop - 80); });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/m-home-scrolled.png" });
const m = await page.evaluate(() => {
  const dock = document.querySelector(".floating-dock");
  const dockR = dock.getBoundingClientRect();
  const cards = [...document.querySelectorAll("main .space-y-3\\.5 > *")];
  const last = cards.at(-1);
  const r = last?.getBoundingClientRect();
  const hidden = document.querySelector(".app-shell")?.getAttribute("data-dock");
  return {
    hidden,
    dockTop: Math.round(dockR.top),
    lastBottom: r ? Math.round(r.bottom) : null,
    lastCls: last?.className?.toString().slice(0, 50),
    overlap: r ? r.bottom > dockR.top + 8 : null,
    overflowX: document.documentElement.scrollWidth > 392,
  };
});
console.log(m);
await page.close();
process.exit(0);
