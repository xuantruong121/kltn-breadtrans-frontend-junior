import assert from "node:assert/strict";
import { test } from "node:test";

import { aiQuotaExhausted, offersUpgrade, remainingText, usedPercent } from "./aiQuota.ts";

const refusal = (data: Record<string, unknown>, status = 429) => ({ response: { status, data } });

test("the out-of-gradings refusal is told apart from other errors", () => {
  assert.deepEqual(
    aiQuotaExhausted(
      refusal({
        error: "AI_QUOTA_EXHAUSTED",
        message: "Bạn đã dùng hết 10 lượt AI chấm của hôm nay (gói Free).",
        quota: { limit: 10, planCode: "FREE" },
      }),
    ),
    { message: "Bạn đã dùng hết 10 lượt AI chấm của hôm nay (gói Free).", planCode: "FREE", limit: 10 },
  );
  // Another 429 ("thao tác quá nhanh") and a plain error are not this.
  assert.equal(aiQuotaExhausted(refusal({ error: "Too Many Requests", message: "x" })), null);
  assert.equal(aiQuotaExhausted(refusal({ error: "AI_QUOTA_EXHAUSTED" }, 400)), null);
  assert.equal(aiQuotaExhausted(new Error("boom")), null);
  assert.equal(aiQuotaExhausted(null), null);
  // Without the quota details it still reads, with a fixed sentence if needed.
  const bare = aiQuotaExhausted(refusal({ error: "AI_QUOTA_EXHAUSTED" }));
  assert.equal(bare?.planCode, null);
  assert.match(bare?.message ?? "", /hết lượt AI chấm/);
});

test("a Pro learner is not offered a bigger plan", () => {
  assert.equal(offersUpgrade("PRO"), false);
  assert.equal(offersUpgrade("FREE"), true);
  assert.equal(offersUpgrade(null), true);
});

test("usage lines", () => {
  assert.equal(remainingText({ limit: 10, used: 3, remaining: 7 }), "còn 7/10 lượt");
  assert.equal(usedPercent({ limit: 10, used: 3, remaining: 7 }), 30);
  assert.equal(usedPercent({ limit: 10, used: 10, remaining: 0 }), 100);
  assert.equal(usedPercent({ limit: 0, used: 0, remaining: 0 }), 100);
});
