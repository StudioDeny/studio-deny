// Captures 1920x1080 stills of the live storefront for the launch video.
// The signup popup is suppressed for this browser session so it doesn't cover the shots.
import { chromium } from "/private/tmp/claude-501/-Users-atchyuthkarri-STUDIO-DENY-PROJECT/f430f2cf-df78-4d1c-8bf3-1eda584691d7/scratchpad/node_modules/playwright/index.mjs";

const OUT = "/Users/atchyuthkarri/STUDIO-DENY-PROJECT/brag-output/work";
const BASE = "http://localhost:5173";
const W = 1920, H = 1080;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem("sd_signup_popup_shown_session", "1"); } catch {}
});
const page = await ctx.newPage();

const settle = async (ms = 2500) => page.waitForTimeout(ms);
const scrollTo = async (y) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
  await settle(1800);
};
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captured", name);
};

// 1. Hook: the hero, as a first-time visitor sees it.
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
await settle(5000);
await scrollTo(0);
await shot("s1-hero");

// 2. Reveal: Best Sellers row.
const bestY = await page.evaluate(() => {
  const h = [...document.querySelectorAll("h2")].find((x) => /BESTSELLERS/i.test(x.innerText));
  return h ? h.getBoundingClientRect().top + window.scrollY - 140 : 1800;
});
await scrollTo(bestY);
await shot("s2-bestsellers");

// 3. Highlight: a product page.
await page.goto(BASE + "/shop", { waitUntil: "networkidle", timeout: 90000 });
await settle(3000);
const href = await page.locator('a[href^="/product/"]').first().getAttribute("href");
await page.goto(BASE + href, { waitUntil: "networkidle", timeout: 90000 });
await settle(4000);
await scrollTo(0);
await shot("s3-product");

// 4. Highlight: the full shop grid.
await page.goto(BASE + "/shop", { waitUntil: "networkidle", timeout: 90000 });
await settle(4000);
await scrollTo(260);
await shot("s4-shop");

await browser.close();
console.log("done");
