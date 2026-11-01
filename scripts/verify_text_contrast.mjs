// Measures the real contrast of every visible text node in a running app.
//
//   BASE_URL=http://localhost:3100 QA_EMAIL=a@b QA_PASSWORD=x \
//     node scripts/verify_text_contrast.mjs dashboard market
//
// DARK=1 forces dark mode, WIDTHS=1440,390 sets the viewports, OUT=file writes
// JSONL. Text over an image or gradient is counted as unknown, not as a pass.
// Exits 1 when any text is under WCAG AA or a page scrolls sideways.
import { appendFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const DARK = process.env.DARK === "1";
const WIDTHS = (process.env.WIDTHS ?? "1440").split(",").map(Number);
const routes = process.argv.slice(2);

const probe = () => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (color) => {
    if (cache.has(color)) return cache.get(color);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const out = [r, g, b, a / 255];
    cache.set(color, out);
    return out;
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const backdrop = (el) => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage !== "none") return null;
      const bg = rgba(cs.backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] === 1) break;
    }
    return layers.reduceRight((under, top) => over(top, under), [255, 255, 255, 1]);
  };
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  let checked = 0;
  let unknown = 0;
  let lowChars = 0;
  const low = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text.length < 2) continue;
    const el = walker.currentNode.parentElement;
    if (!el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    if (el.closest(':disabled,[aria-disabled="true"],[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    range.selectNodeContents(walker.currentNode);
    const box = range.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    let opacity = 1;
    for (let node = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    // The Google button overlay is opacity 0.001 by design: nobody sees that text.
    if (opacity < 0.05) continue;
    const bg = backdrop(el);
    if (!bg) {
      unknown += text.length;
      continue;
    }
    checked += text.length;
    const fg = rgba(cs.color);
    const contrast = ratio(over([fg[0], fg[1], fg[2], fg[3] * opacity], bg), bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    if (contrast >= (large ? 3 : 4.5)) continue;
    lowChars += text.length;
    const classes = typeof el.className === "string"
      ? el.className.split(/\s+/).filter((c) => /^(text-|bg-|dark:text-)/.test(c)).join(" ")
      : el.tagName;
    const key = `${contrast.toFixed(2)} ${classes}`.slice(0, 90);
    low[key] = low[key] ?? { n: 0, ex: text.slice(0, 40) };
    low[key].n += text.length;
  }
  return {
    url: location.pathname,
    checked,
    unknown,
    lowChars,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    low: Object.entries(low).sort((a, b) => b[1].n - a[1].n).slice(0, 12),
  };
};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.locator('input[name="email"]').isVisible()); i++) {
    await page.click('button[aria-controls="email-login-panel"]');
    await page.waitForTimeout(1500);
  }
  await page.fill('input[name="email"]', process.env.QA_EMAIL);
  await page.fill('input[name="password"]', process.env.QA_PASSWORD);
  await page.click('#email-login-panel button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000, waitUntil: "commit" });
  await page.waitForTimeout(2500);
}

async function settle(page) {
  let last = -1;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({
      n: document.body.innerText.length,
      busy: document.querySelectorAll(".animate-spin, .animate-pulse").length,
    }));
    if (s.n === last && s.busy === 0 && s.n > 0) return;
    last = s.n;
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
// The theme script in app/layout.tsx reads this key before the first paint.
if (DARK) await context.addInitScript(() => localStorage.setItem("breadtrans-theme", "dark"));
const page = await context.newPage();
if (process.env.QA_EMAIL) await login(page);

let failed = 0;
for (const route of routes) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/${route === "home" ? "" : route}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await settle(page);
    const result = await page.evaluate(probe);
    if (result.lowChars > 0 || result.overflow > 0) failed += 1;
    const line = JSON.stringify({ route, width, dark: DARK, ...result });
    if (process.env.OUT) appendFileSync(process.env.OUT, `${line}\n`);
    console.log(`${result.lowChars > 0 || result.overflow > 0 ? "FAIL" : "PASS"} ${route} ${width} low=${result.lowChars}/${result.checked} unknown=${result.unknown} overflow=${result.overflow}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
