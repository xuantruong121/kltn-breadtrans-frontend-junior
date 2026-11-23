// Chụp ảnh và đoạn quay màn hình thật cho landing page.
// Chạy khi FE :3000 và API :3001 đang chạy:  node scripts/landing/capture-landing-assets.mjs
// Chỉ đọc: đăng nhập tài khoản test, mở trang, chụp. Không ghi dữ liệu nào vào database.
// Ghi ảnh vào public/landing (WebP q82, rộng tối đa 1600) và in kích thước để cập nhật src/lib/landing/assets.ts.
// Biến môi trường tuỳ chọn:
//   LANDING_BASE_URL (mặc định http://localhost:3000), LANDING_API_URL (mặc định http://127.0.0.1:3001).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'landing');
const BASE = process.env.LANDING_BASE_URL || 'http://localhost:3000';
const API = process.env.LANDING_API_URL || 'http://127.0.0.1:3001';
const EMAIL = 'student2@breadtrans.com';
const PASSWORD = 'Password123!';
const MAX_WIDTH = 1600;

// Vùng cắt (CSS px, viewport 1440x900) cho từng ảnh. `full` = chụp cả trang rồi cắt.
const SHOTS = [
  { key: 'skill-noi', route: '/speaking/137?submissionId=304', clip: { x: 20, y: 80, width: 680, height: 560 } },
  { key: 'skill-nghe', route: '/listening', clip: { x: 40, y: 110, width: 1360, height: 500 } },
  { key: 'skill-doc', route: '/reading', clip: { x: 40, y: 110, width: 1360, height: 500 } },
  { key: 'skill-viet', route: '/writing', clip: { x: 40, y: 300, width: 1360, height: 390 } },
  // Trang đề TOEIC, không phải /exams: hàng chip định dạng ở /exams có các chứng chỉ BreadTrans không cung cấp.
  { key: 'skill-luyen-de', route: '/exams/2', clip: { x: 104, y: 100, width: 1232, height: 780 } },
  { key: 'skill-flashcard', route: '/flashcard', clip: { x: 80, y: 100, width: 1280, height: 600 } },
  { key: 'habit-banh-mi', route: '/market', clip: { x: 144, y: 100, width: 1152, height: 630 } },
  { key: 'habit-thu-ao', route: '/pet', clip: { x: 144, y: 100, width: 1152, height: 780 } },
  { key: 'habit-chuoi-ngay', route: '/dashboard', clip: { x: 120, y: 110, width: 1200, height: 500 } },
  { key: 'habit-dau-truong', route: '/arena', clip: { x: 30, y: 95, width: 1370, height: 600 } },
  { key: 'habit-xep-hang', route: '/ranking', clip: { x: 1020, y: 340, width: 380, height: 370 } },
];

const HIDE_DEV_BADGE = 'nextjs-portal { display: none !important; }';

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  for (let i = 0; i < 30; i++) {
    if (await page.locator('input[name="email"]').isVisible()) break;
    await page.getByRole('button', { name: /Đã có tài khoản email/ }).click({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 120000 });
}

async function open(page, route) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.addStyleTag({ content: HIDE_DEV_BADGE });
  await page.waitForTimeout(6000);
  // Đóng bong bóng linh vật nếu có, để không che vùng chụp.
  const bubble = page.locator('button[aria-label*="Đóng"], button[aria-label*="đóng"]').first();
  if (await bubble.isVisible().catch(() => false)) {
    await bubble.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function toWebp(png, key) {
  let img = sharp(png);
  const { width } = await img.metadata();
  if (width > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH });
  const file = path.join(OUT, `${key}.webp`);
  const info = await img.webp({ quality: 82 }).toFile(file);
  console.log(`${key}: ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
}

function findFfmpeg() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!fs.existsSync(base)) return null;
  const dir = fs.readdirSync(base).find((d) => d.startsWith('ffmpeg-'));
  if (!dir) return null;
  const exe = fs.readdirSync(path.join(base, dir)).find((f) => f.startsWith('ffmpeg'));
  return exe && exe.endsWith('.exe') ? path.join(base, dir, exe) : null;
}

async function recordVideo(browser) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-video-'));
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: tmp, size: { width: 1440, height: 900 } },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  // Phiên riêng cho video (refresh token xoay vòng, không dùng chung với context chụp ảnh).
  await login(page);
  await open(page, '/speaking/137?submissionId=304');
  const startAt = ((Date.now() - t0) / 1000 + 0.5).toFixed(2);
  await page.waitForTimeout(1500);
  for (const word of ['university', 'library', 'open', 'Monday', 'eight', 'night']) {
    const el = page.getByText(word, { exact: true }).first();
    const box = await el.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(1500);
  const video = page.video();
  await ctx.close();
  const raw = await video.path();

  const ffmpeg = findFfmpeg();
  if (!ffmpeg) throw new Error('ffmpeg của Playwright không tìm thấy, không cắt được video');
  // Bỏ phần đăng nhập và tải trang (startAt giây đầu), cắt vùng nội dung (bỏ thanh trên và thanh dưới), giữ 8s.
  const webm = path.join(OUT, 'noi-cham-tu.webm');
  const poster = path.join(OUT, 'noi-cham-tu.jpg');
  const png = path.join(tmp, 'first.png');
  const crop = 'crop=1440:784:0:56';
  execFileSync(ffmpeg, ['-y', '-ss', startAt, '-t', '8', '-i', raw, '-vf', crop, '-an', '-c:v', 'libvpx', '-b:v', '1M', '-crf', '30', webm], { stdio: 'ignore' });
  execFileSync(ffmpeg, ['-y', '-ss', '0', '-i', webm, '-frames:v', '1', png], { stdio: 'ignore' });
  const info = await sharp(png).jpeg({ quality: 82 }).toFile(poster);
  console.log(`video: ${info.width}x${info.height} ${Math.round(fs.statSync(webm).size / 1024)}KB`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Đăng xuất các phiên headless do script tạo (UA HeadlessChrome/node/curl) qua API; phiên của chủ máy (Edge) giữ nguyên.
// Chạy trong finally nên luôn chạy, không phụ thuộc biến môi trường.
async function signOutTestSessions() {
  const isTest = (ua) => !ua || ua.includes('HeadlessChrome') || ua.startsWith('node') || ua.startsWith('curl');
  try {
    const login = await (await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })).json();
    const auth = { authorization: `Bearer ${login.data.access_token}` };
    const sessions = (await (await fetch(`${API}/auth/sessions`, { headers: auth })).json()).data;
    let removed = 0;
    for (const s of sessions) {
      if (s.current || !isTest(s.userAgent)) continue;
      const r = await fetch(`${API}/auth/sessions/${encodeURIComponent(s.deviceId)}`, { method: 'DELETE', headers: auth });
      if (r.ok) removed += 1;
    }
    await fetch(`${API}/auth/logout`, { method: 'POST', headers: auth });
    console.log(`${EMAIL}: removed ${removed} test sessions, script session signed out`);
  } catch (e) {
    console.error('KHÔNG đăng xuất được phiên test, hãy chạy clean-sessions-any.mjs:', e.message);
  }
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  await recordVideo(browser);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await login(page);

  let lastRoute = null;
  for (const shot of SHOTS) {
    if (shot.route !== lastRoute) {
      await open(page, shot.route);
      lastRoute = shot.route;
    }
    const png = await page.screenshot({ clip: shot.clip, fullPage: Boolean(shot.full) });
    await toWebp(png, shot.key);
  }
  await ctx.close();
} finally {
  await browser.close();
  await signOutTestSessions();
}
