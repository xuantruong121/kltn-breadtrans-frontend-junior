import test from "node:test";
import assert from "node:assert/strict";
import {
  computeReadingCardStatus,
  matchesReadingDifficulty,
  matchesExerciseCategory,
  resolveExerciseDifficulty,
  resolveReadingFormatTag,
  resolveReadingPedagogicalDescription,
  resolveReadingSkillTags,
} from "./readingCardLogic.ts";
import type { ReadingTopicItem } from "./ReadingTopicCard.tsx";

test("Reading Card State Machine: accurately detects COMPLETED state", () => {
  const status = computeReadingCardStatus({
    isAuthenticated: true,
    totalArticles: 5,
    completedArticles: 5,
  });
  assert.equal(status, "COMPLETED");
});

test("Reading Card State Machine: accurately detects IN_PROGRESS spotlight state", () => {
  const status = computeReadingCardStatus({
    isAuthenticated: true,
    totalArticles: 5,
    completedArticles: 2,
    isSpotlight: false,
  });
  assert.equal(status, "IN_PROGRESS");
});

test("Reading Card State Machine: accurately detects NOT_STARTED state", () => {
  const status = computeReadingCardStatus({
    isAuthenticated: true,
    totalArticles: 5,
    completedArticles: 0,
    isSpotlight: false,
  });
  assert.equal(status, "NOT_STARTED");
});

test("Reading Card State Machine: accurately detects LOCKED state for guests", () => {
  const status = computeReadingCardStatus({
    isAuthenticated: false,
    totalArticles: 5,
    completedArticles: 0,
  });
  assert.equal(status, "LOCKED");
});

test("Reading Format Tag: resolves topic format accurately", () => {
  const part5Item: ReadingTopicItem = {
    id: 1,
    title: "TOEIC Part 5 — Hoàn thành câu công sở",
    description: "Sample",
  };
  assert.equal(resolveReadingFormatTag(part5Item), "Hoàn thành câu");

  const part6Item: ReadingTopicItem = {
    id: 2,
    title: "TOEIC Part 6 — Điền đoạn văn thông báo nội bộ",
    description: "Sample",
  };
  assert.equal(resolveReadingFormatTag(part6Item), "Điền đoạn văn");

  const part7Item: ReadingTopicItem = {
    id: 3,
    title: "TOEIC Part 7 — Email xác nhận đơn hàng",
    description: "Sample",
  };
  assert.equal(resolveReadingFormatTag(part7Item), "Đoạn đơn - Email");

  const part7MultiItem: ReadingTopicItem = {
    id: 4,
    title: "TOEIC Part 7 Multi — Đoạn kép hóa đơn và email",
    description: "Sample",
  };
  assert.equal(resolveReadingFormatTag(part7MultiItem), "Đoạn kép & Đa đoạn");
});

test("Reading Pedagogical Description: prevents raw passage leakage", () => {
  const secretPassage = "Please be advised that our invoice #98234 has been processed.";
  const item: ReadingTopicItem = {
    id: 5,
    title: "TOEIC Part 7 — Invoice Inquiry",
    description: secretPassage,
  };

  const desc = resolveReadingPedagogicalDescription(item);
  assert.equal(desc.includes(secretPassage), false);
  assert.equal(desc.includes("#98234"), false);
  assert.ok(desc.length > 20);

  const tags = resolveReadingSkillTags(item);
  assert.ok(tags.length >= 1);
  assert.equal(tags.includes("invoice"), false);
});

test("Reading Difficulty Matching: accommodates basic and advanced levels", () => {
  assert.equal(matchesReadingDifficulty("Cơ bản", "BASIC"), true);
  assert.equal(matchesReadingDifficulty("Trung cấp B1", "INTERMEDIATE"), true);
  assert.equal(matchesReadingDifficulty("Nâng cao C1", "ADVANCED"), true);
  assert.equal(matchesReadingDifficulty("Cơ bản", "ADVANCED"), false);
});

test("Reading CEFR Difficulty Resolution: strictly maps A1-A2, B1-B2, C1 and Grammar levels", () => {
  // Reading A1-A2
  const readingA1A2 = { name: "Reading A1–A2", vietnameseName: "Đọc hiểu A1–A2" };
  assert.equal(resolveExerciseDifficulty(readingA1A2), "BASIC");
  assert.equal(matchesReadingDifficulty(readingA1A2, "BASIC"), true);
  assert.equal(matchesReadingDifficulty(readingA1A2, "INTERMEDIATE"), false);
  assert.equal(matchesReadingDifficulty(readingA1A2, "ADVANCED"), false);

  // Reading B1-B2 -> MUST be INTERMEDIATE (Trung cấp), NEVER BASIC
  const readingB1B2 = { name: "Reading B1–B2", vietnameseName: "Đọc hiểu B1–B2" };
  assert.equal(resolveExerciseDifficulty(readingB1B2), "INTERMEDIATE");
  assert.equal(matchesReadingDifficulty(readingB1B2, "BASIC"), false);
  assert.equal(matchesReadingDifficulty(readingB1B2, "INTERMEDIATE"), true);
  assert.equal(matchesReadingDifficulty(readingB1B2, "ADVANCED"), false);

  // Reading C1 -> MUST be ADVANCED (Nâng cao), NEVER BASIC
  const readingC1 = { name: "Reading C1", vietnameseName: "Đọc hiểu C1" };
  assert.equal(resolveExerciseDifficulty(readingC1), "ADVANCED");
  assert.equal(matchesReadingDifficulty(readingC1, "BASIC"), false);
  assert.equal(matchesReadingDifficulty(readingC1, "INTERMEDIATE"), false);
  assert.equal(matchesReadingDifficulty(readingC1, "ADVANCED"), true);

  // Grammar levels
  const grammarBeginner = { title: "Present Simple", level: "BEGINNER" };
  assert.equal(resolveExerciseDifficulty(grammarBeginner), "BASIC");
  assert.equal(matchesReadingDifficulty(grammarBeginner, "BASIC"), true);

  const grammarIntermediate = { title: "Present Perfect", level: "INTERMEDIATE" };
  assert.equal(resolveExerciseDifficulty(grammarIntermediate), "INTERMEDIATE");
  assert.equal(matchesReadingDifficulty(grammarIntermediate, "INTERMEDIATE"), true);

  const grammarAdvanced = { title: "Conditionals", level: "ADVANCED" };
  assert.equal(resolveExerciseDifficulty(grammarAdvanced), "ADVANCED");
  assert.equal(matchesReadingDifficulty(grammarAdvanced, "ADVANCED"), true);
});

test("Reading Category Matching: filters Reading, Grammar, and All correctly", () => {
  assert.equal(matchesExerciseCategory("READING", "ALL"), true);
  assert.equal(matchesExerciseCategory("GRAMMAR", "ALL"), true);
  assert.equal(matchesExerciseCategory("READING", "READING"), true);
  assert.equal(matchesExerciseCategory("GRAMMAR", "READING"), false);
  assert.equal(matchesExerciseCategory("READING", "GRAMMAR"), false);
  assert.equal(matchesExerciseCategory("GRAMMAR", "GRAMMAR"), true);
});
