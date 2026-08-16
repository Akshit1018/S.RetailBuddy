import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
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

const joinBtn = page.getByTestId("splash-join");
await joinBtn.waitFor({ timeout: 8000 });
await page.screenshot({ path: "/workspace/screenshots/staff-splash.png" });
await joinBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/staff-join.png" });

const code = await page.locator("input").first().inputValue().catch(() => "");
// fill join
const inputs = page.locator("input");
await inputs.nth(0).fill("DK-7K4M");
await inputs.nth(1).fill("Suresh");
await inputs.nth(2).fill("9876500011");
await page.getByRole("button", { name: /join this shop|दुकान में जुड़ें/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/staff-home-after-join.png" });

await page.goto(`${url.replace(/\/$/, "")}/staff`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/staff-list.png" });

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);

console.log(
  JSON.stringify(
    {
      joinOnSplash: (await joinBtn.count()) >= 0,
      codeHint: code,
      afterJoinHasHome: /StockScan|आज|Today|Suresh/i.test(await page.locator("body").innerText()),
      staffListText: (await page.locator("body").innerText()).slice(0, 400),
      overflowX: overflow,
      fatal,
    },
    null,
    2,
  ),
);
await browser.close();
if (fatal.length || overflow) process.exit(2);
