import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });

await page.goto(BASE + "/shop", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/shop-public.png", fullPage: true });
const shopText = await page.locator("body").innerText();
console.log("shop", { name: /Sharma|Shop|Milk|Maggi/i.test(shopText), sample: shopText.slice(0,90).replace(/\n/g," ") });

const add = page.getByRole("button", { name: /^Add$/i }).first();
await add.click();
await page.waitForTimeout(200);
await page.getByPlaceholder("Your name").fill("Asha");
await page.getByPlaceholder("WhatsApp no.").fill("9123456789");
await page.screenshot({ path: "/workspace/screenshots/shop-cart.png" });

// Build token in page
const token = await page.evaluate(() => {
  const raw = localStorage.getItem("stockscan-v8");
  return raw ? "has-v8" : Object.keys(localStorage);
});
console.log("storage", token);

await page.goto(BASE + "/shop-edit", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const close = page.getByRole("dialog").getByRole("button", { name: /^Close$/i });
if (await close.count()) await close.click();
await page.screenshot({ path: "/workspace/screenshots/shop-qr.png" });

await page.goto(BASE + "/crm", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
console.log("crm", (await page.locator("body").innerText()).slice(0,80).replace(/\n/g," "));
await page.screenshot({ path: "/workspace/screenshots/crm.png" });

await page.goto(BASE + "/orders", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
// import a crafted token
const crafted = await page.evaluate(() => {
  const payload = {
    v: 1,
    name: "Asha",
    phone: "9123456789",
    note: "evening",
    fulfill: "pickup",
    lines: [{ productCode: "MAGGI-2M-70", productName: "Maggi 2-Minute Noodles 70g", quantity: 2, unitPrice: 16 }],
    total: 32,
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  return "SS1." + b64;
});
await page.locator("textarea").fill("Namaste order\n" + crafted);
await page.getByRole("button", { name: /Import order/i }).click();
await page.waitForTimeout(400);
const ot = await page.locator("body").innerText();
console.log("orders", { asha: /Asha/i.test(ot), maggi: /Maggi/i.test(ot) });
await page.screenshot({ path: "/workspace/screenshots/orders.png" });

console.log("errors", [...new Set(errors)].slice(0,10));
await browser.close();
