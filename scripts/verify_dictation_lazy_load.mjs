import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_STUDENT_EMAIL;
const PASSWORD = process.env.E2E_STUDENT_PASSWORD;
const QUIZ_ID = process.env.E2E_QUIZ_ID ? parseInt(process.env.E2E_QUIZ_ID, 10) : 23;
const EXPECTED_TRANSCRIPT_ITEMS_QUIZ_23 = 14;

if (!EMAIL || !PASSWORD) {
  console.error("ERROR: Missing required environment variables.");
  console.error("Required: E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD must be set in the environment.");
  console.error("Optional: E2E_BASE_URL (defaults to http://localhost:3000), E2E_QUIZ_ID (defaults to 23).");
  process.exit(1);
}

function attachNetworkTracker(page, label) {
  const tracker = {
    transcriptRevealCalls: 0,
    transcriptDataCalls: 0,
    transcriptAudioCalls: 0,
    questionAudioCalls: 0,
    azureSynthesisCalls: 0,
  };

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/transcript/reveal")) {
      tracker.transcriptRevealCalls++;
      console.log(`  [${label} NET] POST /transcript/reveal (#${tracker.transcriptRevealCalls})`);
    } else if (url.includes("/transcript/audio")) {
      tracker.transcriptAudioCalls++;
      console.log(`  [${label} NET] GET /transcript/audio (#${tracker.transcriptAudioCalls})`);
    } else if (url.endsWith("/transcript") || url.includes("/transcript?")) {
      tracker.transcriptDataCalls++;
      console.log(`  [${label} NET] GET /transcript (#${tracker.transcriptDataCalls})`);
    } else if (url.includes("/questions/") && url.includes("/audio")) {
      tracker.questionAudioCalls++;
      console.log(`  [${label} NET] GET /questions/.../audio (#${tracker.questionAudioCalls})`);
    } else if (url.includes("cognitiveservices.azure.com") || url.includes("tts")) {
      tracker.azureSynthesisCalls++;
      console.log(`  [${label} NET] AZURE SYNTHESIS DETECTED: ${url}`);
    }
  });

  return tracker;
}

async function performLogin(page, label) {
  console.log(`[${label}] Logging in at ${BASE_URL}/login...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log(`[${label}] Login form submitted. Navigated to dashboard.`);
}

async function run() {
  console.log("================================================================================");
  console.log("STARTING PLAYWRIGHT HEADLESS QA: DICTATION PREFETCH & CACHE SAFETY");
  console.log(`Target: ${BASE_URL} | Quiz: ${QUIZ_ID} | Auth: Environment Variables Provided`);
  console.log("================================================================================");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const loadingSelector = '[data-testid="listening-loading-screen"]';

  try {
    // =========================================================================
    // SESSION 1: DESKTOP WORKSPACE (1440x900)
    // =========================================================================
    console.log("\n>>> STARTING DESKTOP SESSION (1440x900) <<<");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const desktopPage = await desktopContext.newPage();
    const desktopTracker = attachNetworkTracker(desktopPage, "Desktop");

    await performLogin(desktopPage, "Desktop");

    console.log(`[Desktop] Navigating to /practice/quizzes/${QUIZ_ID}...`);
    await desktopPage.goto(`${BASE_URL}/practice/quizzes/${QUIZ_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    // 1. Initial loading overlay MUST exist on navigation, then disappear
    const desktopLoadingOverlay = desktopPage.locator(loadingSelector);
    try {
      await desktopLoadingOverlay.first().waitFor({ state: "attached", timeout: 8000 });
      console.log("  [PASS] Expected initial loading overlay detected upon page entry.");
    } catch {
      throw new Error("Assertion Failed: Expected initial loading overlay was absent when navigating to quiz!");
    }

    await desktopLoadingOverlay.first().waitFor({ state: "hidden", timeout: 15000 });
    console.log("  [PASS] Initial loading overlay confirmed hidden.");

    // 2. Dictation workspace ready & usable
    const desktopTextarea = desktopPage.locator("textarea").first();
    await desktopTextarea.waitFor({ state: "visible", timeout: 15000 });
    console.log("  [PASS] Dictation workspace textarea is visible and interactive.");

    // 3. Answer Security check: unrevealed dictation must NOT call POST /reveal
    if (desktopTracker.transcriptRevealCalls > 0) {
      throw new Error(`Security Violation: POST /reveal was called before explicit user access (#${desktopTracker.transcriptRevealCalls})`);
    }
    console.log("  [PASS] Security verified: POST /reveal was NOT called on initial load.");

    // 4. Type draft answer
    const desktopDraft = "Leo are you ready for our meeting today";
    await desktopTextarea.fill(desktopDraft);
    console.log(`  [Desktop] Entered draft text in textarea: "${desktopDraft}"`);

    // 5. Explicitly switch to Full Transcript tab
    console.log("  [Desktop] Clicking 'Toàn bộ kịch bản' tab...");
    const desktopTranscriptTabBtn = desktopPage.locator("button:has-text('Toàn bộ kịch bản')");
    await desktopTranscriptTabBtn.click();

    // 6. Assert ABSENCE of a second full-screen loading overlay
    const isDesktopSecondOverlayVisible = await desktopLoadingOverlay.first().isVisible();
    if (isDesktopSecondOverlayVisible) {
      throw new Error("Assertion Failed: Second full-screen loading overlay appeared during tab switch!");
    }
    console.log("  [PASS] No second full-screen overlay appeared during tab switch.");

    // 7. Assert that transcript items actually render with EXACT item count for Quiz 23
    const desktopTranscriptItems = desktopPage.locator("div[role='list'] button");
    await desktopTranscriptItems.first().waitFor({ state: "visible", timeout: 15000 });
    const desktopItemCount = await desktopTranscriptItems.count();
    if (QUIZ_ID === 23 && desktopItemCount !== EXPECTED_TRANSCRIPT_ITEMS_QUIZ_23) {
      throw new Error(`Assertion Failed: Expected exactly ${EXPECTED_TRANSCRIPT_ITEMS_QUIZ_23} transcript items for quiz 23, found ${desktopItemCount}`);
    } else if (desktopItemCount < 1) {
      throw new Error(`Assertion Failed: Expected transcript items (count >= 1), found ${desktopItemCount}`);
    }
    console.log(`  [PASS] Transcript items rendered with verified exact count (${desktopItemCount}).`);

    // 8. Verify exact expected request counts for first open
    if (desktopTracker.transcriptRevealCalls !== 1) {
      throw new Error(`Expected exactly 1 reveal call on first open, observed ${desktopTracker.transcriptRevealCalls}`);
    }
    if (desktopTracker.transcriptDataCalls !== 2) {
      throw new Error(`Expected exactly 2 transcript data calls (1 probe + 1 authorized), observed ${desktopTracker.transcriptDataCalls}`);
    }
    if (desktopTracker.transcriptAudioCalls !== 2) {
      throw new Error(`Expected exactly 2 transcript audio calls (1 probe + 1 authorized), observed ${desktopTracker.transcriptAudioCalls}`);
    }
    if (desktopTracker.azureSynthesisCalls !== 0) {
      throw new Error("Unwanted Azure TTS synthesis request detected!");
    }
    console.log("  [PASS] First transcript open produced exact expected network request counts.");

    const netAfterDesktopTab1 = { ...desktopTracker };

    // 9. Switch back to Dictation tab & verify draft preservation
    console.log("  [Desktop] Switching back to Dictation tab...");
    const desktopDictationTabBtn = desktopPage.locator("button:has-text('Nghe chép chính tả')");
    await desktopDictationTabBtn.click();

    const desktopPreserved = await desktopTextarea.inputValue();
    if (desktopPreserved !== desktopDraft) {
      throw new Error(`Draft Preservation Failed: expected "${desktopDraft}", found "${desktopPreserved}"`);
    }
    console.log("  [PASS] Dictation draft text was preserved intact.");

    // 10. Confirm question audio was NOT re-downloaded
    if (desktopTracker.questionAudioCalls > netAfterDesktopTab1.questionAudioCalls) {
      throw new Error("Assertion Failed: Question audio was re-downloaded on tab switch back to dictation!");
    }
    console.log("  [PASS] Question audio was not downloaded again.");

    // 11. Switch to Full Transcript second time: Verify Cache Reuse (Zero additional network calls)
    console.log("  [Desktop] Switching to Full Transcript second time (cache reuse)...");
    await desktopTranscriptTabBtn.click();
    await desktopTranscriptItems.first().waitFor({ state: "visible", timeout: 5000 });

    if (desktopTracker.transcriptRevealCalls !== netAfterDesktopTab1.transcriptRevealCalls) {
      throw new Error("Duplicate reveal call detected on second tab switch!");
    }
    if (desktopTracker.transcriptDataCalls !== netAfterDesktopTab1.transcriptDataCalls) {
      throw new Error("Duplicate transcript data call detected on second tab switch!");
    }
    if (desktopTracker.transcriptAudioCalls !== netAfterDesktopTab1.transcriptAudioCalls) {
      throw new Error("Duplicate transcript audio call detected on second tab switch!");
    }
    if (desktopTracker.questionAudioCalls !== netAfterDesktopTab1.questionAudioCalls) {
      throw new Error("Duplicate question audio call detected on second tab switch!");
    }
    if (desktopTracker.azureSynthesisCalls !== 0) {
      throw new Error("Unwanted Azure TTS synthesis request detected!");
    }

    console.log("  [PASS] Desktop cache reuse verified: ZERO additional network calls on second open.");
    await desktopContext.close();

    // =========================================================================
    // SESSION 2: INDEPENDENT FRESH MOBILE BROWSER SESSION (390x844)
    // =========================================================================
    console.log("\n>>> STARTING FRESH MOBILE SESSION (390x844) <<<");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    const mobileTracker = attachNetworkTracker(mobilePage, "Mobile");

    await performLogin(mobilePage, "Mobile");

    console.log(`[Mobile] Navigating independently to /practice/quizzes/${QUIZ_ID}...`);
    await mobilePage.goto(`${BASE_URL}/practice/quizzes/${QUIZ_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    // 1. Mobile initial overlay MUST exist, then disappear
    const mobileLoadingOverlay = mobilePage.locator(loadingSelector);
    try {
      await mobileLoadingOverlay.first().waitFor({ state: "attached", timeout: 8000 });
      console.log("  [PASS] Expected initial mobile loading overlay detected.");
    } catch {
      throw new Error("Assertion Failed: Expected mobile initial loading overlay was absent!");
    }

    await mobileLoadingOverlay.first().waitFor({ state: "hidden", timeout: 15000 });
    console.log("  [PASS] Mobile initial loading overlay confirmed hidden.");

    // 2. Mobile workspace ready
    const mobileTextarea = mobilePage.locator("textarea").first();
    await mobileTextarea.waitFor({ state: "visible", timeout: 15000 });
    console.log("  [PASS] Mobile Dictation workspace textarea is visible.");

    // 3. Draft typing on mobile
    const mobileDraft = "Mobile standalone draft test";
    await mobileTextarea.fill(mobileDraft);
    console.log(`  [Mobile] Entered draft text in mobile textarea: "${mobileDraft}"`);

    // 4. Switch to Full Transcript tab on mobile
    console.log("  [Mobile] Switching to Full Transcript tab...");
    const mobileTranscriptTabBtn = mobilePage.locator("button:has-text('Toàn bộ kịch bản')");
    await mobileTranscriptTabBtn.click();

    // 5. Assert absence of second full-screen overlay on mobile
    const isMobileSecondOverlayVisible = await mobileLoadingOverlay.first().isVisible();
    if (isMobileSecondOverlayVisible) {
      throw new Error("Assertion Failed: Mobile second full-screen overlay appeared during tab switch!");
    }
    console.log("  [PASS] No second full-screen overlay on mobile.");

    // 6. Assert transcript rendering on mobile with exact count
    const mobileTranscriptItems = mobilePage.locator("div[role='list'] button");
    await mobileTranscriptItems.first().waitFor({ state: "visible", timeout: 15000 });
    const mobileItemCount = await mobileTranscriptItems.count();
    if (QUIZ_ID === 23 && mobileItemCount !== EXPECTED_TRANSCRIPT_ITEMS_QUIZ_23) {
      throw new Error(`Assertion Failed: Mobile expected exactly ${EXPECTED_TRANSCRIPT_ITEMS_QUIZ_23} items, found ${mobileItemCount}`);
    } else if (mobileItemCount < 1) {
      throw new Error(`Assertion Failed: Mobile expected transcript items, found ${mobileItemCount}`);
    }
    console.log(`  [PASS] Mobile transcript rendered successfully with verified exact count (${mobileItemCount}).`);

    // 7. Verify first open request counts on mobile
    if (mobileTracker.transcriptRevealCalls !== 1) {
      throw new Error(`Expected exactly 1 reveal call on mobile, observed ${mobileTracker.transcriptRevealCalls}`);
    }
    if (mobileTracker.transcriptDataCalls !== 2) {
      throw new Error(`Expected exactly 2 transcript data calls on mobile, observed ${mobileTracker.transcriptDataCalls}`);
    }
    if (mobileTracker.transcriptAudioCalls !== 2) {
      throw new Error(`Expected exactly 2 transcript audio calls on mobile, observed ${mobileTracker.transcriptAudioCalls}`);
    }

    const netAfterMobileTab1 = { ...mobileTracker };

    // 8. Switch back to Dictation & verify draft preservation on mobile
    console.log("  [Mobile] Switching back to Dictation tab...");
    const mobileDictationTabBtn = mobilePage.locator("button:has-text('Nghe chép chính tả')");
    await mobileDictationTabBtn.click();

    const mobilePreserved = await mobileTextarea.inputValue();
    if (mobilePreserved !== mobileDraft) {
      throw new Error(`Mobile Draft Preservation Failed: expected "${mobileDraft}", found "${mobilePreserved}"`);
    }
    console.log("  [PASS] Mobile draft answer preserved intact.");

    // 9. Re-open Full Transcript on mobile & verify cache reuse (ZERO additional calls)
    console.log("  [Mobile] Switching to Full Transcript second time (cache reuse)...");
    await mobileTranscriptTabBtn.click();
    await mobileTranscriptItems.first().waitFor({ state: "visible", timeout: 5000 });

    if (mobileTracker.transcriptRevealCalls !== netAfterMobileTab1.transcriptRevealCalls) {
      throw new Error("Mobile duplicate reveal call detected on second open!");
    }
    if (mobileTracker.transcriptDataCalls !== netAfterMobileTab1.transcriptDataCalls) {
      throw new Error("Mobile duplicate transcript call detected on second open!");
    }
    if (mobileTracker.transcriptAudioCalls !== netAfterMobileTab1.transcriptAudioCalls) {
      throw new Error("Mobile duplicate audio call detected on second open!");
    }
    if (mobileTracker.questionAudioCalls !== netAfterMobileTab1.questionAudioCalls) {
      throw new Error("Mobile duplicate question audio call detected on second open!");
    }
    if (mobileTracker.azureSynthesisCalls !== 0) {
      throw new Error("Mobile unwanted Azure synthesis call detected!");
    }

    console.log("  [PASS] Mobile cache reuse verified: ZERO additional network calls on second open.");
    await mobileContext.close();

    console.log("\n================================================================================");
    console.log("ALL BROWSER QA ACCEPTANCE CRITERIA SATISFIED (DESKTOP & MOBILE)");
    console.log("================================================================================");
  } catch (err) {
    console.error("\n❌ BROWSER QA FAILED:", err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
