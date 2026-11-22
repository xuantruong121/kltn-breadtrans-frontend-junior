import test from "node:test";
import assert from "node:assert/strict";
import {
  addDraftExercises,
  draftExerciseProblem,
  draftFailureToast,
  takeOnce,
} from "./speakingDraftLogic.ts";

const drafted = (over: Record<string, unknown> = {}) => ({
  title: "Greeting",
  targetText: "Hello, nice to meet you.",
  taskType: "READ_ALOUD",
  difficulty: "BEGINNER",
  ...over,
});

test("draftExerciseProblem: a text-only exercise saves as drafted", () => {
  for (const taskType of ["READ_ALOUD", "RESPOND_TO_QUESTION", "EXPRESS_OPINION", "PRONUNCIATION_DRILL"])
    assert.equal(draftExerciseProblem(drafted({ taskType })), null);
});

test("draftExerciseProblem: flags what the server would refuse (QA 2026-11-22)", () => {
  assert.match(
    draftExerciseProblem(drafted({ taskType: "DESCRIBE_PICTURE" })) ?? "",
    /^Câu mô tả tranh cần ảnh đã được kiểm duyệt/,
  );
  assert.match(
    draftExerciseProblem(drafted({ taskType: "RESPOND_USING_INFORMATION" })) ?? "",
    /cần thông tin dùng chung/,
  );
  assert.equal(draftExerciseProblem(drafted({ title: "  " })), "Thiếu tiêu đề.");
  assert.equal(draftExerciseProblem(drafted({ targetText: "" })), "Thiếu câu mẫu.");
  assert.equal(draftExerciseProblem(drafted({ taskType: "SING" })), "Loại bài không hợp lệ.");
  assert.equal(draftExerciseProblem(drafted({ difficulty: "Easy" })), "Cấp độ câu không hợp lệ.");
});

test("draftExerciseProblem: a picture or information task with its media is fine", () => {
  assert.equal(
    draftExerciseProblem(drafted({ taskType: "DESCRIBE_PICTURE", imageUrl: "https://x.r2.dev/a.png" })),
    null,
  );
  assert.equal(draftExerciseProblem(drafted({ taskType: "RESPOND_USING_INFORMATION", stimulusId: 4 })), null);
});

test("addDraftExercises: one refusal is reported, the rest are still added in order", async () => {
  const sent: Array<{ title: string; order: number }> = [];
  const failures = await addDraftExercises(
    [drafted({ title: "A" }), drafted({ title: "B" }), drafted({ title: "C" })],
    2,
    async (body) => {
      if (body.title === "B") throw new Error("Câu mô tả tranh cần ảnh đã được kiểm duyệt.");
      sent.push({ title: body.title, order: body.order });
    },
    (error) => (error as Error).message,
  );
  assert.deepEqual(failures, [{ title: "B", reason: "Câu mô tả tranh cần ảnh đã được kiểm duyệt." }]);
  // C takes position 4, not 5: B was never saved, and 5 would be past the end.
  assert.deepEqual(sent, [
    { title: "A", order: 3 },
    { title: "C", order: 4 },
  ]);
});

test("addDraftExercises: never throws, so a created set is never left looking unsaved", async () => {
  const failures = await addDraftExercises(
    [drafted({ title: " A " })],
    0,
    async () => {
      throw new Error("network");
    },
    () => "Không thể kết nối tới máy chủ.",
  );
  assert.deepEqual(failures, [{ title: "A", reason: "Không thể kết nối tới máy chủ." }]);
  assert.equal(await addDraftExercises([], 0, async () => undefined, String).then((f) => f.length), 0);
});

test("draftFailureToast names the count only when something failed", () => {
  assert.equal(draftFailureToast([]), null);
  assert.equal(
    draftFailureToast([{ title: "A", reason: "x" }, { title: "B", reason: "y" }]),
    "2 câu từ bản nháp AI chưa được thêm. Xem lý do ở mục Câu luyện.",
  );
});

test("takeOnce: a StrictMode double effect sends one request", () => {
  const flag = { current: false };
  let requests = 0;
  const effect = () => {
    if (takeOnce(flag)) requests++;
  };
  effect(); // mount
  effect(); // StrictMode re-runs the effect on the same component
  assert.equal(requests, 1);
  // A new form (the next click) starts with a new flag.
  const next = { current: false };
  if (takeOnce(next)) requests++;
  assert.equal(requests, 2);
});
