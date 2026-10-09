/**
 * Practice route classification and assessment policy resolution.
 * Centralizes focus-mode checks, fullscreen policies, and anti-cheat scopes.
 */

export type PracticeRouteKind =
  | "SPEAKING_ROOM"
  | "LISTENING_ROOM"
  | "READING_ROOM"
  | "WRITING_ROOM"
  | "VOCAB_ROOM"
  | "TOEIC_ATTEMPT_ROOM"
  | "DIAGNOSTIC_ROOM"
  | "GRAMMAR_ROOM"
  | "CATALOG_OR_HUB"
  | "RESULT_OR_REVIEW"
  | "NON_PRACTICE";

export interface AssessmentPolicy {
  requiresFullscreen: boolean;
  enableAntiCheat: boolean;
  hideGlobalNavigation: boolean;
  allowCopyPaste: boolean;
  allowContextMenu: boolean;
}

/**
 * Classifies a pathname into a specific practice route kind.
 */
export function classifyPracticeRoute(pathname: string): PracticeRouteKind {
  if (!pathname) return "NON_PRACTICE";

  // 1. Specific sub-routes that are Results or Reviews (check before general [id])
  if (
    /^\/(?:listening|reading|exams)\/submissions\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/toeic\/results\/[^/]+(?:\/|$)/.test(pathname)
  ) {
    return "RESULT_OR_REVIEW";
  }

  // 2. Specific sub-routes that are Active Answering Rooms
  if (/^\/toeic\/attempts\/[^/]+(?:\/|$)/.test(pathname)) {
    return "TOEIC_ATTEMPT_ROOM";
  }
  if (/^\/speaking\/[^/]+(?:\/|$)/.test(pathname)) {
    return "SPEAKING_ROOM";
  }
  if (/^\/listening\/[^/]+(?:\/|$)/.test(pathname) || /^\/reading\/quizzes\/[^/]+(?:\/|$)/.test(pathname)) {
    return "LISTENING_ROOM";
  }
  if (/^\/writing\/[^/]+(?:\/|$)/.test(pathname)) {
    return "WRITING_ROOM";
  }
  if (/^\/flashcard\/[^/]+(?:\/|$)/.test(pathname)) {
    return "VOCAB_ROOM";
  }
  if (pathname === "/vocabulary/study" || pathname.startsWith("/vocabulary/study/")) {
    return "VOCAB_ROOM";
  }
  // 3. Catalogs, Hubs, Pre-start briefing pages
  if (
    pathname === "/listening" ||
    pathname === "/reading" ||
    pathname === "/writing" ||
    pathname === "/speaking" ||
    pathname === "/exams" ||
    pathname.startsWith("/exams/") ||
    pathname.startsWith("/toeic/bundle") ||
    /^\/toeic\/[^/]+(?:\/|$)/.test(pathname) || // pre-start briefing e.g. /toeic/[examId]
    pathname.startsWith("/flashcard") ||
    pathname === "/flashcard" ||
    pathname === "/vocabulary/saved" ||
    pathname === "/grammar"
  ) {
    return "CATALOG_OR_HUB";
  }

  return "NON_PRACTICE";
}

/**
 * Checks whether the pathname corresponds to an active learning practice room.
 * Preserves exact compatibility with existing codebase callers and tests.
 */
export function isLearningFocusRoute(pathname: string): boolean {
  if (!pathname) return false;

  // Explicitly exclude results and reviews
  if (
    /^\/(?:listening|reading|exams)\/submissions\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/toeic\/results\/[^/]+(?:\/|$)/.test(pathname)
  ) {
    return false;
  }

  // Explicitly exclude pre-start TOEIC exam info pages (e.g. /toeic/1)
  // while keeping /toeic/attempts/[attemptId]
  if (
    /^\/toeic\/[^/]+(?:\/|$)/.test(pathname) &&
    !pathname.startsWith("/toeic/attempts/")
  ) {
    return false;
  }

  // Exclude the retained Reading topic detail runner from focus mode.
  if (/^\/reading\/(?!quizzes\/|submissions\/)[^/]+(?:\/|$)/.test(pathname)) {
    return false;
  }

  return (
    /^\/listening\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/reading\/quizzes\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/speaking\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/writing\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/flashcard\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/toeic\/attempts\/[^/]+(?:\/|$)/.test(pathname) ||
    pathname === "/vocabulary/study" ||
    pathname.startsWith("/vocabulary/study/")
  );
}

/**
 * Checks if the route is an active practice room workspace.
 */
export function isPracticeRoomPath(pathname: string): boolean {
  const kind = classifyPracticeRoute(pathname);
  return (
    kind === "SPEAKING_ROOM" ||
    kind === "LISTENING_ROOM" ||
    kind === "WRITING_ROOM" ||
    kind === "VOCAB_ROOM" ||
    kind === "TOEIC_ATTEMPT_ROOM" ||
    kind === "DIAGNOSTIC_ROOM"
  );
}

/**
 * Checks if the route is a TOEIC attempt room.
 */
export function isToeicAttemptPath(pathname: string): boolean {
  return /^\/toeic\/attempts\/[^/]+(?:\/|$)/.test(pathname);
}

/**
 * Decides whether global student navigation (AppHeader, MobileBottomNav, FloatingCompanion)
 * should be hidden for the given pathname and optional runtime focus override.
 */
export function shouldHideStudentNavigation(
  pathname: string,
  runtimeFocusOverride?: boolean | null,
): boolean {
  if (typeof runtimeFocusOverride === "boolean") {
    return runtimeFocusOverride;
  }
  return isLearningFocusRoute(pathname);
}

/**
 * Pure policy resolution matrix based on activity kind and attempt mode.
 */
export function resolveAssessmentPolicy(params: {
  kind:
    | "SPEAKING"
    | "LISTENING"
    | "READING"
    | "WRITING"
    | "VOCABULARY"
    | "GRAMMAR"
    | "TOEIC"
    | "DIAGNOSTIC";
  mode?: "PRACTICE" | "FULL_TEST" | string;
}): AssessmentPolicy {
  const { kind, mode } = params;

  // 1. TOEIC Full Test: Formal timed mock exam with strict integrity
  if (kind === "TOEIC" && mode === "FULL_TEST") {
    return {
      requiresFullscreen: true,
      enableAntiCheat: true,
      hideGlobalNavigation: true,
      allowCopyPaste: false,
      allowContextMenu: false,
    };
  }

  // 2. TOEIC Part Practice: Practice mode with fullscreen on start, but NO anti-cheat
  if (kind === "TOEIC" && mode === "PRACTICE") {
    return {
      requiresFullscreen: true,
      enableAntiCheat: false,
      hideGlobalNavigation: true,
      allowCopyPaste: true,
      allowContextMenu: true,
    };
  }

  // 3. Diagnostic Assessment: Formal level placement test with anti-cheat
  if (kind === "DIAGNOSTIC") {
    return {
      requiresFullscreen: true,
      enableAntiCheat: true,
      hideGlobalNavigation: true,
      allowCopyPaste: false,
      allowContextMenu: false,
    };
  }

  // 4. Individual Skill Practice (Speaking, Listening, Reading, Writing, Vocab, Grammar):
  // Never automatically enter/require fullscreen; never attach anti-cheat listeners.
  return {
    requiresFullscreen: false,
    enableAntiCheat: false,
    hideGlobalNavigation: true,
    allowCopyPaste: true,
    allowContextMenu: true,
  };
}
