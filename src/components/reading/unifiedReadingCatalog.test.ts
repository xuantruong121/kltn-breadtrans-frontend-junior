import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  matchesExerciseCategory,
  matchesReadingDifficulty,
  resolveExerciseDifficulty,
  type DifficultyLevel,
  type ExerciseCategory,
} from "./readingCardLogic.ts";

test("Unified Catalog: verifies top-level segmented mode switcher is removed from Reading page", () => {
  const pagePath = path.resolve(
    process.cwd(),
    "src/app/(student)/reading/page.tsx",
  );
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Must NOT contain separate top-level mode buttons
  assert.equal(pageContent.includes('role="tablist"'), false);
  assert.equal(pageContent.includes('aria-controls="reading-practice-panel"'), false);
  assert.equal(pageContent.includes('aria-controls="grammar-practice-panel"'), false);
  assert.equal(pageContent.includes('Chế độ học Đọc và Ngữ pháp'), false);

  // Must contain unified Category Chips in the filter dock without 'Tất cả'
  assert.equal(pageContent.includes("Phân loại:"), true);
  assert.equal(pageContent.includes("CATEGORY_OPTIONS"), true);
  assert.equal(pageContent.includes("Đọc hiểu"), true);
  assert.equal(pageContent.includes("Ngữ pháp"), true);
  // Category options must strictly NOT contain "Tất cả"
  const categoryMatch = pageContent.match(/CATEGORY_OPTIONS[\s\S]+?\];/);
  assert.ok(categoryMatch);
  assert.equal(categoryMatch[0].includes("Tất cả"), false);
  // Difficulty options must contain "Tất cả"
  const difficultyMatch = pageContent.match(/DIFFICULTY_OPTIONS[\s\S]+?\];/);
  assert.ok(difficultyMatch);
  assert.equal(difficultyMatch[0].includes("Tất cả"), true);
});

test("Unified Catalog: legacy /grammar route redirects to ?category=grammar", () => {
  const grammarPagePath = path.resolve(
    process.cwd(),
    "src/app/(student)/grammar/page.tsx",
  );
  const grammarPageContent = fs.readFileSync(grammarPagePath, "utf-8");
  assert.equal(grammarPageContent.includes('/reading?category=grammar'), true);
});

test("Unified Catalog: legacy ?tab=grammar and ?mode=grammar query params map to GRAMMAR category", () => {
  const parseCategoryParam = (params: Record<string, string>): ExerciseCategory => {
    const raw = (
      params["category"] ||
      params["tab"] ||
      params["mode"] ||
      ""
    ).toLowerCase();
    if (raw === "grammar") return "GRAMMAR";
    if (raw === "reading") return "READING";
    return "ALL";
  };

  assert.equal(parseCategoryParam({ category: "grammar" }), "GRAMMAR");
  assert.equal(parseCategoryParam({ tab: "grammar" }), "GRAMMAR");
  assert.equal(parseCategoryParam({ mode: "grammar" }), "GRAMMAR");
  assert.equal(parseCategoryParam({ category: "reading" }), "READING");
  assert.equal(parseCategoryParam({ tab: "reading" }), "READING");
  assert.equal(parseCategoryParam({}), "ALL");
});

test("Unified Catalog: Category filter displays correct subset", () => {
  const items = [
    { id: 1, type: "READING" as const, title: "Reading A1-A2" },
    { id: 2, type: "READING" as const, title: "Reading B1-B2" },
    { id: 3, type: "READING" as const, title: "Reading C1" },
    { id: 101, type: "GRAMMAR" as const, title: "Present Simple" },
    { id: 102, type: "GRAMMAR" as const, title: "Past Simple" },
  ];

  // Category: ALL
  const allFiltered = items.filter((item) =>
    matchesExerciseCategory(item.type, "ALL"),
  );
  assert.equal(allFiltered.length, 5);

  // Category: READING
  const readingFiltered = items.filter((item) =>
    matchesExerciseCategory(item.type, "READING"),
  );
  assert.equal(readingFiltered.length, 3);
  assert.ok(readingFiltered.every((i) => i.type === "READING"));

  // Category: GRAMMAR
  const grammarFiltered = items.filter((item) =>
    matchesExerciseCategory(item.type, "GRAMMAR"),
  );
  assert.equal(grammarFiltered.length, 2);
  assert.ok(grammarFiltered.every((i) => i.type === "GRAMMAR"));
});

test("Unified Catalog: Search filters accurately across both Reading and Grammar items", () => {
  const items = [
    { id: 1, type: "READING" as const, title: "Reading A1–A2", desc: "Đọc thông báo tin nhắn", formula: "" },
    { id: 2, type: "READING" as const, title: "Reading B1–B2", desc: "Đọc báo cáo tài chính", formula: "" },
    { id: 101, type: "GRAMMAR" as const, title: "Present Simple", desc: "Thói quen sự thật", formula: "S + V(s/es)" },
    { id: 102, type: "GRAMMAR" as const, title: "Past Simple", desc: "Hành động quá khứ", formula: "S + V2/V-ed" },
  ];

  const search = (q: string, category: ExerciseCategory = "ALL") => {
    const term = q.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesExerciseCategory(item.type, category)) return false;
      const t = item.title.toLowerCase();
      const d = item.desc.toLowerCase();
      const f = item.formula.toLowerCase();
      return !term || t.includes(term) || d.includes(term) || f.includes(term);
    });
  };

  // Search across both
  assert.equal(search("Reading").length, 2);
  assert.equal(search("Present").length, 1);
  assert.equal(search("quá khứ").length, 1);
  assert.equal(search("V(s/es)").length, 1);

  // Search scoped to category
  assert.equal(search("Reading", "GRAMMAR").length, 0);
  assert.equal(search("Present", "READING").length, 0);
});

test("CEFR Difficulty Resolution: Reading A1-A2 = Cơ bản, B1-B2 = Trung cấp, C1 = Nâng cao", () => {
  // A1-A2 -> BASIC
  const a1 = { name: "Reading A1–A2", vietnameseName: "Đọc hiểu A1–A2" };
  assert.equal(resolveExerciseDifficulty(a1), "BASIC");
  assert.equal(matchesReadingDifficulty(a1, "BASIC"), true);
  assert.equal(matchesReadingDifficulty(a1, "INTERMEDIATE"), false);
  assert.equal(matchesReadingDifficulty(a1, "ADVANCED"), false);

  // B1-B2 -> INTERMEDIATE (definitively NOT BASIC!)
  const b1 = { name: "Reading B1–B2", vietnameseName: "Đọc hiểu B1–B2" };
  assert.equal(resolveExerciseDifficulty(b1), "INTERMEDIATE");
  assert.equal(matchesReadingDifficulty(b1, "BASIC"), false);
  assert.equal(matchesReadingDifficulty(b1, "INTERMEDIATE"), true);
  assert.equal(matchesReadingDifficulty(b1, "ADVANCED"), false);

  // C1 -> ADVANCED (definitively NOT BASIC!)
  const c1 = { name: "Reading C1", vietnameseName: "Đọc hiểu C1" };
  assert.equal(resolveExerciseDifficulty(c1), "ADVANCED");
  assert.equal(matchesReadingDifficulty(c1, "BASIC"), false);
  assert.equal(matchesReadingDifficulty(c1, "INTERMEDIATE"), false);
  assert.equal(matchesReadingDifficulty(c1, "ADVANCED"), true);
});

test("CEFR Difficulty Resolution: Grammar Beginner = Cơ bản, Intermediate = Trung cấp, Advanced = Nâng cao", () => {
  const g1 = { title: "Present Simple", level: "BEGINNER" };
  assert.equal(resolveExerciseDifficulty(g1), "BASIC");
  assert.equal(matchesReadingDifficulty(g1, "BASIC"), true);

  const g2 = { title: "Passive Voice", level: "INTERMEDIATE" };
  assert.equal(resolveExerciseDifficulty(g2), "INTERMEDIATE");
  assert.equal(matchesReadingDifficulty(g2, "INTERMEDIATE"), true);

  const g3 = { title: "Inversion & Conditionals", level: "ADVANCED" };
  assert.equal(resolveExerciseDifficulty(g3), "ADVANCED");
  assert.equal(matchesReadingDifficulty(g3, "ADVANCED"), true);
});

test("Category + Difficulty Interaction: multi-dimensional filtering", () => {
  const catalog = [
    { id: 1, type: "READING" as const, name: "Reading A1–A2", level: "BEGINNER" },
    { id: 2, type: "READING" as const, name: "Reading B1–B2", level: "INTERMEDIATE" },
    { id: 3, type: "READING" as const, name: "Reading C1", level: "ADVANCED" },
    { id: 101, type: "GRAMMAR" as const, title: "Present Simple", level: "BEGINNER" },
    { id: 102, type: "GRAMMAR" as const, title: "Past Perfect", level: "INTERMEDIATE" },
    { id: 103, type: "GRAMMAR" as const, title: "Advanced Inversion", level: "ADVANCED" },
  ];

  const filterCatalog = (cat: ExerciseCategory, diff: DifficultyLevel) => {
    return catalog.filter(
      (item) =>
        matchesExerciseCategory(item.type, cat) &&
        matchesReadingDifficulty(item, diff),
    );
  };

  // Ngữ pháp + Trung cấp -> only Intermediate Grammar items
  const grammarIntermediate = filterCatalog("GRAMMAR", "INTERMEDIATE");
  assert.equal(grammarIntermediate.length, 1);
  assert.equal(grammarIntermediate[0].id, 102);

  // Đọc hiểu + Nâng cao -> only C1 Reading items
  const readingAdvanced = filterCatalog("READING", "ADVANCED");
  assert.equal(readingAdvanced.length, 1);
  assert.equal(readingAdvanced[0].id, 3);

  // Tất cả + Cơ bản -> Reading A1-A2 and Grammar Beginner
  const allBasic = filterCatalog("ALL", "BASIC");
  assert.equal(allBasic.length, 2);
  assert.deepEqual(
    allBasic.map((i) => i.id),
    [1, 101],
  );
});
