import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function dismiss() {
  const close = page.locator('button[aria-label="Close"]');
  if (await close.first().count()) {
    await close.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function dockInfo() {
  return page.evaluate(() => {
    const shell = document.querySelector(".app-shell");
    const dock = document.querySelector(".floating-dock");
    const bar = document.querySelector(".dock-bar");
    const items = [...document.querySelectorAll(".dock-item")];
    const shellR = shell?.getBoundingClientRect();
    const dockR = dock?.getBoundingClientRect();
    const barR = bar?.getBoundingClientRect();
    const active = items
      .filter((el) => el.classList.contains("dock-item-active"))
      .map((el) => el.textContent?.replace(/\s+/g, " ").trim());
    return {
      itemCount: items.length,
      active,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
      shellLeft: shellR ? Math.round(shellR.left) : null,
      dockLeft: dockR ? Math.round(dockR.left) : null,
      barLeft: barR ? Math.round(barR.left) : null,
      barWidth: barR ? Math.round(barR.width) : null,
      shellWidth: shellR ? Math.round(shellR.width) : null,
      barCentered:
        shellR && barR
          ? Math.abs(shellR.left + shellR.width / 2 - (barR.left + barR.width / 2)) < 4
          : false,
      labels: items.map((el) => el.textContent?.replace(/\s+/g, " ").trim()),
    };
  });
}

const pages = [
  ["/", "dock-home.png"],
  ["/stock-in", "dock-stockin.png"],
  ["/sell?mode=product", "dock-sell.png"],
  ["/bills", "dock-bills.png"],
];

const results = {};
for (const [path, file] of pages) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await dismiss();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/workspace/screenshots/${file}` });
  results[path] = await dockInfo();
}

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
