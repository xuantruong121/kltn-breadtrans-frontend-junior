import test from "node:test";
import assert from "node:assert/strict";
import {
  countBy,
  describeValidationError,
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
  assert.equal(items.at(-1)?.label, "Audio mẫu 2/2 câu");
});

test("speakingSetChecklist: flags a picture without image, information without stimulus and missing audio", () => {
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
  assert.equal(done["Audio mẫu 1/2 câu"], false);
  assert.equal(done["Mỗi câu có tiêu đề và câu mẫu"], true);
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
    describeValidationError("Exercise #42: thiếu ảnh", [{ id: 7 }, { id: 42 }]),
    "Câu 2: thiếu ảnh",
  );
  assert.equal(describeValidationError("Thiếu tiêu đề", []), "Thiếu tiêu đề");
});
