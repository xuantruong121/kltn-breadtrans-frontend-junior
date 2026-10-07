import type { VocabTopic } from "../../lib/api/services/vocab.service.ts";

export type FlashcardDeckStatus = "REVIEW_DUE" | "IN_PROGRESS" | "COMPLETED" | "NEW";

export type FlashcardStatusFilter = "ALL" | FlashcardDeckStatus;

export type FlashcardSortOption = "DEFAULT" | "REVIEW_FIRST" | "PROGRESS" | "NAME_AZ";

export interface DeckProgressInfo {
  learnedCount: number;
  totalWords: number;
  percentage: number;
  displayPercent: number;
  isOvercompleted: boolean;
  progressText: string;
}

export interface FlashcardSummaryMetrics {
  totalDueWords: number;
  inProgressTopicsCount: number;
  masteredWordsCount: number;
  totalTopicsCount: number;
}

export interface FilterOptions {
  searchQuery?: string;
  selectedCategory?: string;
  statusFilter?: FlashcardStatusFilter;
  sortOption?: FlashcardSortOption;
}

/**
 * Determines the primary learning state of a flashcard deck based on spaced repetition review
 * and mastery progress.
 */
export function getDeckStatus(topic: Pick<VocabTopic, "totalWords" | "learnedCount" | "needReviewCount">): FlashcardDeckStatus {
  const needReview = topic.needReviewCount || 0;
  const learned = topic.learnedCount || 0;
  const total = topic.totalWords || 0;

  // Highest priority: spaced repetition reviews are due
  if (needReview > 0) {
    return "REVIEW_DUE";
  }

  // Completed: all words mastered and no reviews currently due
  if (total > 0 && learned >= total) {
    return "COMPLETED";
  }

  // In-progress: started learning, some words mastered but not all
  if (learned > 0 && learned < total) {
    return "IN_PROGRESS";
  }

  // Not started yet
  return "NEW";
}

/**
 * Returns user-facing CTA button label for a given deck status.
 */
export function getDeckCtaText(status: FlashcardDeckStatus): string {
  switch (status) {
    case "REVIEW_DUE":
      return "Ôn ngay";
    case "IN_PROGRESS":
      return "Tiếp tục học";
    case "COMPLETED":
      return "Ôn lại";
    case "NEW":
    default:
      return "Bắt đầu học";
  }
}

/**
 * Returns badge label and visual styling variant for a deck status.
 */
export function getDeckBadgeInfo(
  status: FlashcardDeckStatus,
  needReviewCount: number,
): { text: string; variant: "due" | "progress" | "completed" | "new" } {
  switch (status) {
    case "REVIEW_DUE":
      return {
        text: `Cần ôn ${needReviewCount} từ`,
        variant: "due",
      };
    case "IN_PROGRESS":
      return {
        text: "Đang học",
        variant: "progress",
      };
    case "COMPLETED":
      return {
        text: "Đã thuộc",
        variant: "completed",
      };
    case "NEW":
    default:
      return {
        text: "Chưa học",
        variant: "new",
      };
  }
}

/**
 * Computes deterministic progress metrics.
 * Preserves true learnedCount and totalWords values without artificial clamping in text,
 * while displayPercent is bounded [0, 100] for visual bar rendering.
 */
export function computeDeckProgress(learnedCount: number, totalWords: number): DeckProgressInfo {
  const safeTotal = Math.max(0, totalWords);
  const safeLearned = Math.max(0, learnedCount);
  const percentage = safeTotal > 0 ? Math.round((safeLearned / safeTotal) * 100) : 0;
  const displayPercent = Math.min(100, Math.max(0, percentage));
  const isOvercompleted = safeTotal > 0 && safeLearned > safeTotal;

  return {
    learnedCount: safeLearned,
    totalWords: safeTotal,
    percentage,
    displayPercent,
    isOvercompleted,
    progressText: `${safeLearned} / ${safeTotal} từ`,
  };
}

/**
 * Computes high-level statistics for the compact summary strip.
 * Uses 100% authoritative data from backend response without synthetic estimations.
 */
export function computeFlashcardSummary(topics: VocabTopic[]): FlashcardSummaryMetrics {
  let totalDueWords = 0;
  let inProgressTopicsCount = 0;
  let masteredWordsCount = 0;

  for (const t of topics) {
    totalDueWords += t.needReviewCount || 0;
    masteredWordsCount += t.learnedCount || 0;
    const status = getDeckStatus(t);
    if (status === "IN_PROGRESS") {
      inProgressTopicsCount++;
    }
  }

  return {
    totalDueWords,
    inProgressTopicsCount,
    masteredWordsCount,
    totalTopicsCount: topics.length,
  };
}

/**
 * Extracts unique category names from topic catalog.
 */
export function extractUniqueCategories(topics: VocabTopic[]): string[] {
  const set = new Set<string>();
  for (const t of topics) {
    if (t.categoryName && t.categoryName.trim()) {
      set.add(t.categoryName.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
}

/**
 * Filters and sorts topics deterministically.
 */
export function filterAndSortTopics(topics: VocabTopic[], options: FilterOptions = {}): VocabTopic[] {
  const {
    searchQuery = "",
    selectedCategory = "ALL",
    statusFilter = "ALL",
    sortOption = "DEFAULT",
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 1. Filtering
  const filtered = topics.filter((topic) => {
    // Search filter
    if (normalizedQuery) {
      const matchTitle = topic.title?.toLowerCase().includes(normalizedQuery);
      const matchCategory = topic.categoryName?.toLowerCase().includes(normalizedQuery);
      if (!matchTitle && !matchCategory) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      if (topic.categoryName !== selectedCategory) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "ALL") {
      const status = getDeckStatus(topic);
      if (status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  // 2. Sorting
  return filtered.slice().sort((a, b) => {
    if (sortOption === "REVIEW_FIRST") {
      const diffReview = (b.needReviewCount || 0) - (a.needReviewCount || 0);
      if (diffReview !== 0) return diffReview;
      return (a.title || "").localeCompare(b.title || "", "vi");
    }

    if (sortOption === "PROGRESS") {
      const progressA = computeDeckProgress(a.learnedCount, a.totalWords).percentage;
      const progressB = computeDeckProgress(b.learnedCount, b.totalWords).percentage;
      const diffProgress = progressB - progressA;
      if (diffProgress !== 0) return diffProgress;
      return (b.learnedCount || 0) - (a.learnedCount || 0);
    }

    if (sortOption === "NAME_AZ") {
      return (a.title || "").localeCompare(b.title || "", "vi");
    }

    // DEFAULT: Study-priority order
    // Order: REVIEW_DUE (0) -> IN_PROGRESS (1) -> NEW (2) -> COMPLETED (3)
    const priorityWeight = (status: FlashcardDeckStatus): number => {
      switch (status) {
        case "REVIEW_DUE":
          return 0;
        case "IN_PROGRESS":
          return 1;
        case "NEW":
          return 2;
        case "COMPLETED":
          return 3;
      }
    };

    const statusA = getDeckStatus(a);
    const statusB = getDeckStatus(b);
    const diffPriority = priorityWeight(statusA) - priorityWeight(statusB);
    if (diffPriority !== 0) {
      return diffPriority;
    }

    // If both need review, sort by largest review count first
    if (statusA === "REVIEW_DUE" && statusB === "REVIEW_DUE") {
      return (b.needReviewCount || 0) - (a.needReviewCount || 0);
    }

    // If both in progress, sort by higher progress first
    if (statusA === "IN_PROGRESS" && statusB === "IN_PROGRESS") {
      const pctA = computeDeckProgress(a.learnedCount, a.totalWords).percentage;
      const pctB = computeDeckProgress(b.learnedCount, b.totalWords).percentage;
      return pctB - pctA;
    }

    // Otherwise preserve original topic order (id)
    return (a.id || 0) - (b.id || 0);
  });
}
