import { chromium } from "playwright";
const page = await (await chromium.launch({ headless: true, args: ["--no-sandbox"] })).newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.locator('div[role="dialog"] button[aria-label="Close"]').click();
await page.waitForTimeout(400);
await page.evaluate(() => {
  const shell = document.querySelector(".app-shell");
  shell?.setAttribute("data-dock", "visible");
  const main = document.querySelector("main");
  if (main) main.scrollTop = main.scrollHeight;
});
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/m-home-maxscroll.png" });
const m = await page.evaluate(() => {
  const main = document.querySelector("main");
  const dock = document.querySelector(".floating-dock");
  const dockR = dock.getBoundingClientRect();
  const cards = [...document.querySelectorAll("main .space-y-3\\.5 > *")];
  const last = cards.at(-1);
  const r = last.getBoundingClientRect();
  const cs = getComputedStyle(main);
  return {
    padBottom: cs.paddingBottom,
    scrollTop: main.scrollTop,
    scrollH: main.scrollHeight,
    clientH: main.clientHeight,
    dockTop: Math.round(dockR.top),
    lastBottom: Math.round(r.bottom),
    overlap: r.bottom > dockR.top + 4,
    canScrollMore: main.scrollHeight - main.scrollTop - main.clientHeight,
  };
});
console.log(m);
await page.close();
process.exit(0);
