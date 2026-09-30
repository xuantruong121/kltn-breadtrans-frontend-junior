import test from "node:test";
import assert from "node:assert/strict";
import {
  computePracticeCardStatus,
  matchesDifficulty,
  resolveFormatTag,
  resolvePedagogicalDescription,
  resolveSkillTags,
  type PracticeExerciseItem,
} from "./practiceCardLogic.ts";

test("PracticeCard State Machine: accurately detects COMPLETED state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 4, isCompleted: true },
  });
  assert.equal(status, "COMPLETED");
});

test("PracticeCard State Machine: accurately detects IN_PROGRESS spotlight state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 2, isCompleted: false },
  });
  assert.equal(status, "IN_PROGRESS");
});

test("PracticeCard State Machine: accurately detects NOT_STARTED state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 0, isCompleted: false },
  });
  assert.equal(status, "NOT_STARTED");
});

test("PracticeCard State Machine: accurately detects LOCKED state for unauthenticated guests", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: false,
    practiceSet: { exerciseCount: 4, completedCount: 0, isCompleted: false },
  });
  assert.equal(status, "LOCKED");
});

test("PracticeCard Format Tag: resolves format badge accurately", () => {
  const readAloudEx: PracticeExerciseItem = {
    id: 1,
    title: "Read Aloud — Office Announcement",
    targetText: "Secret prompt sentence that should not leak",
    difficulty: "BEGINNER",
    category: "TOEIC",
  };
  assert.equal(resolveFormatTag(readAloudEx), "Đọc thành tiếng");

  const questionEx: PracticeExerciseItem = {
    id: 2,
    title: "Question Response 1",
    targetText: "Another prompt sentence",
    difficulty: "INTERMEDIATE",
    category: "GENERAL",
  };
  assert.equal(resolveFormatTag(questionEx), "Phản hồi câu hỏi");

  const opinionEx: PracticeExerciseItem = {
    id: 3,
    title: "Express an Opinion",
    targetText: "Another secret prompt",
    difficulty: "ADVANCED",
    category: "TOEIC",
  };
  assert.equal(resolveFormatTag(opinionEx), "Bày tỏ quan điểm");

  const pronunciationEx: PracticeExerciseItem = {
    id: 4,
    title: "Pronunciation Foundations",
    targetText: "Another secret prompt",
    difficulty: "BEGINNER",
    category: "GENERAL",
  };
  assert.equal(resolveFormatTag(pronunciationEx), "Nền tảng phát âm");
});

test("PracticeCard Pedagogical Description: produces concise objective without content leakage", () => {
  const secretSentence =
    "Customers may return unused items within thirty days for a full refund.";
  const exercise: PracticeExerciseItem = {
    id: 10,
    title: "Read Aloud — Store Return Policy",
    targetText: secretSentence,
    difficulty: "BEGINNER",
    category: "TOEIC",
  };

  const desc = resolvePedagogicalDescription(exercise);

  // Must not leak the actual prompt sentence
  assert.equal(desc.includes(secretSentence), false);
  assert.equal(desc.includes("thirty days"), false);
  assert.equal(desc.includes("full refund"), false);
  // Must provide a high-level pedagogical objective
  assert.ok(desc.length > 20);
  assert.ok(
    desc.includes("phát âm") ||
      desc.includes("ngữ điệu") ||
      desc.includes("đọc") ||
      desc.includes("luyện"),
  );
});

test("PracticeCard Skill Tags: resolves high-level skills without vocabulary or phoneme leaks", () => {
  const secretSentence =
    "The financial director confirmed the schedule for the presentation.";
  const exercise: PracticeExerciseItem = {
    id: 11,
    title: "Read Aloud — Presentation Schedule",
    targetText: secretSentence,
    difficulty: "INTERMEDIATE",
    category: "BUSINESS",
  };

  const tags = resolveSkillTags(exercise);

  assert.ok(tags.length >= 1 && tags.length <= 2);
  // Verify no raw prompt words leaked
  assert.equal(tags.includes("financial"), false);
  assert.equal(tags.includes("director"), false);
  assert.equal(tags.includes("presentation"), false);
  // Verify no raw phoneme slashes leaked
  assert.ok(tags.every((t) => !t.includes("/")));
});

test("Difficulty Filter: matches single and composite/hybrid difficulty tags accurately", () => {
  // 1. ALL matches anything
  assert.equal(matchesDifficulty("Cơ bản", "ALL"), true);
  assert.equal(matchesDifficulty("Nâng cao", "ALL"), true);
  assert.equal(matchesDifficulty("ADVANCED", "ALL"), true);
  assert.equal(matchesDifficulty("", "ALL"), true);

  // 2. BASIC matches 'Cơ bản', 'basic', 'beginner'
  assert.equal(matchesDifficulty("Cơ bản", "BASIC"), true);
  assert.equal(matchesDifficulty("BEGINNER", "BASIC"), true);
  assert.equal(matchesDifficulty("basic english", "BASIC"), true);
  assert.equal(matchesDifficulty("Trung cấp", "BASIC"), false);
  assert.equal(matchesDifficulty("Nâng cao", "BASIC"), false);

  // 3. INTERMEDIATE matches 'Trung cấp', 'intermediate'
  assert.equal(matchesDifficulty("Trung cấp", "INTERMEDIATE"), true);
  assert.equal(matchesDifficulty("INTERMEDIATE", "INTERMEDIATE"), true);
  assert.equal(matchesDifficulty("Cơ bản", "INTERMEDIATE"), false);
  assert.equal(matchesDifficulty("Nâng cao", "INTERMEDIATE"), false);

  // 4. ADVANCED matches 'Nâng cao', 'advanced'
  assert.equal(matchesDifficulty("Nâng cao", "ADVANCED"), true);
  assert.equal(matchesDifficulty("ADVANCED", "ADVANCED"), true);
  assert.equal(matchesDifficulty("Cơ bản", "ADVANCED"), false);
  assert.equal(matchesDifficulty("Trung cấp", "ADVANCED"), false);

  // 5. Composite / Hybrid difficulty tags (e.g. 'Cơ bản – Nâng cao', 'Cơ bản - Trung cấp')
  assert.equal(matchesDifficulty("Cơ bản – Nâng cao", "BASIC"), true);
  assert.equal(matchesDifficulty("Cơ bản – Nâng cao", "ADVANCED"), true);
  assert.equal(matchesDifficulty("Cơ bản – Nâng cao", "INTERMEDIATE"), false);

  assert.equal(matchesDifficulty("Cơ bản - Trung cấp", "BASIC"), true);
  assert.equal(matchesDifficulty("Cơ bản - Trung cấp", "INTERMEDIATE"), true);
  assert.equal(matchesDifficulty("Cơ bản - Trung cấp", "ADVANCED"), false);
});
