import test from "node:test";
import assert from "node:assert/strict";
import { latestAudioBadge, publishChecklist } from "./skillCmsStatus.ts";

test("latestAudioBadge: no recording reads as none", () => {
  assert.deepEqual(latestAudioBadge(undefined), {
    label: "Chưa có audio",
    tone: "none",
  });
});

test("latestAudioBadge: names the version and the state", () => {
  assert.deepEqual(latestAudioBadge({ version: 3, status: "PUBLISHED" }), {
    label: "Audio v3 · đang dùng",
    tone: "ok",
  });
  assert.equal(latestAudioBadge({ version: 1, status: "PREVIEW_READY" }).tone, "pending");
  assert.equal(latestAudioBadge({ version: 2, status: "FAILED" }).tone, "error");
});

const mcq = (explanation: unknown, options = ["a", "b", "c", "d"], correctIndex = 1) => ({
  type: "MULTIPLE_CHOICE",
  content: { options, correctIndex, explanation },
});

test("publishChecklist: a complete listening quiz passes every item", () => {
  const items = publishChecklist({
    domain: "listening",
    title: "Hội thoại C1 — A Visit",
    questions: [mcq({ vi: "Vì…", en: "Because…" })],
    audioPublished: true,
  });
  assert.equal(items.length, 5);
  assert.ok(items.every((item) => item.done));
});

test("publishChecklist: flags a missing English explanation, a bad key and unpublished audio", () => {
  const items = publishChecklist({
    domain: "listening",
    title: "Quiz",
    questions: [mcq("Chỉ tiếng Việt"), mcq({ vi: "x", en: "y" }, ["a", "b"], 4)],
    audioPublished: false,
  });
  const byLabel = Object.fromEntries(items.map((item) => [item.label, item.done]));
  assert.equal(byLabel["Câu trắc nghiệm đủ đáp án"], false);
  assert.equal(byLabel["Lời giải có tiếng Việt và English"], false);
  assert.equal(byLabel["Audio đã xuất bản cho học viên"], false);
  assert.equal(byLabel["Có ít nhất 1 câu hỏi"], true);
});

test("publishChecklist: reading has no audio or bilingual items", () => {
  const items = publishChecklist({ domain: "reading", title: "", questions: [] });
  assert.deepEqual(
    items.map((item) => [item.label, item.done]),
    [
      ["Có tiêu đề", false],
      ["Có ít nhất 1 câu hỏi", false],
      ["Câu trắc nghiệm đủ đáp án", true],
    ],
  );
});
