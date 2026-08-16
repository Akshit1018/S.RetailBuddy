import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function shot(name, path, w=390, h=844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const skip = page.getByRole("button", { name: /Skip/i });
  if (await skip.count()) await skip.click();
  await page.waitForTimeout(600);
  if (path && path !== "/") await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // measure click photo button height if present
  const clickBtn = page.getByRole("button", { name: /Click photo/i }).first();
  let clickH = null;
  if (await clickBtn.count()) {
    const box = await clickBtn.boundingBox();
    clickH = box ? { h: box.height, w: box.width } : null;
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `/workspace/screenshots/m2-${name}.png` });
  console.log(name, { overflow, clickH, errors: errors.slice(0,3) });
  await page.close();
}

await shot("stockin", "/stock-in");
await shot("sell", "/sell?mode=product");
await shot("home", "/");
await shot("home320", "/", 320, 640);
await shot("bills", "/bills");
await browser.close();
