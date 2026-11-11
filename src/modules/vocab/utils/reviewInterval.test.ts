import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReviewInterval } from "./reviewInterval.ts";

test("a forgotten word comes back in ten minutes", () => {
  assert.equal(formatReviewInterval(0), "10 phút");
  assert.equal(formatReviewInterval(Number.NaN), "10 phút");
  assert.equal(formatReviewInterval(-3), "10 phút");
});

test("short intervals are said in days", () => {
  assert.equal(formatReviewInterval(1), "1 ngày");
  assert.equal(formatReviewInterval(8), "8 ngày");
  assert.equal(formatReviewInterval(29), "29 ngày");
});

test("long intervals are said in months, then a year", () => {
  assert.equal(formatReviewInterval(30), "1 tháng");
  assert.equal(formatReviewInterval(50), "2 tháng");
  assert.equal(formatReviewInterval(125), "4 tháng");
  assert.equal(formatReviewInterval(365), "1 năm");
});
