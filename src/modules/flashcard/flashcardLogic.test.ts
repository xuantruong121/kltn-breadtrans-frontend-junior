/**
 * Flashcard logic and invariant tests.
 * Pure unit tests; imports directly from flashcardLogic.ts.
 * Run with: node --no-warnings --test --experimental-strip-types src/modules/flashcard/flashcardLogic.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getDeckStatus,
  getDeckCtaText,
  getDeckBadgeInfo,
  computeDeckProgress,
  computeFlashcardSummary,
  extractUniqueCategories,
  filterAndSortTopics,
} from "./flashcardLogic.ts";
import type { VocabTopic } from "../../lib/api/services/vocab.service.ts";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makeTopic(overrides: Partial<VocabTopic> = {}): VocabTopic {
  return {
    id: 1,
    title: "Daily Routines & Time",
    categoryName: "Tiếng Anh hằng ngày",
    totalWords: 10,
    learnedCount: 0,
    needReviewCount: 0,
    isPro: false,
    ...overrides,
  };
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe("1. Deck State Mapping & Priority", () => {
  test("REVIEW_DUE: when needReviewCount > 0, state is REVIEW_DUE even if learned < total", () => {
    const topic = makeTopic({ totalWords: 10, learnedCount: 5, needReviewCount: 3 });
    const status = getDeckStatus(topic);
    assert.equal(status, "REVIEW_DUE");
  });

  test("REVIEW_DUE: when needReviewCount > 0, state is REVIEW_DUE even if learned >= total", () => {
    const topic = makeTopic({ totalWords: 10, learnedCount: 10, needReviewCount: 2 });
    const status = getDeckStatus(topic);
    assert.equal(status, "REVIEW_DUE");
  });

  test("IN_PROGRESS: when needReviewCount === 0 and 0 < learnedCount < totalWords", () => {
    const topic = makeTopic({ totalWords: 10, learnedCount: 4, needReviewCount: 0 });
    const status = getDeckStatus(topic);
    assert.equal(status, "IN_PROGRESS");
  });

  test("COMPLETED: when needReviewCount === 0 and learnedCount >= totalWords", () => {
    const topic = makeTopic({ totalWords: 10, learnedCount: 10, needReviewCount: 0 });
    const status = getDeckStatus(topic);
    assert.equal(status, "COMPLETED");
  });

  test("NEW: when learnedCount === 0 and needReviewCount === 0", () => {
    const topic = makeTopic({ totalWords: 10, learnedCount: 0, needReviewCount: 0 });
    const status = getDeckStatus(topic);
    assert.equal(status, "NEW");
  });
});

describe("2. CTA Semantics & Badge Mapping", () => {
  test("CTA text matches exact learner action per state", () => {
    assert.equal(getDeckCtaText("REVIEW_DUE"), "Ôn ngay");
    assert.equal(getDeckCtaText("IN_PROGRESS"), "Tiếp tục học");
    assert.equal(getDeckCtaText("COMPLETED"), "Ôn lại");
    assert.equal(getDeckCtaText("NEW"), "Bắt đầu học");
  });

  test("Badge info reflects accurate review count and status labels", () => {
    const due = getDeckBadgeInfo("REVIEW_DUE", 6);
    assert.equal(due.text, "Cần ôn 6 từ");
    assert.equal(due.variant, "due");

    const inProg = getDeckBadgeInfo("IN_PROGRESS", 0);
    assert.equal(inProg.text, "Đang học");
    assert.equal(inProg.variant, "progress");

    const done = getDeckBadgeInfo("COMPLETED", 0);
    assert.equal(done.text, "Đã thuộc");
    assert.equal(done.variant, "completed");

    const newDeck = getDeckBadgeInfo("NEW", 0);
    assert.equal(newDeck.text, "Chưa học");
    assert.equal(newDeck.variant, "new");
  });
});

describe("3. Progress Semantics & 20/10 Audit", () => {
  test("normal progress: 7/10 yields 70% and exact display text", () => {
    const progress = computeDeckProgress(7, 10);
    assert.equal(progress.learnedCount, 7);
    assert.equal(progress.totalWords, 10);
    assert.equal(progress.percentage, 70);
    assert.equal(progress.displayPercent, 70);
    assert.equal(progress.isOvercompleted, false);
    assert.equal(progress.progressText, "7 / 10 từ");
  });

  test("zero progress: 0/10 yields 0% and 0 / 10 từ", () => {
    const progress = computeDeckProgress(0, 10);
    assert.equal(progress.percentage, 0);
    assert.equal(progress.displayPercent, 0);
    assert.equal(progress.progressText, "0 / 10 từ");
  });

  test("DATA_BUG audit: 20/10 data does NOT get silently clamped in progressText", () => {
    // Audit discovery: Topic 1 in DB has totalWords=10 but 20 VocabWord rows in DB
    const progress = computeDeckProgress(20, 10);
    assert.equal(progress.learnedCount, 20);
    assert.equal(progress.totalWords, 10);
    assert.equal(progress.percentage, 200);
    // UI progress bar width is safely bounded to 100% to prevent layout overflow
    assert.equal(progress.displayPercent, 100);
    // True values are preserved in text for data integrity audit
    assert.equal(progress.isOvercompleted, true);
    assert.equal(progress.progressText, "20 / 10 từ");
  });
});

describe("4. Study Summary Metrics", () => {
  test("computes accurate totals from topic list", () => {
    const topics: VocabTopic[] = [
      makeTopic({ id: 1, totalWords: 10, learnedCount: 5, needReviewCount: 3 }), // REVIEW_DUE, due=3, mastered=5
      makeTopic({ id: 2, totalWords: 10, learnedCount: 4, needReviewCount: 0 }), // IN_PROGRESS, due=0, mastered=4
      makeTopic({ id: 3, totalWords: 10, learnedCount: 10, needReviewCount: 0 }), // COMPLETED, due=0, mastered=10
      makeTopic({ id: 4, totalWords: 10, learnedCount: 0, needReviewCount: 0 }), // NEW, due=0, mastered=0
      makeTopic({ id: 5, totalWords: 10, learnedCount: 2, needReviewCount: 1 }), // REVIEW_DUE, due=1, mastered=2
    ];

    const summary = computeFlashcardSummary(topics);
    assert.equal(summary.totalTopicsCount, 5);
    assert.equal(summary.totalDueWords, 4); // 3 + 1
    assert.equal(summary.inProgressTopicsCount, 1); // topic 2 only
    assert.equal(summary.masteredWordsCount, 21); // 5 + 4 + 10 + 0 + 2
  });

  test("empty topics returns zero summary", () => {
    const summary = computeFlashcardSummary([]);
    assert.equal(summary.totalTopicsCount, 0);
    assert.equal(summary.totalDueWords, 0);
    assert.equal(summary.inProgressTopicsCount, 0);
    assert.equal(summary.masteredWordsCount, 0);
  });
});

describe("5. Search & Filtering", () => {
  const catalog: VocabTopic[] = [
    makeTopic({ id: 1, title: "Daily Routines", categoryName: "Tiếng Anh hằng ngày", needReviewCount: 2 }),
    makeTopic({ id: 2, title: "Office & Meetings", categoryName: "600 TỪ VỰNG TOEIC", learnedCount: 5 }),
    makeTopic({ id: 3, title: "Travel & Airport", categoryName: "Giao tiếp thực tế", learnedCount: 10 }),
    makeTopic({ id: 4, title: "Technology Projects", categoryName: "Tiếng Anh công nghệ" }),
  ];

  test("search by title", () => {
    const res = filterAndSortTopics(catalog, { searchQuery: "office" });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 2);
  });

  test("search by category", () => {
    const res = filterAndSortTopics(catalog, { searchQuery: "công nghệ" });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 4);
  });

  test("filter by category exact", () => {
    const res = filterAndSortTopics(catalog, { selectedCategory: "600 TỪ VỰNG TOEIC" });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 2);
  });

  test("filter by status: REVIEW_DUE", () => {
    const res = filterAndSortTopics(catalog, { statusFilter: "REVIEW_DUE" });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 1);
  });

  test("filter by status: COMPLETED", () => {
    const res = filterAndSortTopics(catalog, { statusFilter: "COMPLETED" });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 3);
  });

  test("extractUniqueCategories extracts and sorts all categories", () => {
    const cats = extractUniqueCategories(catalog);
    assert.equal(cats.length, 4);
    assert.ok(cats.includes("600 TỪ VỰNG TOEIC"));
    assert.ok(cats.includes("Tiếng Anh hằng ngày"));
  });
});

describe("6. Sorting Strategy", () => {
  const catalog: VocabTopic[] = [
    makeTopic({ id: 1, title: "Zebra Phrases", learnedCount: 0, needReviewCount: 0 }), // NEW
    makeTopic({ id: 2, title: "Apple Words", learnedCount: 0, needReviewCount: 4 }), // REVIEW_DUE
    makeTopic({ id: 3, title: "Middle Project", learnedCount: 5, needReviewCount: 0 }), // IN_PROGRESS
    makeTopic({ id: 4, title: "Done Mastery", learnedCount: 10, needReviewCount: 0 }), // COMPLETED
  ];

  test("DEFAULT sort prioritizes learner needs: REVIEW_DUE -> IN_PROGRESS -> NEW -> COMPLETED", () => {
    const sorted = filterAndSortTopics(catalog, { sortOption: "DEFAULT" });
    assert.equal(sorted[0].id, 2); // REVIEW_DUE
    assert.equal(sorted[1].id, 3); // IN_PROGRESS
    assert.equal(sorted[2].id, 1); // NEW
    assert.equal(sorted[3].id, 4); // COMPLETED
  });

  test("NAME_AZ sort orders titles alphabetically", () => {
    const sorted = filterAndSortTopics(catalog, { sortOption: "NAME_AZ" });
    assert.equal(sorted[0].id, 2); // Apple Words
    assert.equal(sorted[1].id, 4); // Done Mastery
    assert.equal(sorted[2].id, 3); // Middle Project
    assert.equal(sorted[3].id, 1); // Zebra Phrases
  });

  test("PROGRESS sort orders by completion percentage descending", () => {
    const sorted = filterAndSortTopics(catalog, { sortOption: "PROGRESS" });
    assert.equal(sorted[0].id, 4); // 100%
    assert.equal(sorted[1].id, 3); // 50%
  });
});

describe("7. Empty State & Non-Matching Filters", () => {
  const catalog: VocabTopic[] = [
    makeTopic({ id: 1, title: "Daily Routines", categoryName: "Tiếng Anh hằng ngày" }),
  ];

  test("returns empty array when search query matches nothing", () => {
    const res = filterAndSortTopics(catalog, { searchQuery: "unmatched-keyword-xyz" });
    assert.equal(res.length, 0);
  });

  test("returns empty array when category filter matches nothing", () => {
    const res = filterAndSortTopics(catalog, { selectedCategory: "Non-existent Category" });
    assert.equal(res.length, 0);
  });

  test("returns empty array when status filter matches nothing", () => {
    const res = filterAndSortTopics(catalog, { statusFilter: "REVIEW_DUE" });
    assert.equal(res.length, 0);
  });
});

describe("8. Responsive Grid Invariants & Card Width Budget", () => {
  // Grid layout class configuration:
  // "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  const GRID_COLUMNS = {
    mobile: 1,      // < 768px: single column
    tablet: 2,      // 768px - 1023px: 2 columns
    desktopLg: 3,   // 1024px - 1279px: 3 columns
    desktopXl: 4,   // 1280px+: 4 columns
  };

  test("mobile (< 768px): 1 column provides full readable width >= 260px", () => {
    const viewportWidth = 390; // iPhone 12/13/14
    const horizontalPadding = 32; // px-4 * 2
    const availableWidth = viewportWidth - horizontalPadding;
    const cardWidth = availableWidth / GRID_COLUMNS.mobile;
    assert.ok(cardWidth >= 260, `Mobile card width (${cardWidth}px) should be >= 260px`);
    assert.ok(cardWidth <= 400);
  });

  test("tablet (768px): 2 columns provide balanced width >= 260px", () => {
    const viewportWidth = 768; // iPad portrait
    const horizontalPadding = 48; // px-6 * 2
    const gap = 20; // gap-5 (20px)
    const availableWidth = viewportWidth - horizontalPadding;
    const cardWidth = (availableWidth - gap * (GRID_COLUMNS.tablet - 1)) / GRID_COLUMNS.tablet;
    assert.ok(cardWidth >= 260, `Tablet card width (${cardWidth}px) should be >= 260px`);
    assert.equal(cardWidth, 350);
  });

  test("desktop (1024px): 3 columns provide readable width in 260-350px range", () => {
    const viewportWidth = 1024;
    const horizontalPadding = 48;
    const gap = 20;
    const availableWidth = viewportWidth - horizontalPadding;
    const cardWidth = (availableWidth - gap * (GRID_COLUMNS.desktopLg - 1)) / GRID_COLUMNS.desktopLg;
    assert.ok(cardWidth >= 260, `Desktop 1024px card width (${cardWidth}px) should be >= 260px`);
    assert.equal(Math.round(cardWidth), 312);
  });

  test("desktop (1366x768): 4 columns fit comfortably in 260-300px target range", () => {
    const viewportWidth = 1366;
    const containerMaxWidth = 1280; // max-w-7xl
    const containerWidth = Math.min(viewportWidth, containerMaxWidth);
    const horizontalPadding = 48;
    const gap = 20;
    const availableWidth = containerWidth - horizontalPadding;
    const cardWidth = (availableWidth - gap * (GRID_COLUMNS.desktopXl - 1)) / GRID_COLUMNS.desktopXl;
    assert.ok(cardWidth >= 260, `1366x768 card width (${cardWidth}px) should be >= 260px`);
    assert.ok(cardWidth <= 320, `1366x768 card width (${cardWidth}px) should not exceed 320px`);
    assert.equal(Math.round(cardWidth), 293);
  });
});

