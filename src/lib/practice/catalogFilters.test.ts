import { test } from "node:test";
import assert from "node:assert/strict";

import {
  catalogLevelBand,
  catalogLevelLabel,
  matchesDifficultyFilter,
  parseCatalogSort,
  sortByLevel,
} from "./catalogFilters.ts";

test("B1 is Trung cấp, never Cơ bản", () => {
  assert.equal(catalogLevelLabel("B1"), "Trung cấp · B1");
  assert.equal(catalogLevelBand("B1"), "INTERMEDIATE");
  assert.equal(matchesDifficultyFilter("B1", "BASIC"), false);
  assert.equal(matchesDifficultyFilter("B1", "INTERMEDIATE"), true);
});

test("bands follow A1–A2 / B1–B2 / C1–C2; a range uses its highest level", () => {
  assert.equal(catalogLevelLabel("A1-A2"), "Cơ bản · A1–A2");
  assert.equal(catalogLevelLabel("B1-B2"), "Trung cấp · B1–B2");
  assert.equal(catalogLevelLabel("B2-C1"), "Nâng cao · B2–C1");
  assert.equal(catalogLevelBand("A2–B1"), "INTERMEDIATE");
  assert.equal(catalogLevelBand("C1"), "ADVANCED");
});

test("an unknown level is shown only under Tất cả", () => {
  assert.equal(catalogLevelLabel(null), null);
  assert.equal(matchesDifficultyFilter(undefined, "ALL"), true);
  assert.equal(matchesDifficultyFilter(undefined, "BASIC"), false);
});

test("Dễ → Khó orders A1 → C2 across the whole list, stable within a level", () => {
  const items = [
    { id: 19, l: "B2-C1" },
    { id: 18, l: "B1" },
    { id: 17, l: "A2" },
    { id: 7, l: "B2" },
    { id: 4, l: "B1" },
    { id: 3, l: "A2" },
    { id: 99, l: null },
  ];
  const easy = sortByLevel(items, "EASY_TO_HARD", (i) => i.l).map((i) => i.id);
  assert.deepEqual(easy, [17, 3, 18, 4, 7, 19, 99]);
  const hard = sortByLevel(items, "HARD_TO_EASY", (i) => i.l).map((i) => i.id);
  assert.deepEqual(hard, [19, 7, 18, 4, 17, 3, 99]);
  // the input is not mutated
  assert.equal(items[0].id, 19);
});

test("the default sort is Dễ → Khó", () => {
  assert.equal(parseCatalogSort(null), "EASY_TO_HARD");
  assert.equal(parseCatalogSort("NAME_ASC"), "EASY_TO_HARD");
  assert.equal(parseCatalogSort("HARD_TO_EASY"), "HARD_TO_EASY");
});
