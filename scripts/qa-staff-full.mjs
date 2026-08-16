import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const origin = url.replace(/\/$/, "");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const fatal = [];
const failed = [];
page.on("pageerror", (e) => fatal.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") fatal.push(`console: ${msg.text()}`);
});

const shot = (name) => page.screenshot({ path: `/workspace/screenshots/${name}.png` });
const text = async () => page.locator("body").innerText();
const overflow = () =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

const joinBtn = page.getByTestId("splash-join");
await joinBtn.waitFor({ timeout: 8000 });
const splashHasJoin = (await joinBtn.innerText()).trim();
await shot("staff-splash");
await joinBtn.click();
await page.waitForTimeout(400);
await shot("staff-join");

await page.locator("input").nth(0).fill("DK-7K4M");
await page.locator("input").nth(1).fill("Suresh");
await page.locator("input").nth(2).fill("9876500011");
await page.getByRole("button", { name: /join this shop|दुकान में जुड़ें/i }).click();
await page.waitForTimeout(900);
await shot("staff-home-after-join");

await page.goto(`${origin}/staff`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const listText = await text();
const makerCanHire = /Hire staff|स्टाफ जोड़ें/i.test(listText);
await shot("staff-list");
if (makerCanHire) failed.push("joined maker should not see Hire");

const ramesh = page.getByTestId("staff-card-staff_ramesh");
await ramesh.waitFor({ timeout: 8000 });
await ramesh.click();
await page.waitForTimeout(600);
const detailText = await text();
const hasCal = /Attendance|हाजिरी/i.test(detailText);
const hasPunch = /Punch in|आना/i.test(detailText);
await shot("staff-ramesh");
if (!hasCal) failed.push("staff detail missing calendar");
if (!hasPunch) failed.push("staff detail missing punch");

await page.getByTestId("staff-punch-in").click();
await page.waitForTimeout(400);
await shot("staff-ramesh-punched");

// owner path: reset to guest via get started
await page.evaluate(() => {
  const raw = localStorage.getItem("stockscan-v8");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const st = parsed.state || parsed;
    st.splashSeen = true;
    st.welcomeDismissed = true;
    const guest = (st.profiles || []).find((p) => p.isGuest);
    if (guest) st.activeProfileId = guest.id;
    else {
      const acc = (st.profiles || []).find((p) => (p.roles || []).includes("accountant"));
      if (acc) st.activeProfileId = acc.id;
    }
    localStorage.setItem("stockscan-v8", JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
});
await page.goto(`${origin}/staff`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
// dismiss welcome if present
const welcomeX = page.getByRole("button", { name: /^×$|^x$|close|dismiss/i });
if (await welcomeX.count()) {
  await welcomeX.first().click().catch(() => {});
}
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(300);
const ownerList = await text();
const ownerCanHire = /Hire staff|स्टाफ जोड़ें/i.test(ownerList);
await shot("staff-list-owner");
if (!ownerCanHire) failed.push("owner should see Hire");

await page.getByTestId("staff-card-staff_ramesh").click();
await page.waitForTimeout(500);
const ownerDetail = await text();
const hasPerms = /What they can do|Discount allowed|See stock/i.test(ownerDetail);
await shot("staff-ramesh-owner");
if (!hasPerms) failed.push("owner detail missing permissions");

await page.goto(`${origin}/sell?mode=product`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const sellText = await text();
const hasDisc = /Discount %|छूट/i.test(sellText);
const hasCollect = /Collect payment|Shop QR|Send pay link|पे लिंक/i.test(sellText);
await shot("staff-sell");
if (!hasDisc) failed.push("sell missing discount");
if (!hasCollect) failed.push("sell missing collect pay");

// add first product and submit if possible
const addBtn = page.locator("button").filter({ hasText: /left/i }).first();
if (await addBtn.count()) {
  await addBtn.click();
  await page.waitForTimeout(200);
  const submit = page.getByRole("button", { name: /confirm sale|बिक्री पक्की|submit/i });
  if (await submit.count()) {
    await submit.click();
    await page.waitForTimeout(800);
    await shot("staff-bill");
    const billText = await text();
    const hasProof = /Upload photo proof|पेमेंट प्रूफ|Capture it|Payment proof/i.test(billText);
    const hasSend = /Send pay link|पे लिंक/i.test(billText);
    if (!hasProof) failed.push("bill missing proof upload");
    if (!hasSend) failed.push("bill missing send pay link");

    // create a pay link via store and open it
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem("stockscan-v8");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const st = parsed.state || parsed;
      const sale = (st.sales || [])[0];
      const tok = "qa7k4m";
      st.payLinks = [
        {
          id: "plink_qa",
          token: tok,
          saleId: sale?.id || null,
          amount: sale?.totalRevenue || 120,
          customerPhone: "9876500011",
          createdByProfileId: st.activeProfileId,
          createdAt: new Date().toISOString(),
        },
        ...(st.payLinks || []),
      ];
      localStorage.setItem("stockscan-v8", JSON.stringify(parsed));
      return tok;
    });
    if (token) {
      await page.goto(`${origin}/pay/${token}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      await shot("staff-paylink");
      const payText = await text();
      if (!/Pay this shop|UPI/i.test(payText)) failed.push("pay link page missing QR/UPI");
    }
  }
}

const ov = await overflow();
if (ov) failed.push("horizontal overflow");

const result = {
  splashHasJoin,
  hasCal,
  hasPunch,
  ownerCanHire,
  hasPerms,
  hasDisc,
  hasCollect,
  overflowX: ov,
  failed,
  fatal: fatal.slice(0, 12),
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (fatal.length || failed.length) process.exit(2);
