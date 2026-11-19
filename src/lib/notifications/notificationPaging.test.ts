import test from "node:test";
import assert from "node:assert/strict";

import { NOTIFICATION_PAGE_SIZES, servedPage } from "./notificationPaging.ts";

test("the notifications page offers 10, 20 and 50 a page", () => {
  assert.deepEqual(NOTIFICATION_PAGE_SIZES, [10, 20, 50]);
});

test("the page follows what the server served", () => {
  assert.equal(servedPage(2, { page: 2 }), 2);
  // The last item of page 3 was deleted: the server answers with page 2.
  assert.equal(servedPage(3, { page: 2 }), 2);
  // Still loading, or an answer without page numbers: keep the request.
  assert.equal(servedPage(3, undefined), 3);
  assert.equal(servedPage(3, {}), 3);
});
