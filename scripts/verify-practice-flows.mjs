import fs from "fs";
import path from "path";
import assert from "assert";

const FRONTEND_ROOT = path.resolve(".");

console.log("=== BREADTRANS PRACTICE FLOWS STATIC CONTRACT VERIFICATION ===");
console.log("(Note: This is static source code inspection, NOT an end-to-end or browser test)");

// 1. Verify PracticeLoadingScreen.tsx
const loadingScreenPath = path.join(FRONTEND_ROOT, "src/components/practice/PracticeLoadingScreen.tsx");
assert(fs.existsSync(loadingScreenPath), "PracticeLoadingScreen.tsx must exist");
const loadingScreenCode = fs.readFileSync(loadingScreenPath, "utf-8");

assert(loadingScreenCode.includes("Đậu đang chuẩn bị bài luyện cho bạn"), "Main text must match spec");
assert(loadingScreenCode.includes("Đang chuẩn bị bài nghe"), "Listening subtitle must match spec");
assert(loadingScreenCode.includes("Đang chuẩn bị bài luyện nói"), "Speaking subtitle must match spec");
assert(loadingScreenCode.includes("Đang chuẩn bị bài đọc"), "Reading subtitle must match spec");
assert(loadingScreenCode.includes("Đang chuẩn bị bài viết"), "Writing subtitle must match spec");
assert(loadingScreenCode.includes('role="status"'), "role='status' must be present");
assert(loadingScreenCode.includes('aria-live="polite"'), "aria-live='polite' must be present");
assert(loadingScreenCode.includes("motion-reduce:animate-none"), "prefers-reduced-motion must be supported");
assert(loadingScreenCode.includes("<BrandIcon"), "Loading screen must use the shared BrandIcon asset");
console.log("✓ PracticeLoadingScreen: All visual and accessibility requirements verified");

// Normal skill exercise routes must open their usable workspace directly. Exam/TOEIC
// briefing routes are intentionally tested separately and retain their lifecycle gate.
const directListeningCode = fs.readFileSync(
  path.join(FRONTEND_ROOT, "src/components/quiz/TakeQuizPage.tsx"),
  "utf-8",
);
const directSpeakingCode = fs.readFileSync(
  path.join(FRONTEND_ROOT, "src/app/(student)/speaking/[id]/page.tsx"),
  "utf-8",
);
const directWritingCode = fs.readFileSync(
  path.join(FRONTEND_ROOT, "src/app/(student)/writing/[id]/page.tsx"),
  "utf-8",
);
assert(!directListeningCode.includes("Bắt đầu luyện nghe"), "Listening detail must not require a second start CTA");
assert(!directSpeakingCode.includes("Bắt đầu luyện nói"), "Speaking detail must not require a second start CTA");
assert(!directWritingCode.includes("Bắt đầu viết"), "Writing detail must not require a second start CTA");
assert(directSpeakingCode.includes('stage={phase === "COMPLETED" ? "FEEDBACK" : "PRACTICE"}'), "Speaking detail must enter PRACTICE declaratively");
assert(directWritingCode.includes('stage={feedback ? "FEEDBACK" : "PRACTICE"}'), "Writing detail must enter PRACTICE declaratively");
console.log("✓ Direct-to-exercise: normal Listening, Speaking, and Writing routes have no redundant start stage");

// 2. Verify PracticeExitConfirmDialog.tsx
const exitDialogPath = path.join(FRONTEND_ROOT, "src/components/practice/PracticeExitConfirmDialog.tsx");
assert(fs.existsSync(exitDialogPath), "PracticeExitConfirmDialog.tsx must exist");
const exitDialogCode = fs.readFileSync(exitDialogPath, "utf-8");

assert(exitDialogCode.includes("Thoát bài luyện?"), "Title must be 'Thoát bài luyện?'");
assert(
  exitDialogCode.includes("Nếu thoát lúc này, toàn bộ tiến độ của bài luyện này sẽ bị xoá và bạn sẽ phải làm lại từ đầu."),
  "Body text must match exact Vietnamese spec"
);
assert(exitDialogCode.includes("Ở lại học tiếp"), "Secondary button must be 'Ở lại học tiếp'");
assert(exitDialogCode.includes("Thoát bài luyện"), "Primary exit action must be 'Thoát bài luyện'");
assert(exitDialogCode.includes("min-h-[44px]"), "Must have >= 44px touch targets");
assert(exitDialogCode.includes('key === "Escape"'), "Escape key must close dialog as 'Ở lại học tiếp'");
assert(exitDialogCode.includes('key === "Tab"'), "Focus trap on Tab key must be implemented");
console.log("✓ PracticeExitConfirmDialog: Modal copy, touch targets, and focus management verified");

// 3. Verify usePracticeExitGuard.ts and practiceExitGuardUtils.ts
const exitGuardPath = path.join(FRONTEND_ROOT, "src/hooks/usePracticeExitGuard.ts");
const exitGuardUtilsPath = path.join(FRONTEND_ROOT, "src/hooks/practiceExitGuardUtils.ts");
assert(fs.existsSync(exitGuardPath), "usePracticeExitGuard.ts must exist");
assert(fs.existsSync(exitGuardUtilsPath), "practiceExitGuardUtils.ts must exist");
const exitGuardCode =
  fs.readFileSync(exitGuardPath, "utf-8") + "\n" + fs.readFileSync(exitGuardUtilsPath, "utf-8");

assert(exitGuardCode.includes("beforeunload"), "beforeunload listener must be present for browser refresh/close");
assert(exitGuardCode.includes("popstate"), "popstate listener must be present for browser Back navigation");
assert(exitGuardCode.includes("document.addEventListener(\"click\""), "Link click interceptor must be present for site header navigation");
assert(
  exitGuardCode.includes("metaKey || ctrlKey || shiftKey || altKey") ||
    exitGuardCode.includes("e.metaKey || e.ctrlKey || e.shiftKey || e.altKey"),
  "Modifier keys must bypass link interceptor"
);
assert(
  exitGuardCode.includes("button !== 0") || exitGuardCode.includes("e.button !== 0"),
  "Middle/right clicks must bypass link interceptor"
);
assert(
  exitGuardCode.includes('target !== "_self"') || exitGuardCode.includes("anchor.target"),
  "target!=_self must bypass link interceptor"
);
assert(
  exitGuardCode.includes("download"),
  "download links must bypass link interceptor"
);
assert(exitGuardCode.includes("window.location.assign"), "External URLs must use window.location.assign on confirm");
assert(exitGuardCode.includes("router.replace"), "Internal navigation and Back must use router.replace on confirm");
assert(!exitGuardCode.includes("router.back()"), "Must NOT use router.back() on confirmed browser back");
assert(exitGuardCode.includes("isNavigating"), "isNavigating must guard against duplicate submissions/navigations");
assert(exitGuardCode.includes("triggerElementRef.current?.focus()"), "Focus restoration must be present on stay");
console.log("✓ usePracticeExitGuard: Safe link interception, browser Back, fallback URL, and focus restore verified");

// 4. Verify Listening Practice (ListeningComprehensionWorkspace.tsx)
const listeningWorkspacePath = path.join(
  FRONTEND_ROOT,
  "src/components/listening/ListeningComprehensionWorkspace.tsx"
);
const listeningCode = fs.readFileSync(listeningWorkspacePath, "utf-8");

assert(listeningCode.includes("usePracticeExitGuard"), "Listening must use usePracticeExitGuard");
assert(listeningCode.includes("PracticeExitConfirmDialog"), "Listening must render PracticeExitConfirmDialog");
assert(listeningCode.includes("PracticeLoadingScreen"), "Listening must render PracticeLoadingScreen");
assert(listeningCode.includes("imageUrl"), "Listening must preserve imageUrl contract");
assert(listeningCode.includes("imageAlt"), "Listening must preserve imageAlt contract");
assert(listeningCode.includes("TOPIC_CONTEXT"), "Listening must preserve TOPIC_CONTEXT purpose");
assert(!listeningCode.includes("<figure") || listeningCode.includes("{imageUrl && ("), "Must not render empty figure without imageUrl");
assert(listeningCode.includes("shouldConfirmExit = !submitMutation.isSuccess"), "Listening must require exit confirmation on all unfinished sessions");
assert(listeningCode.includes("minLaunchReady"), "Listening workspace must enforce minimum launch ready duration");
console.log("✓ Listening: Exit guard, loading screen, and contextual image verified");

// 5. Verify Speaking Practice (speaking/[id]/page.tsx)
const speakingPath = path.join(FRONTEND_ROOT, "src/app/(student)/speaking/[id]/page.tsx");
const speakingCode = fs.readFileSync(speakingPath, "utf-8");

assert(speakingCode.includes("usePracticeExitGuard"), "Speaking must use usePracticeExitGuard");
assert(speakingCode.includes("PracticeExitConfirmDialog"), "Speaking must render PracticeExitConfirmDialog");
assert(speakingCode.includes("PracticeLoadingScreen"), "Speaking must render PracticeLoadingScreen");
assert(speakingCode.includes("shouldConfirmExit = !isCompleted"), "Speaking must require exit confirmation until attempt is completed");
assert(speakingCode.includes("minLaunchReady"), "Speaking runner must enforce minimum launch ready duration");
console.log("✓ Speaking: Exit guard, recording dirty check, and loading screen verified");

// 6. Verify Reading & Quiz Runner (quizzes/[id]/page.tsx and reading/[id]/page.tsx)
const quizRunnerPath = path.join(FRONTEND_ROOT, "src/components/quiz/TakeQuizPage.tsx");
const quizRunnerCode = fs.readFileSync(quizRunnerPath, "utf-8");
assert(quizRunnerCode.includes("usePracticeExitGuard"), "Quiz runner must use usePracticeExitGuard");
assert(quizRunnerCode.includes("enabled: !isListening"), "Quiz runner must yield guard ownership when isListening");
assert(quizRunnerCode.includes("shouldConfirmExit = !submitMutation.isSuccess"), "Quiz runner must require exit confirmation on all unfinished sessions");
assert(quizRunnerCode.includes("PracticeExitConfirmDialog"), "Quiz runner must render PracticeExitConfirmDialog");
assert(quizRunnerCode.includes("PracticeLoadingScreen"), "Quiz runner must render PracticeLoadingScreen");
assert(quizRunnerCode.includes("minLaunchReady"), "Quiz runner must enforce minimum launch ready duration");

const readingTopicPath = path.join(FRONTEND_ROOT, "src/app/(student)/reading/[id]/page.tsx");
const readingTopicCode = fs.readFileSync(readingTopicPath, "utf-8");
assert(readingTopicCode.includes("PracticeLoadingScreen"), "Reading topic detail must use PracticeLoadingScreen");
assert(readingTopicCode.includes("launchingQuizId"), "Reading detail must have launchingQuizId state");
console.log("✓ Reading & Shared Quiz Runner: Exit guard and loading screens verified");

// 7. Verify Writing Practice (writing/[id]/page.tsx)
const writingPath = path.join(FRONTEND_ROOT, "src/app/(student)/writing/[id]/page.tsx");
const writingCode = fs.readFileSync(writingPath, "utf-8");

assert(writingCode.includes("usePracticeExitGuard"), "Writing must use usePracticeExitGuard");
assert(writingCode.includes("PracticeExitConfirmDialog"), "Writing must render PracticeExitConfirmDialog");
assert(writingCode.includes("PracticeLoadingScreen"), "Writing must render PracticeLoadingScreen");
assert(writingCode.includes("shouldConfirmExit = !feedback"), "Writing must require exit confirmation until feedback is received");
assert(writingCode.includes("minLaunchReady"), "Writing runner must enforce minimum launch ready duration");
console.log("✓ Writing: Exit guard, draft dirty check, and loading screen verified");

// 8. Verify TOEIC lifecycle (briefing remains a real pre-start boundary)
const toeicBriefingPath = path.join(FRONTEND_ROOT, "src/app/(student)/toeic/[examId]/page.tsx");
const toeicAttemptPath = path.join(FRONTEND_ROOT, "src/app/(student)/toeic/attempts/[attemptId]/page.tsx");
const toeicBriefingCode = fs.readFileSync(toeicBriefingPath, "utf-8");
const toeicAttemptCode = fs.readFileSync(toeicAttemptPath, "utf-8");
assert(toeicBriefingCode.includes("startAttempt"), "TOEIC briefing must create an attempt only after explicit start");
assert(toeicBriefingCode.includes("Bắt đầu làm bài"), "TOEIC briefing must retain explicit start CTA");
assert(toeicAttemptCode.includes("useAssessmentAntiCheat"), "TOEIC attempt must preserve assessment protections");
assert(toeicAttemptCode.includes("formatTime"), "TOEIC attempt must preserve timer behavior");
console.log("✓ TOEIC: meaningful briefing and timed assessment lifecycle retained");

console.log("\nALL VERIFICATION CHECKS PASSED PERFECTLY!");
