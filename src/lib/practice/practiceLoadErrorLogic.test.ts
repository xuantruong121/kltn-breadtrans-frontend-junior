import assert from "node:assert/strict";
import test from "node:test";

import { classifyPracticeLoadError } from "./practiceLoadErrorLogic.ts";

const http = (status: number, data: unknown = {}) => ({ response: { status, data } });

test("a plan lock is a lock, with the plan the server names", () => {
  const body = {
    statusCode: 403,
    message: "Bài luyện này yêu cầu gói PRO.",
    error: { code: "FEATURE_NOT_INCLUDED", featureKey: "PREMIUM_SPEAKING_CONTENT", requiredPlan: "PRO" },
  };
  assert.deepEqual(classifyPracticeLoadError(http(403, body)), { kind: "LOCKED", requiredPlan: "PRO" });
  assert.deepEqual(
    classifyPracticeLoadError(http(403, { error: { code: "FEATURE_NOT_INCLUDED", featureKey: "OTHER", requiredPlan: "PLUS" } })),
    { kind: "LOCKED", requiredPlan: "PLUS" },
  );
});

test("a level lock names the skill, the level and any plan also needed", () => {
  const body = (extra = {}) => ({
    message: "Bài luyện này thuộc mức Trung cấp, bạn chưa mở mức này.",
    error: { code: "LEVEL_LOCKED", skill: "READING", level: "INTERMEDIATE", unlockedLevel: "BASIC", ...extra },
  });
  assert.deepEqual(classifyPracticeLoadError(http(403, body())), {
    kind: "LEVEL_LOCKED",
    skill: "READING",
    level: "INTERMEDIATE",
    requiredPlan: null,
  });
  assert.deepEqual(classifyPracticeLoadError(http(403, body({ requiredPlan: "PRO" }))), {
    kind: "LEVEL_LOCKED",
    skill: "READING",
    level: "INTERMEDIATE",
    requiredPlan: "PRO",
  });
});

test("only a 404 is reported as not found", () => {
  assert.deepEqual(classifyPracticeLoadError(http(404)), { kind: "NOT_FOUND" });
  assert.deepEqual(classifyPracticeLoadError(http(401)), { kind: "AUTH" });
  assert.deepEqual(classifyPracticeLoadError(http(403, { message: "Bạn phải đổi mật khẩu" })), { kind: "FAILED" });
  assert.deepEqual(classifyPracticeLoadError(http(500)), { kind: "FAILED" });
  assert.deepEqual(classifyPracticeLoadError(new Error("Network Error")), { kind: "FAILED" });
  assert.equal(classifyPracticeLoadError(null), null);
});
