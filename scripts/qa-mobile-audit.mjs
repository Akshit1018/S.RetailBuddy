import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function audit(name, path, setup) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate(() => {
    // ensure onboarded
    const raw = localStorage.getItem("stockscan-v4");
    if (!raw) return;
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  // skip guest if needed
  const skip = page.getByRole("button", { name: /Skip/i });
  if (await skip.count()) await skip.click();
  await page.waitForTimeout(600);
  if (setup) await setup(page);
  if (path && path !== "/") await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 1;
    const fixed = [...document.querySelectorAll("*")].filter(el => {
      const s = getComputedStyle(el);
      return s.position === "fixed" || s.position === "sticky";
    }).length;
    // find elements wider than viewport
    const wide = [...document.querySelectorAll("*")].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > window.innerWidth + 2;
    }).slice(0, 8).map(el => ({
      tag: el.tagName,
      cls: (el.className||"").toString().slice(0,60),
      w: Math.round(el.getBoundingClientRect().width),
    }));
    // small tap targets
    const smallBtns = [...document.querySelectorAll("button,a")].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36) && r.bottom < window.innerHeight;
    }).slice(0,6).map(el => ({
      t: (el.innerText||el.getAttribute("aria-label")||"").slice(0,30),
      h: Math.round(el.getBoundingClientRect().height),
      w: Math.round(el.getBoundingClientRect().width),
    }));
    return {
      overflowX,
      docW: doc.scrollWidth,
      winW: window.innerWidth,
      wide,
      smallBtns,
      hasHscroll: doc.scrollWidth > window.innerWidth + 2,
    };
  });
  await page.screenshot({ path: `/workspace/screenshots/m-${name}.png` });
  console.log("\n==", name, path || "", "==");
  console.log(JSON.stringify(metrics, null, 2));
  if (errors.length) console.log("errors", errors.slice(0,5));
  await page.close();
}

await audit("onboard", null, async (page) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
});

// after skip
const page0 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page0.goto(BASE);
await page0.evaluate(() => localStorage.clear());
await page0.reload({ waitUntil: "networkidle" });
await page0.waitForTimeout(400);
await page0.getByRole("button", { name: /Skip/i }).click();
await page0.waitForTimeout(700);
// seed a sale for bills
await page0.goto(BASE + "/sell?mode=product");
await page0.waitForTimeout(500);
const pbtn = page0.getByRole("button", { name: /Tata|Amul|Maggi|Fortune/i }).first();
if (await pbtn.count()) {
  await pbtn.click();
  await page0.getByRole("button", { name: /Submit sale/i }).click();
  await page0.waitForTimeout(800);
}
const saleUrl = page0.url();
await page0.close();

for (const [name, path] of [
  ["home", "/"],
  ["stock", "/stock"],
  ["stockin", "/stock-in"],
  ["sell", "/sell?mode=product"],
  ["bills", "/bills"],
  ["review", "/review"],
  ["profile", "/profile"],
  ["help", "/help"],
]) {
  await audit(name, path, async (page) => {
    // already guest from first? each audit clears - need guest
  });
}

// bill detail
if (saleUrl.includes("/bills/")) {
  await audit("billdetail", saleUrl.replace(BASE, ""));
}

// narrow 320
const pageN = await browser.newPage({ viewport: { width: 320, height: 568 } });
await pageN.goto(BASE);
await pageN.evaluate(() => localStorage.clear());
await pageN.reload({ waitUntil: "networkidle" });
await pageN.waitForTimeout(400);
await pageN.getByRole("button", { name: /Skip/i }).click();
await pageN.waitForTimeout(600);
const m320 = await pageN.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  w: document.documentElement.scrollWidth,
}));
await pageN.screenshot({ path: "/workspace/screenshots/m-320-home.png" });
console.log("\n== 320 home ==", m320);
await pageN.close();

await browser.close();
