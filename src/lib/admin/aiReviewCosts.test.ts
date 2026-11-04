import assert from "node:assert/strict";
import { test } from "node:test";
import { averageSeconds, formatUsd, okShare } from "./aiReviewCosts.ts";

test("formatUsd keeps small amounts readable and missing ones blank", () => {
  assert.equal(formatUsd(null), "—");
  assert.equal(formatUsd(0), "$0");
  assert.equal(formatUsd(0.00001), "<$0.0001");
  assert.equal(formatUsd(0.0616063), "$0.0616");
  assert.equal(formatUsd(12.345), "$12.35");
});

test("okShare and averageSeconds handle a model with no calls", () => {
  assert.equal(okShare({ requests: 0, ok: 0 }), null);
  assert.equal(okShare({ requests: 4, ok: 3 }), 0.75);
  assert.equal(averageSeconds({ requests: 0, latencyMs: 0 }), "—");
  assert.equal(averageSeconds({ requests: 59, latencyMs: 212475 }), "3.6 s");
});
