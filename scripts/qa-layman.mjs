#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://127.0.0.1:8080/", {
  waitUntil: "networkidle",
  timeout: 30000,
});
await page.waitForTimeout(500);
const start = page.getByRole("button", { name: /get started|शुरू/i });
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(800);
}

async function shot(name, path) {
  await page.goto(`http://127.0.0.1:8080${path}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  const text = (await page.locator("body").innerText()).slice(0, 500);
  await page.screenshot({
    path: `/workspace/screenshots/${name}.png`,
    fullPage: false,
  });
  return { name, overflow, text };
}

const results = [];
results.push(await shot("layman-home", "/"));
results.push(await shot("layman-wa", "/whatsapp"));
results.push(await shot("layman-bills", "/bills"));
results.push(await shot("layman-profile", "/profile"));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const menuBtn = page.locator('button[aria-label="Open menu"]').first();
if (await menuBtn.count()) {
  await menuBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "/workspace/screenshots/layman-menu.png",
    fullPage: false,
  });
}

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const closeExp = page.locator('[data-testid="expiry-popup"] button[aria-label]').first();
if (await closeExp.count()) await closeExp.click();
await page.waitForTimeout(300);
await page.screenshot({
  path: "/workspace/screenshots/layman-home-clean.png",
  fullPage: false,
});
const homeText = (await page.locator("body").innerText()).slice(0, 600);
const search = page.locator('input[type="search"]').first();
if (await search.count()) {
  await search.fill("Maggi");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "/workspace/screenshots/layman-search.png",
    fullPage: false,
  });
}

console.log(JSON.stringify({ errors, results, homeText }, null, 2));

await page.goto("http://127.0.0.1:8080/bills", { waitUntil: "networkidle" });
const firstBill = page.locator("button").filter({ hasText: /SS-|INV|Bill|₹/i }).first();
if (await firstBill.count()) {
  await firstBill.click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "/workspace/screenshots/layman-bill-open.png",
    fullPage: false,
  });
}

console.log(JSON.stringify({ errors, results }, null, 2));
await browser.close();
if (errors.length) process.exit(2);
