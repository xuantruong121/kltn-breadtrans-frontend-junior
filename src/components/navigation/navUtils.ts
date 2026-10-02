/**
 * Navigation routing helpers
 * Distinguishes between Exam Practice (Luyện đề) and Skill Practice (Luyện tập kỹ năng).
 */

/**
 * Returns true if the pathname corresponds to Exam Practice (Luyện đề),
 * such as the exam catalog (/practice/quizzes) or any TOEIC test/attempt/result route (/practice/toeic/...).
 * Note: Specific skill practice quizzes (listening, reading) located at /practice/quizzes/[id]
 * or /practice/quizzes/submissions/[id] are Skill Practice, NOT Exam Practice.
 */
export function isExamRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/practice/toeic") ||
    pathname === "/practice/quizzes" ||
    pathname === "/practice/quizzes/"
  );
}

/**
 * Returns true if the pathname corresponds to Skill Practice (Luyện tập kỹ năng),
 * including the practice hub (/practice), individual skills (/practice/listening, /practice/speaking,
 * /practice/reading, /practice/writing, /practice/vocab), skill quiz players (/practice/quizzes/[id]),
 * quiz submissions (/practice/quizzes/submissions/[id]), flashcards, and grammar.
 */
export function isSkillsRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    (pathname.startsWith("/practice") && !isExamRoute(pathname)) ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar")
  );
}

export function isListeningRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/practice/listening");
}

export function isSpeakingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/practice/speaking");
}

export function isReadingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/practice/reading") ||
    pathname.startsWith("/grammar")
  );
}

export function isWritingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/practice/writing");
}

export function isFlashcardRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/vocabulary") ||
    pathname.startsWith("/practice/vocab")
  );
}

export function isCoursesRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/courses") ||
    pathname.startsWith("/my-courses") ||
    pathname.startsWith("/classes")
  );
}

export function isMarketRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/market");
}

export function isMoreRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/arena") ||
    pathname.startsWith("/help")
  );
}

export interface NavItemConfig {
  label: string;
  href: string;
}

export const MAIN_NAV_ORDER: NavItemConfig[] = [
  { label: "Home/Logo", href: "/dashboard" },
  { label: "Nghe", href: "/practice/listening" },
  { label: "Nói", href: "/practice/speaking" },
  { label: "Đọc", href: "/practice/reading" },
  { label: "Viết", href: "/practice/writing" },
  { label: "Flashcard", href: "/flashcard" },
  { label: "Khóa học", href: "/courses" },
  { label: "Cửa hàng", href: "/market" },
  { label: "More", href: "#more" },
];

export const MORE_DROPDOWN_ITEMS: NavItemConfig[] = [
  { label: "Bảng xếp hạng", href: "/arena" },
  { label: "Liên hệ", href: "/help" },
  { label: "Đề xuất", href: "/help#feedback" },
];
