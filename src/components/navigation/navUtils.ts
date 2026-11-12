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

export function isMarketRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/market");
}

export function isMoreRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/ranking") ||
    pathname.startsWith("/help")
  );
}

/** The Arena games: the 1v1 duel lobby and Pháo Bánh Mì. */
export function isArenaRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === "/arena" || pathname.startsWith("/arena/");
}

export interface NavItemConfig {
  label: string;
  href: string;
}

/** The desktop header shows at most this many destination buttons. */
export const MAX_HEADER_NAV_BUTTONS = 8;
/**
 * A guest's header also carries "Gói dịch vụ", "Đăng nhập" and "Đăng ký miễn
 * phí". With 8 buttons it ran 90-135px past the screen at 1280-1536 px wide
 * (responsive crawl 2026-11-10), so a guest gets fewer buttons and a longer More.
 */
export const MAX_GUEST_HEADER_NAV_BUTTONS = 6;

/**
 * Splits the ordered header destinations: the first `max` are buttons, the
 * rest go into "Thêm". With `max` or fewer there is no Thêm menu at all.
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
  { label: "Cửa hàng", href: "/market" },
  { label: "Đấu trường", href: "/arena" },
  { label: "Bảng xếp hạng", href: "/ranking" },
  { label: "Trợ giúp", href: "/help" },
];

const headerSplit = splitNavOverflow(HEADER_NAV_ITEMS);

export const MAIN_NAV_ORDER: NavItemConfig[] = [
  { label: "Home/Logo", href: "/dashboard" },
  ...headerSplit.visible,
  ...(headerSplit.overflow.length ? [{ label: "Thêm", href: "#more" }] : []),
];

export const MORE_DROPDOWN_ITEMS: NavItemConfig[] = headerSplit.overflow;
