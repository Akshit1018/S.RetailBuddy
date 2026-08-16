import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // Clear storage for fresh onboarding
  await page.goto(BASE + "/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Should see onboarding
  const title = await page.locator("h1").first().textContent();
  console.log("onboarding title:", title);

  // Multi-select roles: tap checker and accountant
  const roleButtons = page.locator("button").filter({ hasText: /Maker|Checker|Accountant|मेकर|चेकर/ });
  const count = await roleButtons.count();
  console.log("role-ish buttons:", count);

  // Find role cards by looking for Select all
  const selectAll = page.getByRole("button", { name: /Select all|सभी/i });
  if (await selectAll.count()) {
    await selectAll.click();
    await page.waitForTimeout(200);
  }

  // Check selected count text
  const selectedText = await page.locator("text=/selected|3 selected/i").first().textContent().catch(() => null);
  console.log("selected roles text:", selectedText);

  // Skip as guest
  const skip = page.getByRole("button", { name: /Skip|Guest|छोड़ें|अतिथि/i }).first();
  await skip.click();
  await page.waitForTimeout(1000);

  // Home should load
  await page.screenshot({ path: "/workspace/screenshots/home-guest.png", fullPage: false });
  const homeBody = await page.locator("body").innerText();
  console.log("home has stock sections:", /Stock|Buy|Expiry|Expired|स्टॉक|खरीद/i.test(homeBody));
  console.log("home has photo stock:", /Photo|Add stock|स्टॉक/i.test(homeBody));

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  });
  console.log("horizontal overflow:", overflow);

  // Nav: Help
  await page.getByRole("link", { name: /Help|मदद/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/workspace/screenshots/help.png", fullPage: false });
  const helpText = await page.locator("body").innerText();
  console.log("help kb:", /Knowledge|How to|कैसे|ज्ञान/i.test(helpText));

  // Eye tip on help
  const eye = page.locator('button[aria-label="Help"]').first();
  if (await eye.count()) {
    await eye.click();
    await page.waitForTimeout(300);
    const tipOpen = await page.locator('[role="tooltip"]').count();
    console.log("help tip open:", tipOpen > 0);
    await page.screenshot({ path: "/workspace/screenshots/help-tip.png", fullPage: false });
  }

  // Profile - language Hindi
  await page.goto(BASE + "/profile");
  await page.waitForTimeout(600);
  const hindi = page.getByRole("button", { name: /हिन्दी/i });
  if (await hindi.count()) {
    await hindi.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "/workspace/screenshots/profile-hi.png", fullPage: false });
  const profileText = await page.locator("body").innerText();
  console.log("hindi profile:", /प्रोफ़ाइल|भाषा|डार्क|लाइट/i.test(profileText));

  // Bills page
  await page.goto(BASE + "/bills");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/workspace/screenshots/bills.png", fullPage: false });

  // Home buckets
  await page.goto(BASE + "/");
  await page.waitForTimeout(500);
  // Click green buy tab
  const buyTab = page.getByRole("button", { name: /Buy|खरीद/i }).first();
  if (await buyTab.count()) {
    await buyTab.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: "/workspace/screenshots/home-green.png", fullPage: false });

  // Sell FAB
  const sellFab = page.getByRole("button", { name: /Open sell/i });
  if (await sellFab.count()) {
    await sellFab.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/workspace/screenshots/sell-fab.png", fullPage: false });
    // product mode
    const product = page.getByRole("button", { name: /Product|प्रोडक्ट|product/i }).first();
    if (await product.count()) {
      await product.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: "/workspace/screenshots/sell-page.png", fullPage: false });
    }
  }

  // Multi-role onboarding test: reset and create with multi roles
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const selectAll2 = page.getByRole("button", { name: /Select all|सभी/i });
  if (await selectAll2.count()) await selectAll2.click();
  await page.locator("#ob-name").fill("Amit Multi");
  await page.locator("#ob-shop").fill("Jaipur Mart");
  await page.getByRole("button", { name: /Start|शुरू/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/workspace/screenshots/home-multi.png", fullPage: false });
  const multiHome = await page.locator("body").innerText();
  console.log("multi profile name:", /Amit Multi|Jaipur/i.test(multiHome));

  // Create a sale quickly via store if sell UI is complex
  const saleOk = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("stockscan-v4");
      return raw ? JSON.parse(raw).state?.profiles?.[0]?.roles : null;
    } catch { return null; }
  });
  console.log("saved roles:", saleOk);

  console.log("PAGE_ERRORS:", errors.slice(0, 15));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
