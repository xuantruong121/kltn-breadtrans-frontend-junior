export const ALLOWED_INTERNAL_ROUTE_PREFIXES = [
  "/flashcard",
  "/exams",
  "/toeic",
  "/listening",
  "/speaking",
  "/reading",
  "/writing",
  "/my-courses",
  "/courses",
  "/arena",
  "/grammar",
  "/vocabulary",
  "/classes",
];

export function isSafeInternalRoute(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if ([
    "/practice",
  ].includes(trimmed)) return false;
  return ALLOWED_INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(prefix + "/")
  );
}

export function getTypeSpecificQuestFallback(type?: string): { actionLabel: string; actionUrl: string } {
  const upper = (type || "").toUpperCase();
  switch (upper) {
    case "LEARN_VOCAB":
    case "DO_VOCAB":
      return { actionLabel: "Học từ vựng", actionUrl: "/flashcard" };
    case "DO_LISTENING":
      return { actionLabel: "Luyện nghe", actionUrl: "/listening" };
    case "COMPLETE_QUIZ":
      return { actionLabel: "Làm bài kiểm tra", actionUrl: "/exams" };
    case "DO_SPEAKING":
    case "PRACTICE_SPEAKING":
      return { actionLabel: "Luyện nói", actionUrl: "/speaking" };
    case "COMPLETE_LESSON":
      return { actionLabel: "Mở bài học", actionUrl: "/my-courses" };
    default:
      return { actionLabel: "Khám phá bài học", actionUrl: "/dashboard" };
  }
}

export function clampPercentage(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

export function deriveDailyProgress(completedCount: number, totalCount: number): {
  safeCompleted: number;
  safeTotal: number;
  derivedPercent: number;
} {
  const safeTotal = Math.max(0, Number(totalCount) || 0);
  const safeCompleted = Math.max(
    0,
    Math.min(Number(completedCount) || 0, safeTotal)
  );
  const derivedPercent =
    safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return { safeCompleted, safeTotal, derivedPercent };
}

export function getVietnamDayOfWeek(dateKey?: string): number {
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return (dObj.getUTCDay() + 6) % 7; // 0 for Monday (T2) ... 6 for Sunday (CN)
  }
  const vnFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
  });
  const weekday = vnFormatter.format(new Date());
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return dayMap[weekday] ?? 0;
}

export function getVietnamGreeting(): string {
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourFormatter.format(new Date()), 10);
  if (hour >= 5 && hour < 12) return "Chào buổi sáng";
  if (hour >= 12 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export type FilterPeriod = "today" | "week" | "month" | "all" | "custom";
export type RequiredPlanTier = "FREE" | "PLUS" | "PRO";

export interface FilterPeriodConfig {
  key: FilterPeriod;
  label: string;
  requiredTier: RequiredPlanTier;
}

export const FILTER_PERIODS: FilterPeriodConfig[] = [
  { key: "today", label: "Hôm nay", requiredTier: "FREE" },
  { key: "week", label: "Tuần", requiredTier: "PLUS" },
  { key: "month", label: "Tháng", requiredTier: "PLUS" },
  { key: "all", label: "Tất cả", requiredTier: "PRO" },
  { key: "custom", label: "Tùy chỉnh", requiredTier: "PRO" },
];

export function canAccessFilterPeriod(
  periodKey: FilterPeriod,
  planCode?: string | null
): boolean {
  const code = (planCode ?? "FREE").trim().toUpperCase();
  const cfg = FILTER_PERIODS.find((p) => p.key === periodKey);
  if (!cfg || cfg.requiredTier === "FREE") return true;
  if (cfg.requiredTier === "PLUS") {
    return code === "PLUS" || code === "PRO";
  }
  if (cfg.requiredTier === "PRO") {
    return code === "PRO";
  }
  return false;
}

export type SkillKey = "exam" | "reading" | "listening" | "speaking" | "writing" | "vocab";

export interface SkillPartInfo {
  id: string;
  name: string;
  partNumber?: number;
  href: string;
}

export interface SkillDetailConfig {
  key: SkillKey;
  label: string;
  title: string;
  statLabel3: string;
  statLabel4: string;
  actionHeader: string;
  ctaLabel: string;
  ctaHref: string;
  defaultTarget: number;
  targetUnit: string;
  parts: SkillPartInfo[];
}

export const SKILL_DETAIL_CONFIGS: Record<SkillKey, SkillDetailConfig> = {
  exam: {
    key: "exam",
    label: "Luyện đề",
    title: "LUYỆN ĐỀ",
    statLabel3: "Đề đã luyện",
    statLabel4: "Bài thi thử",
    actionHeader: "ĐÃ LUYỆN",
    ctaLabel: "Luyện đề tiếp",
    ctaHref: "/exams",
    defaultTarget: 1,
    targetUnit: "đề",
    parts: [
      { id: "exam-lr", name: "TOEIC Listening & Reading (200 câu)", href: "/exams?paper=TOEIC_LR" },
      { id: "exam-sw", name: "TOEIC Speaking & Writing (19 bài)", href: "/exams?paper=TOEIC_SW" },
      { id: "exam-4s", name: "TOEIC 4 kỹ năng (Full Bundle)", href: "/exams?paper=TOEIC_4_SKILLS" },
      { id: "exam-mini", name: "TOEIC Mini Practice (Rút gọn)", href: "/exams" },
    ],
  },
  reading: {
    key: "reading",
    label: "Đọc",
    title: "ĐỌC",
    statLabel3: "Câu đã đọc",
    statLabel4: "Bài đọc hiểu",
    actionHeader: "ĐÃ ĐỌC",
    ctaLabel: "Luyện đọc tiếp",
    ctaHref: "/reading",
    defaultTarget: 30,
    targetUnit: "câu",
    parts: [
      { id: "read-basic", name: "Đọc hiểu A1 - A2 (Cơ bản)", href: "/reading?difficulty=BASIC" },
      { id: "read-intermediate", name: "Đọc hiểu B1 - B2 (Trung cấp)", href: "/reading?difficulty=INTERMEDIATE" },
      { id: "read-advanced", name: "Đọc hiểu C1 (Nâng cao)", href: "/reading?difficulty=ADVANCED" },
      { id: "read-grammar", name: "Ngữ pháp tiếng Anh (Grammar Foundation)", href: "/reading?category=grammar" },
    ],
  },
  listening: {
    key: "listening",
    label: "Nghe",
    title: "NGHE",
    statLabel3: "Câu đã nghe",
    statLabel4: "Bài nghe chép",
    actionHeader: "ĐÃ NGHE",
    ctaLabel: "Luyện nghe tiếp",
    ctaHref: "/listening",
    defaultTarget: 30,
    targetUnit: "câu",
    parts: [
      { id: "listen-comprehension", name: "Nghe hiểu trắc nghiệm (Comprehension)", href: "/listening?mode=COMPREHENSION" },
      { id: "listen-dictation", name: "Nghe chép chính tả (Dictation)", href: "/listening?mode=DICTATION" },
      { id: "listen-dialogue", name: "Hội thoại phản xạ (Dialogue)", href: "/listening?mode=DIALOGUE" },
    ],
  },
  speaking: {
    key: "speaking",
    label: "Nói",
    title: "NÓI",
    statLabel3: "Lượt đã nói",
    statLabel4: "Bài luyện phát âm",
    actionHeader: "ĐÃ NÓI",
    ctaLabel: "Luyện nói tiếp",
    ctaHref: "/speaking",
    defaultTarget: 10,
    targetUnit: "lượt",
    parts: [
      { id: "speak-read-aloud", name: "Đọc thành tiếng (Read Aloud)", href: "/speaking" },
      { id: "speak-pronunciation", name: "Nền tảng phát âm (Pronunciation)", href: "/speaking" },
      { id: "speak-question-response", name: "Phản hồi câu hỏi (Question & Response)", href: "/speaking" },
      { id: "speak-opinion", name: "Trình bày quan điểm (Express Opinion)", href: "/speaking" },
      { id: "speak-toeic", name: "Nhiệm vụ TOEIC Speaking", href: "/speaking?category=TOEIC" },
    ],
  },
  writing: {
    key: "writing",
    label: "Viết",
    title: "VIẾT",
    statLabel3: "Bài đã viết",
    statLabel4: "Bài luận nộp",
    actionHeader: "ĐÃ VIẾT",
    ctaLabel: "Luyện viết tiếp",
    ctaHref: "/writing",
    defaultTarget: 3,
    targetUnit: "bài",
    parts: [
      { id: "write-sentence", name: "Viết câu theo ngữ cảnh (Sentence Builder)", href: "/writing" },
      { id: "write-email", name: "Viết email công sở (Professional Email)", href: "/writing" },
      { id: "write-opinion", name: "Viết bài luận quan điểm (Opinion Essay)", href: "/writing" },
    ],
  },
  vocab: {
    key: "vocab",
    label: "Flashcard",
    title: "FLASHCARD",
    statLabel3: "Thẻ đã học",
    statLabel4: "Thẻ cần ôn tập",
    actionHeader: "ĐÃ HỌC",
    ctaLabel: "Luyện Flashcard tiếp",
    ctaHref: "/flashcard",
    defaultTarget: 20,
    targetUnit: "thẻ",
    parts: [
      { id: "vocab-toeic", name: "600 từ vựng TOEIC (Văn phòng & Kinh doanh)", href: "/flashcard" },
      { id: "vocab-daily", name: "Tiếng Anh giao tiếp hằng ngày (Đời sống & Thói quen)", href: "/flashcard" },
      { id: "vocab-travel", name: "Giao tiếp thực tế & Du lịch (Di chuyển & Dịch vụ)", href: "/flashcard" },
      { id: "vocab-tech", name: "Tiếng Anh công nghệ & Dự án (Chuyên ngành & IT)", href: "/flashcard" },
    ],
  },
};

export function matchPartActivity(
  skillKey: SkillKey,
  partId: string,
  activity: { type?: string; title?: string; detail?: string | null }
): boolean {
  const title = (activity.title || "").toLowerCase();
  const type = (activity.type || "").toUpperCase();
  const detail = (activity.detail || "").toLowerCase();

  switch (skillKey) {
    case "exam":
      if (!type.includes("TOEIC") && !type.includes("EXAM") && !type.includes("QUIZ")) return false;
      if (partId === "exam-lr") {
        return title.includes("l&r") || title.includes("listening & reading") || title.includes("nghe & đọc");
      }
      if (partId === "exam-sw") {
        return title.includes("s&w") || title.includes("speaking & writing") || title.includes("nói & viết");
      }
      if (partId === "exam-4s") {
        return title.includes("4 kỹ năng") || title.includes("full bundle") || title.includes("4 skill");
      }
      if (partId === "exam-mini") {
        return title.includes("mini") || title.includes("rút gọn");
      }
      return false;

    case "reading":
      if (!type.includes("READING") && !type.includes("GRAMMAR")) return false;
      if (partId === "read-basic") {
        return title.includes("a1") || title.includes("a2") || title.includes("cơ bản") || title.includes("basic");
      }
      if (partId === "read-intermediate") {
        return title.includes("b1") || title.includes("b2") || title.includes("trung cấp") || title.includes("intermediate");
      }
      if (partId === "read-advanced") {
        return title.includes("c1") || title.includes("c2") || title.includes("nâng cao") || title.includes("advanced");
      }
      if (partId === "read-grammar") {
        return type.includes("GRAMMAR") || title.includes("ngữ pháp") || title.includes("grammar");
      }
      return false;

    case "listening":
      if (!type.includes("LISTENING") && !type.includes("DICTATION")) return false;
      if (partId === "listen-comprehension") {
        return (
          title.includes("nghe hiểu") ||
          title.includes("comprehension") ||
          (!title.includes("chép") && !title.includes("dictation") && !title.includes("hội thoại") && !title.includes("dialogue"))
        );
      }
      if (partId === "listen-dictation") {
        return type.includes("DICTATION") || title.includes("nghe chép") || title.includes("chép chính tả") || title.includes("dictation");
      }
      if (partId === "listen-dialogue") {
        return title.includes("hội thoại") || title.includes("dialogue");
      }
      return false;

    case "speaking":
      if (!type.includes("SPEAKING")) return false;
      if (partId === "speak-read-aloud") {
        return title.includes("read aloud") || title.includes("đọc thành tiếng") || title.includes("đọc to");
      }
      if (partId === "speak-pronunciation") {
        return title.includes("pronunciation") || title.includes("phát âm");
      }
      if (partId === "speak-question-response") {
        return title.includes("question response") || title.includes("phản hồi câu hỏi") || title.includes("hỏi đáp");
      }
      if (partId === "speak-opinion") {
        return title.includes("opinion") || title.includes("quan điểm");
      }
      if (partId === "speak-toeic") {
        return title.includes("toeic");
      }
      return false;

    case "writing":
      if (!type.includes("WRITING")) return false;
      if (partId === "write-sentence") {
        return title.includes("sentence") || title.includes("viết câu") || title.includes("builder");
      }
      if (partId === "write-email") {
        return title.includes("email") || title.includes("thư");
      }
      if (partId === "write-opinion") {
        return title.includes("opinion") || title.includes("quan điểm") || title.includes("luận");
      }
      return false;

    case "vocab":
      if (!type.includes("VOCAB")) return false;
      if (partId === "vocab-toeic") {
        return title.includes("600") || title.includes("toeic") || detail.includes("toeic");
      }
      if (partId === "vocab-daily") {
        return title.includes("hằng ngày") || title.includes("daily") || title.includes("routine");
      }
      if (partId === "vocab-travel") {
        return title.includes("du lịch") || title.includes("travel") || title.includes("thực tế");
      }
      if (partId === "vocab-tech") {
        return title.includes("công nghệ") || title.includes("tech") || title.includes("project");
      }
      return false;

    default:
      return false;
  }
}

export function getVietnamFormattedDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  });
  return formatter.format(date);
}

