import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

async function runQA() {
  console.log("Starting authenticated headless Playwright QA against " + BASE_URL);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    // Step 0: Log in as test student
    console.log("Step 0: Logging in at /login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.fill('input[type="email"]', "test_student_fastpath@breadtrans.local");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("Logged in successfully. Redirected to:", page.url());

    // 1. Obsolete root alias (/practice)
    console.log("\nTesting [1. Obsolete root] at /practice...");
    const obsoletePracticeResponse = await page.goto(`${BASE_URL}/practice`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const obsoletePracticeStatus = obsoletePracticeResponse?.status() ?? 0;
    const test1Passed = obsoletePracticeStatus === 404;
    results.push({ name: "Obsolete /practice returns normal not-found", passed: test1Passed });
    console.log(`  -> Passed: ${test1Passed} (status: ${obsoletePracticeStatus})`);

    // 2. Speaking Room (/speaking/1)
    console.log("\nTesting [2. Speaking Room] at /speaking/1...");
    await page.goto(`${BASE_URL}/speaking/1`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("header.h-14", { timeout: 10000 });
    const speakingAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const speakingPracticeHeader = await page.locator("header.h-14").isVisible();
    const speakingOverlay = await page.locator("div.fixed.inset-0.w-screen").isVisible();
    const test2Passed = !speakingAppHeader && speakingPracticeHeader && !speakingOverlay;
    results.push({ name: "Speaking Room (PracticeHeader visible, AppHeader hidden, No overlay)", passed: test2Passed });
    console.log(`  -> Passed: ${test2Passed} (AppHeader: ${speakingAppHeader}, PracticeHeader: ${speakingPracticeHeader}, Overlay: ${speakingOverlay})`);

    // 3. Writing Room (/writing/1)
    console.log("\nTesting [3. Writing Room] at /writing/1...");
    await page.goto(`${BASE_URL}/writing/1`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("header.h-14", { timeout: 10000 });
    const writingAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const writingPracticeHeader = await page.locator("header.h-14").isVisible();
    const test3Passed = !writingAppHeader && writingPracticeHeader;
    results.push({ name: "Writing Room (PracticeHeader visible, AppHeader hidden)", passed: test3Passed });
    console.log(`  -> Passed: ${test3Passed} (AppHeader: ${writingAppHeader}, PracticeHeader: ${writingPracticeHeader})`);

    // 4. Vocab Study Room (/flashcard/1)
    console.log("\nTesting [4. Vocab Study Room] at /flashcard/1...");
    await page.goto(`${BASE_URL}/flashcard/1`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("header.h-14", { timeout: 10000 });
    const vocabAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const vocabPracticeHeader = await page.locator("header.h-14").isVisible();
    const test4Passed = !vocabAppHeader && vocabPracticeHeader;
    results.push({ name: "Vocab Study Room (PracticeHeader visible, AppHeader hidden)", passed: test4Passed });
    console.log(`  -> Passed: ${test4Passed} (AppHeader: ${vocabAppHeader}, PracticeHeader: ${vocabPracticeHeader})`);

    // 5. Diagnostic Briefing & Active Room (/diagnostic)
    console.log("\nTesting [5. Diagnostic] at /diagnostic...");
    await page.goto(`${BASE_URL}/diagnostic`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    // Briefing state: AppHeader visible, PracticeHeader hidden
    const diagBriefingAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const diagBriefingPracticeHeader = await page.locator("header.h-14").isVisible();
    console.log(`  -> Briefing state: AppHeader=${diagBriefingAppHeader}, PracticeHeader=${diagBriefingPracticeHeader}`);
    // Click Start
    const startBtn = page.locator("button:has-text('Bắt đầu kiểm tra')");
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForSelector("header.h-14", { timeout: 5000 });
    }
    const diagActiveAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const diagActivePracticeHeader = await page.locator("header.h-14").isVisible();
    const test5Passed =
      diagBriefingAppHeader &&
      !diagBriefingPracticeHeader &&
      !diagActiveAppHeader &&
      diagActivePracticeHeader;
    results.push({ name: "Diagnostic (Briefing has no PracticeHeader, Active has PracticeHeader and no AppHeader)", passed: test5Passed });
    console.log(`  -> Active room passed: ${test5Passed} (Active AppHeader: ${diagActiveAppHeader}, PracticeHeader: ${diagActivePracticeHeader})`);

    // 6. Grammar Catalog (/grammar)
    console.log("\nTesting [6. Grammar Catalog] at /grammar...");
    await page.goto(`${BASE_URL}/grammar`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    const grammarCatalogAppHeader = await page.locator("header.sticky:has(a[href='/dashboard']), header.sticky:has(a[href='/'])").isVisible();
    const grammarCatalogPracticeHeader = await page.locator("header.h-14").isVisible();
    const test6Passed = grammarCatalogAppHeader && !grammarCatalogPracticeHeader;
    results.push({ name: "Grammar Catalog (AppHeader visible, PracticeHeader hidden)", passed: test6Passed });
    console.log(`  -> Passed: ${test6Passed} (AppHeader: ${grammarCatalogAppHeader}, PracticeHeader: ${grammarCatalogPracticeHeader})`);

  } catch (err) {
    console.error("QA error:", err);
    results.push({ name: "QA Execution", passed: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log("\n=================================");
  console.log("PLAYWRIGHT HEADLESS QA SUMMARY:");
  const allPassed = results.every((r) => r.passed);
  results.forEach((r) => {
    console.log(`[${r.passed ? "PASS" : "FAIL"}] ${r.name}`);
  });
  console.log(`TOTAL: ${results.filter((r) => r.passed).length}/${results.length} PASSED`);
  console.log("=================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runQA();
