import assert from "node:assert/strict";
import test from "node:test";

import { catalogPage } from "./catalogPage.ts";

const items = Array.from({ length: 25 }, (_, i) => i);

test("a page holds its slice of the list", () => {
  assert.deepEqual(catalogPage(items, 1, 12).items, items.slice(0, 12));
  assert.deepEqual(catalogPage(items, 3, 12).items, [24]);
  assert.equal(catalogPage(items, 1, 12).totalPages, 3);
});

test("a list that shrank keeps the reader on its last page", () => {
  const page = catalogPage(items.slice(0, 5), 3, 12);
  assert.equal(page.page, 1);
  assert.deepEqual(page.items, items.slice(0, 5));
});

test("an empty list still has one page", () => {
  assert.deepEqual(catalogPage([], 1, 12), { items: [], page: 1, totalPages: 1 });
});
