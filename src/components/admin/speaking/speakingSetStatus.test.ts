import test from "node:test";
import assert from "node:assert/strict";
import {
  countBy,
  describeValidationError,
  referenceAudioWarning,
  speakingSetChecklist,
} from "./speakingSetStatus.ts";

const exercise = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Greeting",
  targetText: "Hello, nice to meet you.",
  taskType: "READ_ALOUD",
  difficulty: "BEGINNER",
  audioUrl: "https://media.example/ref/1.v1.mp3",
  ...over,
});

test("speakingSetChecklist: a complete set passes every item", () => {
  const items = speakingSetChecklist({
    title: "Daily talk",
    exercises: [exercise(), exercise({ id: 2 })],
  });
  assert.ok(items.every((item) => item.done));
});

test("speakingSetChecklist: flags a picture without image and information without stimulus", () => {
  const items = speakingSetChecklist({
    title: "Office",
    exercises: [
      exercise({ taskType: "DESCRIBE_PICTURE", imageUrl: null }),
      exercise({ id: 2, taskType: "RESPOND_USING_INFORMATION", stimulusId: null, audioUrl: null }),
    ],
  });
  const done = Object.fromEntries(items.map((item) => [item.label, item.done]));
  assert.equal(done["Bài mô tả tranh có ảnh"], false);
  assert.equal(done["Bài dựa trên thông tin có thông tin dùng chung"], false);
  assert.equal(done["Mỗi câu có tiêu đề và câu mẫu"], true);
});

// QA 2026-11-22: the server published a set where 4 of 5 exercises had no
// reference audio while the checklist counted audio as a failed item.
test("speakingSetChecklist: missing reference audio blocks nothing, as on the server", () => {
  const exercises = [exercise(), ...[2, 3, 4, 5].map((id) => exercise({ id, audioUrl: null }))];
  const items = speakingSetChecklist({ title: "Office", exercises });
  assert.ok(items.every((item) => item.done));
  assert.ok(!items.some((item) => /audio/i.test(item.label)));
  assert.equal(referenceAudioWarning(exercises), "Thiếu audio mẫu: 4 câu");
});

test("referenceAudioWarning: nothing to say when every exercise has audio", () => {
  assert.equal(referenceAudioWarning([exercise(), exercise({ id: 2 })]), null);
  assert.equal(referenceAudioWarning([]), null);
});

test("speakingSetChecklist: an empty set needs a title and exercises", () => {
  const items = speakingSetChecklist({ title: " ", exercises: [] });
  assert.deepEqual(
    items.map((item) => [item.label, item.done]),
    [
      ["Có tên bộ luyện", false],
      ["Có ít nhất 1 câu luyện", false],
    ],
  );
});

test("countBy groups and orders by count", () => {
  assert.deepEqual(
    countBy([exercise(), exercise({ taskType: "EXPRESS_OPINION" }), exercise()], "taskType"),
    [
      ["READ_ALOUD", 2],
      ["EXPRESS_OPINION", 1],
    ],
  );
});

test("describeValidationError names the exercise by its position", () => {
  assert.equal(
    describeValidationError("Câu #42: Câu mô tả tranh cần ảnh đã được kiểm duyệt.", [{ id: 7 }, { id: 42 }]),
    "Câu 2: Câu mô tả tranh cần ảnh đã được kiểm duyệt.",
  );
  assert.equal(describeValidationError("Exercise #42: thiếu ảnh", [{ id: 7 }, { id: 42 }]), "Câu 2: thiếu ảnh");
  assert.equal(describeValidationError("Thiếu tiêu đề", []), "Thiếu tiêu đề");
});
