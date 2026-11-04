import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRate, formatWeek } from "./retentionMetrics.ts";

test("formatRate shows the percent with its counts", () => {
  assert.deepEqual(formatRate({ eligible: 3, hits: 2, rate: 2 / 3 }), {
    percent: "67%",
    detail: "2/3",
  });
});

test("formatRate shows a dash while nothing is final", () => {
  assert.deepEqual(formatRate({ eligible: 0, hits: 0, rate: null }), {
    percent: "—",
    detail: "chưa đủ ngày",
  });
});

test("formatWeek spans Monday to Sunday, across a month end", () => {
  assert.equal(formatWeek("2026-11-02"), "02/11 – 08/11");
  assert.equal(formatWeek("2026-10-26"), "26/10 – 01/11");
});
