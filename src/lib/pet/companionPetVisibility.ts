/**
 * Where the floating companion pet stays out of the way.
 *
 * The pet and its speech bubble sit in the bottom-right corner, which is where
 * assessment pages put their controls: the TOEIC exam page's part checkboxes
 * and start button, and the navigation of an attempt in progress. On those
 * pages, on the Entry Diagnostic and on level gates, the pet is not shown at all.
 */
export function isCompanionPetHidden(pathname: string, tab: string | null): boolean {
  if (pathname === "/diagnostic" || pathname.startsWith("/diagnostic/")) return true;
  if (pathname.startsWith("/gate/")) return true;
  if ((pathname === "/student" || pathname === "/hub") && (tab === "diagnostic" || tab === "diagnostic-result")) {
    return true;
  }
  // A TOEIC exam's detail page, its attempts and results; the exam list keeps the pet.
  if (pathname.startsWith("/exams/")) return true;
  if (pathname.startsWith("/toeic/") && pathname !== "/toeic/history") return true;
  return false;
}
