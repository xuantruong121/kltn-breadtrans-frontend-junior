import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIRMATION_LABEL,
  STATUS_LABEL,
  VERDICT_LABEL,
  confirmationFor,
  provenanceLines,
  providerModel,
  skipReasonLabel,
  verdictDetail,
  type GroupReview,
  type ReviewStep,
} from "./answerReview.ts";

const step = (over: Partial<ReviewStep> = {}): ReviewStep => ({
  provider: "cloudflare",
  model: "@cf/openai/gpt-oss-120b",
  modelVendor: "openai",
  reviewKind: "INDEPENDENT",
  status: "OK",
  at: "t",
  ...over,
});

const review = (over: Partial<GroupReview> = {}): GroupReview => ({
  status: "REVIEWED_INDEPENDENT",
  contentHash: "h",
  steps: {},
  verdicts: [],
  ...over,
});

test("labels every status, verdict and confirmation method", () => {
  assert.equal(Object.keys(STATUS_LABEL).length, 7);
  assert.equal(Object.keys(VERDICT_LABEL).length, 8);
  assert.equal(Object.keys(CONFIRMATION_LABEL).length, 4);
});

test("names the provider and model that really answered", () => {
  assert.equal(providerModel(step()), "Cloudflare gpt-oss-120b");
  assert.equal(
    providerModel(step({ provider: "gemini", model: "gemini-3.5-flash-lite" })),
    "Gemini gemini-3.5-flash-lite",
  );
  assert.equal(
    providerModel(step({ provider: "openai-compatible", model: "qwen2.5:7b" })),
    "OpenAI-compatible qwen2.5:7b",
  );
});

test("separate provenance lines for the answer, the explanation and the photo", () => {
  const lines = provenanceLines(
    review({
      steps: {
        independentSolve: step(),
        explanationCheck: step({
          provider: "gemini",
          model: "gemini-x",
          reviewKind: "SAME_PROVIDER",
        }),
      },
    }),
  );
  assert.deepEqual(lines, [
    "Đáp án: kiểm định độc lập bởi Cloudflare gpt-oss-120b",
    "Giải thích: kiểm tra bởi Gemini gemini-x, cùng hãng với model sinh đề",
  ]);
  const vision = provenanceLines(
    review({
      status: "NEEDS_ADMIN_CONFIRM",
      steps: {
        part1VisionReview: step({ provider: "gemini", model: "gemini-v", reviewKind: "SAME_PROVIDER" }),
      },
    }),
  );
  assert.deepEqual(vision, ["Ảnh Part 1: Gemini gemini-v Vision, cần admin xác nhận"]);
});

test("a confirmed group stops asking for the admin", () => {
  const confirmed = (fromStatus: GroupReview["status"]) => ({
    by: 1,
    at: "t",
    contentHash: "h",
    method: fromStatus === "NEEDS_ADMIN_CONFIRM" ? ("AFTER_VISION" as const) : ("AFTER_DEGRADED_REVIEW" as const),
    fromStatus,
  });
  const vision = provenanceLines(
    review({
      status: "ADMIN_CONFIRMED",
      steps: {
        part1VisionReview: step({ provider: "gemini", model: "gemini-v", reviewKind: "SAME_PROVIDER" }),
      },
      confirmed: confirmed("NEEDS_ADMIN_CONFIRM"),
    }),
  );
  assert.deepEqual(vision, ["Ảnh Part 1: Gemini gemini-v Vision", "Xác nhận sau kiểm tra Vision"]);
  const [solve] = provenanceLines(
    review({
      status: "ADMIN_CONFIRMED",
      steps: {
        independentSolve: step({ provider: "gemini", model: "gemini-x", reviewKind: "SAME_PROVIDER" }),
      },
      confirmed: confirmed("REVIEWED_DEGRADED"),
    }),
  );
  assert.equal(solve, "Đáp án: kiểm tra bởi Gemini gemini-x, cùng hãng với model sinh đề");
});

test("a same-vendor solve uses the real provider, not a fixed Gemini wording", () => {
  const [line] = provenanceLines(
    review({
      status: "REVIEWED_DEGRADED",
      steps: {
        independentSolve: step({ model: "@cf/google/gemma-3-12b-it", reviewKind: "SAME_PROVIDER" }),
      },
    }),
  );
  assert.equal(
    line,
    "Đáp án: kiểm tra bởi Cloudflare gemma-3-12b-it, cùng hãng với model sinh đề, cần admin xác nhận",
  );
});

test("never claims a step that failed", () => {
  const [line] = provenanceLines(
    review({ status: "UNREVIEWED", steps: { independentSolve: step({ status: "UNAVAILABLE", provider: null, model: null }) } }),
  );
  assert.match(line, /chưa kiểm định được/);
  assert.doesNotMatch(line, /độc lập/);
});

test("a manual confirmation says no AI review was done", () => {
  const lines = provenanceLines(
    review({
      status: "ADMIN_CONFIRMED",
      confirmed: { by: 1, at: "t", contentHash: "h", method: "MANUAL_REVIEW", fromStatus: "UNREVIEWED" },
    }),
  );
  assert.deepEqual(lines, ["Xác nhận thủ công, không có kiểm định AI"]);
});

test("offers only the confirmations of the table", () => {
  assert.equal(confirmationFor(3, review({ status: "REVIEWED_DEGRADED" })), "AFTER_DEGRADED_REVIEW");
  assert.equal(confirmationFor(3, null), "MANUAL_REVIEW");
  assert.equal(confirmationFor(3, review({ status: "REJECTED" })), null);
  assert.equal(confirmationFor(3, review({ status: "REVIEWED_INDEPENDENT" })), null);
  assert.equal(
    confirmationFor(3, review({ status: "UNREVIEWED", steps: { independentSolve: step({ status: "UNAVAILABLE" }) } })),
    null,
  );
  assert.equal(confirmationFor(1, review({ status: "NEEDS_ADMIN_CONFIRM" })), "AFTER_VISION");
  assert.equal(confirmationFor(1, review({ status: "UNREVIEWED" })), "MANUAL_NO_VISION");
  assert.equal(confirmationFor(1, review({ status: "REJECTED" })), null);
});

test("explains the first failing check and the reason a group was held back", () => {
  assert.equal(
    verdictDetail({
      questionNumber: 7,
      verdict: "EXPLANATION_MISMATCH",
      solve: { verdict: "AGREE", detail: "ok" },
      explanation: { verdict: "EXPLANATION_MISMATCH", detail: "Giải thích bảo vệ B" },
    }),
    "Giải thích bảo vệ B",
  );
  assert.equal(skipReasonLabel("HASH_MISMATCH"), "nội dung đã đổi sau lần kiểm định");
  assert.equal(
    skipReasonLabel("STRUCTURE_INVALID: AI trả về giải thích không đủ chất lượng"),
    "lỗi cấu trúc: AI trả về giải thích không đủ chất lượng",
  );
});
