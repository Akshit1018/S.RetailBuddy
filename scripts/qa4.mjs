import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", e => console.log("PAGEERR", e.message));
page.on("console", m => { if (m.type()==="error") console.log("CONERR", m.text()); });

await page.goto(BASE);
// seed guest with sale
await page.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem("stockscan-v4", JSON.stringify({
    state: {
      theme: "dark", locale: "en", onboardingDone: true,
      profiles: [{ id: "g1", name: "Guest", roles: ["maker","checker","accountant"], isGuest: true, createdAt: now }],
      activeProfileId: "g1",
      products: [{ id:"p1", code:"TATA", name:"Tata Salt", quantity:48, pendingQuantity:0, unitCost:22, unitPrice:28, reorderLevel:10, lastUpdated: now }],
      invoices: [],
      sales: [{
        id: "sale1", mode: "product",
        lines: [{ productId:"p1", productCode:"TATA", productName:"Tata Salt", quantity:2, unitCost:22, unitPrice:28 }],
        totalRevenue: 56, totalCost: 44, profit: 12, createdAt: now,
        soldByProfileId: "g1", soldByName: "Guest", soldByRoles: ["maker","checker","accountant"],
        customerSnapshot: { customerNo:"C-1", name:"Ravi", whatsapp:"9876543210" },
        billNo: "SO-10000", invoiceId: "inv1",
        paymentStatus: "pending", amountPaid: 0, payments: [],
        lastPaymentCheckAt: now, paymentUpdatedAt: now, ledgerActive: false,
      }],
      customers: [], customerSeq: 1001, paymentQrDataUrl: null,
    },
    version: 4,
  }));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("home", (await page.locator("h1").first().textContent()));

await page.goto(BASE + "/bills/sale1");
await page.waitForTimeout(1000);
const body = await page.locator("body").innerText();
console.log("bill body:\n", body.slice(0, 900));
await page.screenshot({ path: "/workspace/screenshots/debug-bill.png", fullPage: true });
console.log("inputs", await page.locator("input").count());
console.log("number inputs", await page.locator('input[type=number]').count());

// help tip debug
await page.goto(BASE + "/help");
await page.waitForTimeout(600);
const eyeCount = await page.locator('button[aria-label="Feature help"]').count();
console.log("eyes", eyeCount);
const r = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Feature help"]');
  if (!btn) return "no btn";
  btn.click();
  return {
    expanded: btn.getAttribute("aria-expanded"),
    tooltips: document.querySelectorAll('[role="tooltip"]').length,
    html: btn.parentElement?.innerHTML?.slice(0, 200),
  };
});
console.log("tip eval", r);
await page.waitForTimeout(200);
console.log("tooltips after", await page.locator('[role="tooltip"]').count());
await page.screenshot({ path: "/workspace/screenshots/debug-help.png" });

await browser.close();
