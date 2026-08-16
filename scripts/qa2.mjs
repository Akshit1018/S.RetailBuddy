import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });

// Seed guest state
await page.goto(BASE);
await page.evaluate(() => {
  const state = {
    state: {
      theme: "dark",
      locale: "en",
      onboardingDone: true,
      profiles: [{ id: "g1", name: "Guest", roles: ["maker","checker","accountant"], isGuest: true, createdAt: new Date().toISOString() }],
      activeProfileId: "g1",
      products: [
        { id:"p1", code:"TATA-SALT-1K", name:"Tata Salt", quantity:50, pendingQuantity:0, unitCost:22, unitPrice:28, reorderLevel:10, lastUpdated: new Date().toISOString() },
        { id:"p2", code:"MAGGI-2M-70", name:"Maggi", quantity:5, pendingQuantity:0, unitCost:12, unitPrice:16, reorderLevel:40, lastUpdated: new Date().toISOString() },
      ],
      invoices: [],
      sales: [],
      customers: [{ id:"c1", customerNo:"C-1001", name:"Ravi", whatsapp:"9876543210", phone:null, address:null, notes:null, createdAt: new Date().toISOString() }],
      customerSeq: 1002,
      paymentQrDataUrl: null,
    },
    version: 4,
  };
  localStorage.setItem("stockscan-v4", JSON.stringify(state));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/qa-home.png" });

// open sell product
await page.getByRole("button", { name: /Open sell/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Product photo/i }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/qa-sell.png" });
console.log("sell url", page.url());
console.log("sell text sample", (await page.locator("body").innerText()).slice(0, 400));

// add product if UI allows
const addBtns = page.locator("button").filter({ hasText: /Add|\\+|next/i });
console.log("add-like buttons", await addBtns.count());

// Go help and tip
await page.goto(BASE + "/help");
await page.waitForTimeout(500);
const eyes = page.locator('button[aria-label="Help"]');
console.log("eye count", await eyes.count());
await eyes.nth(1).click({ force: true });
await page.waitForTimeout(400);
console.log("tooltips", await page.locator('[role="tooltip"]').count());
const tipText = await page.locator('[role="tooltip"]').first().textContent().catch(()=>null);
console.log("tip:", tipText?.slice(0,120));
await page.screenshot({ path: "/workspace/screenshots/qa-help-tip.png" });

// Create sale via evaluate store if window exposes - not exposed. Use UI.
// Navigate sell product mode with search params
await page.goto(BASE + "/sell?mode=product");
await page.waitForTimeout(800);
const body = await page.locator("body").innerText();
console.log("sell page:", body.includes("Cart") || body.includes("Submit"));
// click first product row if present
const productRow = page.locator("button, [role=button]").filter({ hasText: /Tata|Maggi|Salt/i }).first();
if (await productRow.count()) {
  await productRow.click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: "/workspace/screenshots/qa-sell2.png" });

// bills after manual sale injection
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("stockscan-v4"));
  const s = raw.state;
  const now = new Date().toISOString();
  s.sales = [{
    id: "sale1", mode: "product",
    lines: [{ productId:"p1", productCode:"TATA-SALT-1K", productName:"Tata Salt", quantity:2, unitCost:22, unitPrice:28 }],
    totalRevenue: 56, totalCost: 44, profit: 12, createdAt: now,
    soldByProfileId: "g1", soldByName: "Guest", soldByRoles: ["maker","checker","accountant"],
    customerId: "c1", customerSnapshot: { customerNo:"C-1001", name:"Ravi", whatsapp:"9876543210" },
    billNo: "SO-10000", invoiceId: "inv1",
    paymentStatus: "pending", amountPaid: 0, payments: [], lastPaymentCheckAt: now, paymentUpdatedAt: now, ledgerActive: false,
  }];
  s.products[0].quantity = 48;
  localStorage.setItem("stockscan-v4", JSON.stringify(raw));
});
await page.goto(BASE + "/bills");
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/qa-bills-sale.png" });
await page.getByText("SO-10000").click();
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/qa-bill-detail.png" });
// partial payment
const amount = page.getByPlaceholder(/Amount paid|amount/i).or(page.locator('input[type=number]').first());
await amount.fill("25");
await page.getByRole("button", { name: /Record partial|partial/i }).click();
await page.waitForTimeout(400);
// ledger
await page.getByRole("button", { name: /On ledger|ledger/i }).first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/qa-payment.png" });

// WhatsApp field
await page.locator("#wa").fill("9876543210");
console.log("wa share button", await page.getByRole("button", { name: /Share|WhatsApp/i }).count());

// light theme
await page.goto(BASE + "/profile");
await page.waitForTimeout(400);
await page.getByRole("button", { name: /^Light$/i }).click();
await page.waitForTimeout(300);
await page.goto(BASE + "/");
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/qa-light.png" });

console.log("errors", errors.slice(0,10));
await browser.close();
