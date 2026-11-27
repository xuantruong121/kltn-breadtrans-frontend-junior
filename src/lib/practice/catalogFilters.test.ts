import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DIFFICULTY_PARAMS,
  filterFromParam,
  catalogLevelLabel,
  matchesDifficultyFilter,
  parseCatalogSort,
  sortByLevel,
} from "./catalogFilters.ts";

test("the practice level the API sends is the label and the filter (owner 2026-11-27)", () => {
  assert.equal(catalogLevelLabel("STARTER"), "Mất gốc");
  assert.equal(catalogLevelLabel("BASIC"), "Cơ bản");
  assert.equal(catalogLevelLabel("INTERMEDIATE"), "Trung cấp");
  assert.equal(catalogLevelLabel("ADVANCED"), "Nâng cao");
  assert.equal(matchesDifficultyFilter("INTERMEDIATE", "INTERMEDIATE"), true);
  assert.equal(matchesDifficultyFilter("INTERMEDIATE", "BASIC"), false);
  assert.equal(matchesDifficultyFilter("STARTER", "STARTER"), true);
});

test("an old CEFR code is not a level: no label, only under Tất cả", () => {
  assert.equal(catalogLevelLabel("B1"), null);
  assert.equal(matchesDifficultyFilter("B1", "INTERMEDIATE"), false);
  assert.equal(matchesDifficultyFilter("B1", "ALL"), true);
});

test("an item with no level is shown only under Tất cả", () => {
  assert.equal(catalogLevelLabel(null), null);
  assert.equal(matchesDifficultyFilter(undefined, "ALL"), true);
  assert.equal(matchesDifficultyFilter(undefined, "BASIC"), false);
});

test("Dễ → Khó orders Mất gốc → Nâng cao across the whole list, stable within a level", () => {
  const items = [
    { id: 19, l: "ADVANCED" },
    { id: 18, l: "INTERMEDIATE" },
    { id: 17, l: "BASIC" },
    { id: 7, l: "STARTER" },
    { id: 4, l: "INTERMEDIATE" },
    { id: 3, l: "BASIC" },
    { id: 99, l: null },
  ];
  const easy = sortByLevel(items, "EASY_TO_HARD", (i) => i.l).map((i) => i.id);
  assert.deepEqual(easy, [7, 17, 3, 18, 4, 19, 99]);
  const hard = sortByLevel(items, "HARD_TO_EASY", (i) => i.l).map((i) => i.id);
  assert.deepEqual(hard, [19, 18, 4, 17, 3, 7, 99]);
  // the input is not mutated
  assert.equal(items[0].id, 19);
});

test("the default sort is Dễ → Khó", () => {
  assert.equal(parseCatalogSort(null), "EASY_TO_HARD");
  assert.equal(parseCatalogSort("NAME_ASC"), "EASY_TO_HARD");
  assert.equal(parseCatalogSort("HARD_TO_EASY"), "HARD_TO_EASY");
});

test("a filter in a link opens the catalog filtered, and an unknown one does not empty it", () => {
  assert.equal(filterFromParam("advanced", DIFFICULTY_PARAMS, "ALL"), "ADVANCED");
  assert.equal(filterFromParam("DICTATION", ["COMPREHENSION", "DICTATION", "DIALOGUE"], "ALL"), "DICTATION");
  assert.equal(filterFromParam("MINI", ["TOEIC_LR", "TOEIC_SW", "TOEIC_4_SKILLS"], "ALL"), "ALL");
  assert.equal(filterFromParam(null, DIFFICULTY_PARAMS, "ALL"), "ALL");
});
