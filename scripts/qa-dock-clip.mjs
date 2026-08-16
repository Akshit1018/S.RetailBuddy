import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const close = page.locator('button[aria-label="Close"]');
if (await close.first().count()) {
  await close.first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
}

const metrics = await page.evaluate(() => {
  const dock = document.querySelector(".floating-dock");
  const bar = document.querySelector(".dock-bar");
  const shell = document.querySelector(".app-shell");
  const dockR = dock?.getBoundingClientRect();
  const barR = bar?.getBoundingClientRect();
  const cs = dock ? getComputedStyle(dock) : null;
  return {
    dockState: shell?.getAttribute("data-dock"),
    opacity: cs?.opacity,
    transform: cs?.transform,
    position: cs?.position,
    display: cs?.display,
    zIndex: cs?.zIndex,
    dockTop: dockR && Math.round(dockR.top),
    dockBottom: dockR && Math.round(dockR.bottom),
    barTop: barR && Math.round(barR.top),
    barBottom: barR && Math.round(barR.bottom),
    innerH: window.innerHeight,
    activeBg: getComputedStyle(
      document.querySelector(".dock-item-active") || document.body,
    ).backgroundColor,
    activeColor: getComputedStyle(
      document.querySelector(".dock-item-active") || document.body,
    ).color,
    barBg: bar ? getComputedStyle(bar).backgroundColor : null,
  };
});
console.log(JSON.stringify(metrics, null, 2));

await page.screenshot({
  path: "/workspace/screenshots/dock-clip-home.png",
  clip: { x: 0, y: 700, width: 390, height: 144 },
});

await page.goto("http://127.0.0.1:8080/sell?mode=product", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(400);
if (await close.first().count()) {
  await close.first().click({ force: true }).catch(() => {});
}
await page.screenshot({
  path: "/workspace/screenshots/dock-clip-sell.png",
  clip: { x: 0, y: 700, width: 390, height: 144 },
});

await page.goto("http://127.0.0.1:8080/stock-in", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
if (await close.first().count()) {
  await close.first().click({ force: true }).catch(() => {});
}
await page.screenshot({
  path: "/workspace/screenshots/dock-clip-more.png",
  clip: { x: 0, y: 700, width: 390, height: 144 },
});

await browser.close();
