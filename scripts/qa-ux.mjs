import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.locator('div[role="dialog"] button[aria-label="Close"]').click({ timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/m-home.png" });

await page.evaluate(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTop = main.scrollHeight;
});
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/m-home-bottom.png" });

const metrics = await page.evaluate(() => {
  const main = document.querySelector("main");
  const dock = document.querySelector(".floating-dock");
  const dockR = dock?.getBoundingClientRect();
  const lastVis = main
    ? [...main.children].filter((el) => el.getBoundingClientRect().height > 8).at(-1)
    : null;
  const r = lastVis?.getBoundingClientRect();
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
    dockTop: dockR ? Math.round(dockR.top) : null,
    lastBottom: r ? Math.round(r.bottom) : null,
    lastText: lastVis?.textContent?.replace(/\s+/g, " ").slice(0, 60),
    gap: r && dockR ? Math.round(dockR.top - r.bottom) : null,
    dockState: document.querySelector(".app-shell")?.getAttribute("data-dock"),
    hasQuick: /All features|Stock in|Tools/i.test(document.body.innerText),
  };
});
console.log("HOME BOTTOM", JSON.stringify(metrics, null, 2));

await page.goto(BASE + "/tools", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/m-tools.png" });
const toolsText = await page.locator("body").innerText();
console.log("TOOLS", {
  settings: /Shop settings|Near-expiry/i.test(toolsText),
  gstr: /GSTR/i.test(toolsText),
});

await page.goto(BASE + "/sell?mode=product", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/m-sell.png" });

await page.goto(BASE + "/whatsapp", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/m-wa.png" });
console.log("WA statement", /Party statements|Statement/i.test(await page.locator("body").innerText()));

if (errors.length) console.log("ERRORS", errors.slice(0, 8));
else console.log("NO CONSOLE ERRORS");
await browser.close();
