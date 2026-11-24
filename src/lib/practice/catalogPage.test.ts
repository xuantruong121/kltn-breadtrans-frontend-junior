import assert from "node:assert/strict";
import test from "node:test";

import { PICTURE_CATALOG_PAGE_SIZES, catalogPage } from "./catalogPage.ts";

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

test("a picture page fills whole rows at 5, 4, 2 and 1 columns (owner 2026-11-24)", () => {
  for (const size of PICTURE_CATALOG_PAGE_SIZES)
    for (const columns of [5, 4, 2, 1]) assert.equal(size % columns, 0, `${size} by ${columns}`);
  assert.equal(catalogPage(Array.from({ length: 30 }, (_, i) => i), 2, PICTURE_CATALOG_PAGE_SIZES[0]).items.length, 10);
});
