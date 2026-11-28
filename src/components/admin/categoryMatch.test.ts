import assert from "node:assert/strict";
import test from "node:test";

import { categoryKey, exactCategory, filterCategories, nearCategory, newCategoryName } from "./categoryMatch.ts";

const OPTIONS = ["600 TỪ VỰNG TOEIC", "Tiếng Anh học thuật", "Tiếng Anh công việc", "Đời sống"];

test("the key ignores case, accents, đ and spaces", () => {
  assert.equal(categoryKey("  Tiếng   Anh học THUẬT "), "tieng anh hoc thuat");
  assert.equal(categoryKey("Đời sống"), "doi song");
  assert.equal(categoryKey("   "), "");
});

test("typing filters the list without regard to accents, and nothing typed shows all", () => {
  assert.deepEqual(filterCategories(OPTIONS, "tieng anh"), ["Tiếng Anh học thuật", "Tiếng Anh công việc"]);
  assert.deepEqual(filterCategories(OPTIONS, "cong"), ["Tiếng Anh công việc"]);
  assert.deepEqual(filterCategories(OPTIONS, "doi"), ["Đời sống"]);
  assert.deepEqual(filterCategories(OPTIONS, ""), OPTIONS);
  assert.deepEqual(filterCategories(OPTIONS, "zzz"), []);
});

test("an exact name is found as it is stored, only", () => {
  assert.equal(exactCategory(OPTIONS, "Tiếng Anh học thuật"), "Tiếng Anh học thuật");
  assert.equal(exactCategory(OPTIONS, "  Tiếng  Anh học thuật "), "Tiếng Anh học thuật");
  assert.equal(exactCategory(OPTIONS, "tiếng anh học thuật"), null);
  assert.equal(exactCategory(OPTIONS, ""), null);
});

test("the same name written differently is a near match, so no new group is made by a slip", () => {
  assert.equal(nearCategory(OPTIONS, "tiếng anh học thuật"), "Tiếng Anh học thuật");
  assert.equal(nearCategory(OPTIONS, "Tieng Anh hoc thuat"), "Tiếng Anh học thuật");
  assert.equal(nearCategory(OPTIONS, "doi song"), "Đời sống");
});

test("an exact name or an unrelated one is not a near match", () => {
  assert.equal(nearCategory(OPTIONS, "Tiếng Anh học thuật"), null);
  assert.equal(nearCategory(OPTIONS, "Du lịch"), null);
  assert.equal(nearCategory(OPTIONS, "  "), null);
  // A name that only contains an existing one is a different category.
  assert.equal(nearCategory(OPTIONS, "Tiếng Anh học thuật nâng cao"), null);
});

test("a new category is offered only for a name nobody has, tidied", () => {
  assert.equal(newCategoryName(OPTIONS, "  Du   lịch "), "Du lịch");
  assert.equal(newCategoryName(OPTIONS, "Tiếng Anh học thuật"), null);
  assert.equal(newCategoryName(OPTIONS, "tieng anh hoc thuat"), null); // the near match is offered instead
  assert.equal(newCategoryName(OPTIONS, ""), null);
});
