/**
 * Navigation routing helpers
 * Distinguishes between Exam Practice (Luyện đề) and Skill Practice (Luyện tập kỹ năng).
 */

/**
 * Returns true if the pathname corresponds to Exam Practice (Luyện đề),
 * such as the exam catalog (/exams) or any TOEIC test/attempt/result route (/toeic/...).
 */
export function isExamRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname === "/exams" ||
    pathname.startsWith("/exams/") ||
    pathname.startsWith("/toeic/") ||
    pathname === "/toeic"
  );
}

/**
 * Returns true if the pathname corresponds to Skill Practice (Luyện tập kỹ năng),
 * including canonical skill homes, individual skill detail runners, flashcards,
 * and grammar.
 */
export function isSkillsRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname === "/listening" ||
    pathname.startsWith("/listening/") ||
    pathname === "/speaking" ||
    pathname.startsWith("/speaking/") ||
    pathname === "/reading" ||
    pathname.startsWith("/reading/") ||
    pathname === "/writing" ||
    pathname.startsWith("/writing/") ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar")
  );
}

export function isListeningRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === "/listening" || pathname.startsWith("/listening/");
}

export function isSpeakingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === "/speaking" || pathname.startsWith("/speaking/");
}

export function isReadingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname === "/reading" || pathname.startsWith("/reading/") ||
    pathname.startsWith("/grammar")
  );
}

export function isWritingRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === "/writing" || pathname.startsWith("/writing/");
}

export function isFlashcardRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/vocabulary") ||
    pathname.startsWith("/flashcard")
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
  { label: "Nghe", href: "/listening" },
  { label: "Nói", href: "/speaking" },
  { label: "Đọc", href: "/reading" },
  { label: "Viết", href: "/writing" },
  { label: "Flashcard", href: "/flashcard" },
  { label: "Luyện đề", href: "/exams" },
  { label: "Khóa học", href: "/courses" },
  { label: "Cửa hàng", href: "/market" },
  { label: "More", href: "#more" },
];

export const MORE_DROPDOWN_ITEMS: NavItemConfig[] = [
  { label: "Bảng xếp hạng", href: "/arena" },
  { label: "Liên hệ", href: "/help" },
  { label: "Đề xuất", href: "/help#feedback" },
];
