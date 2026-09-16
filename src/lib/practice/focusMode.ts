/**
 * Routes where the learner is actively completing an assessment.
 * Discovery, briefing, and result pages intentionally remain outside focus mode.
 */
export function isLearningFocusRoute(pathname: string): boolean {
  return (
    /^\/practice\/quizzes\/\d+(?:\/|$)/.test(pathname) ||
    /^\/practice\/speaking\/\d+(?:\/|$)/.test(pathname) ||
    /^\/practice\/writing\/\d+(?:\/|$)/.test(pathname) ||
    /^\/practice\/vocab\/\d+(?:\/|$)/.test(pathname) ||
    /^\/practice\/toeic\/attempts\/\d+(?:\/|$)/.test(pathname) ||
    pathname === "/diagnostic" ||
    pathname.startsWith("/diagnostic/") ||
    pathname === "/vocabulary/study" ||
    pathname.startsWith("/vocabulary/study/")
  );
}
