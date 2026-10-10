import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const users = JSON.parse(process.env.ENTRY_QA_USERS || "[]");
const artifactDir = "../../artifacts/entry-diagnostic-2";
const viewport = (process.env.DIAGNOSTIC_VIEWPORT || "1440x900")
  .split("x")
  .map((value) => Number(value));
const artifactSuffix = process.env.DIAGNOSTIC_ARTIFACT_SUFFIX || "";

async function runUser(browser, user) {
  const context = await browser.newContext({
    viewport: { width: viewport[0], height: viewport[1] },
  });
  const page = await context.newPage();
  const network = [];
  const preSubmitBodies = [];
  const consoleErrors = [];
  page.on("response", async (response) => {
    if (/\/diagnostic\//.test(response.url())) {
      let body = null;
      try {
        body = await response.json();
      } catch {
        /* non-json */
      }
      if (response.url().endsWith("/diagnostic/current"))
        preSubmitBodies.push(body);
      network.push({ url: response.url(), status: response.status(), body });
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20000,
  });
  await page.goto(`${BASE_URL}/diagnostic`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const retake = page.getByRole("button", { name: /Làm lại/i });
  if (await retake.isVisible().catch(() => false)) await retake.click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `../../artifacts/entry-diagnostic-2/entry-diagnostic-${user.tier.toLowerCase()}-briefing${artifactSuffix}.png`,
    fullPage: true,
  });
  const title = await page.locator("h1").first().textContent();
  const start = page.getByRole("button", { name: /Bắt đầu kiểm tra/i });
  if (await start.isVisible()) await start.click();
  await page.waitForTimeout(500);
  const questionButtons = page.locator('button[aria-label^="Đi tới câu"]');
  const questionCount = await questionButtons.count();
  const answerKeysLeaked = preSubmitBodies
    .slice(0, 1)
    .filter((body) =>
      /"(?:correctIndex|correctOption|explanation|correctAnswer|transcript)"\s*:/.test(
        JSON.stringify(body ?? ""),
      ),
    ).length;
  let audioSources = [];
  if (questionCount > 32) {
    await page.locator('button[aria-label^="Đi tới câu"]').nth(32).click();
    await page.waitForTimeout(250);
    audioSources = await page
      .locator("audio")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("src")),
      );
    await page.reload({ waitUntil: "networkidle" });
    const retakeAgain = page.getByRole("button", { name: /Làm lại/i });
    if (await retakeAgain.isVisible().catch(() => false))
      await retakeAgain.click();
    const startAgain = page.getByRole("button", { name: /Bắt đầu kiểm tra/i });
    if (await startAgain.isVisible().catch(() => false))
      await startAgain.click();
    await page.waitForTimeout(250);
  }
  await page.screenshot({
    path: `../../artifacts/entry-diagnostic-2/entry-diagnostic-${user.tier.toLowerCase()}-active${artifactSuffix}.png`,
    fullPage: true,
  });
  for (let index = 0; index < questionCount; index += 1) {
    await page.locator('button[aria-label^="Đi tới câu"]').nth(index).click();
    await page.waitForTimeout(40);
    const textarea = page.locator('textarea[aria-label="Câu trả lời tự luận"]');
    if (await textarea.isVisible())
      await textarea.fill(
        "This is a controlled QA response for the placement task.",
      );
    else {
      const option = page.locator('button[aria-pressed="false"]').first();
      if (await option.isVisible()) await option.click();
    }
  }
  const submitButton = page.getByRole("button", {
    name: /Xem kết quả|Đang chấm/i,
  });
  if (await submitButton.isVisible()) await submitButton.click();
  await page.waitForTimeout(1500);
  const resultVisible = await page
    .getByText(/Mức khởi điểm ước tính/i)
    .isVisible()
    .catch(() => false);
  await page.screenshot({
    path: `../../artifacts/entry-diagnostic-2/entry-diagnostic-${user.tier.toLowerCase()}-result${artifactSuffix}.png`,
    fullPage: true,
  });
  const report = {
    tier: user.tier,
    title,
    questionCount,
    answerKeysLeaked,
    audioSources,
    resultVisible,
    consoleErrors,
    network: network.map(({ url, status }) => ({ url, status })),
  };
  await context.close();
  return report;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
try {
  for (const user of users) results.push(await runUser(browser, user));
} finally {
  await browser.close();
}
await fs.mkdir(artifactDir, { recursive: true });
await fs.writeFile(
  `${artifactDir}/entry-diagnostic-v2-browser-matrix.json`,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewport: { width: viewport[0], height: viewport[1] },
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
