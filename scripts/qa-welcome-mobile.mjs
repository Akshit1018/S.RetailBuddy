import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(width, height, name) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const fatal = [];
  page.on("pageerror", (e) => fatal.push(String(e)));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const splash = page.getByTestId("onboarding-screen");
  await splash.waitFor({ timeout: 8000 });
  await page.screenshot({
    path: `/workspace/screenshots/${name}-splash.png`,
    fullPage: false,
  });

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const btn = document.querySelector("[data-testid='splash-start']");
    const r = btn?.getBoundingClientRect();
    return {
      overflowX: de.scrollWidth > de.clientWidth + 1,
      startVisible: !!(r && r.top >= 0 && r.bottom <= window.innerHeight + 1),
      title: document.querySelector("h1")?.textContent ?? "",
    };
  });

  await page.close();
  return { width, height, ...metrics, fatal };
}

const r390 = await shot(390, 844, "w-390");
const r320 = await shot(320, 568, "w-320");
const r430 = await shot(430, 932, "w-430");
console.log(JSON.stringify({ r390, r320, r430 }, null, 2));
await browser.close();

const bad = [r390, r320, r430].some(
  (r) => r.overflowX || !r.startVisible || r.fatal.length,
);
if (bad) process.exit(2);
