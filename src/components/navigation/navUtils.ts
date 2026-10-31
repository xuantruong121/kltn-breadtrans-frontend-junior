import { whenCourses } from "../../lib/featureFlags.ts";
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

/** The desktop header shows at most this many destination buttons. */
export const MAX_HEADER_NAV_BUTTONS = 8;

/**
 * Splits the ordered header destinations: the first `max` are buttons, the
 * rest go into "More". With `max` or fewer there is no More menu at all.
 */
export function splitNavOverflow<T>(
  items: readonly T[],
  max = MAX_HEADER_NAV_BUTTONS,
): { visible: T[]; overflow: T[] } {
  if (items.length <= max) return { visible: [...items], overflow: [] };
  return { visible: items.slice(0, max), overflow: items.slice(max) };
}

/** Every desktop header destination, in display order. */
export const HEADER_NAV_ITEMS: NavItemConfig[] = [
  { label: "Nghe", href: "/listening" },
  { label: "Nói", href: "/speaking" },
  { label: "Đọc", href: "/reading" },
  { label: "Viết", href: "/writing" },
  { label: "Flashcard", href: "/flashcard" },
  { label: "Luyện đề", href: "/exams" },
  ...whenCourses<NavItemConfig>({ label: "Khóa học", href: "/courses" }),
  { label: "Cửa hàng", href: "/market" },
  { label: "Bảng xếp hạng", href: "/arena" },
  { label: "FAQ", href: "/help" },
];

const headerSplit = splitNavOverflow(HEADER_NAV_ITEMS);

export const MAIN_NAV_ORDER: NavItemConfig[] = [
  { label: "Home/Logo", href: "/dashboard" },
  ...headerSplit.visible,
  ...(headerSplit.overflow.length ? [{ label: "More", href: "#more" }] : []),
];

export const MORE_DROPDOWN_ITEMS: NavItemConfig[] = headerSplit.overflow;
