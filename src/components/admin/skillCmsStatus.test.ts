import test from "node:test";
import assert from "node:assert/strict";
import {
  audioBadgeFor,
  cmsLevelFromTitle,
  filterSkillContent,
  latestAudioBadge,
  publishChecklist,
} from "./skillCmsStatus.ts";

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

const items = [
  { id: 1, title: "Hội thoại B1 — Ordering food", publicationStatus: "PUBLISHED", _count: { questions: 5 }, listeningAudioArtifacts: [{ version: 2, status: "PUBLISHED" }] },
  { id: 2, title: "Hội thoại C1 — A visit", publicationStatus: "DRAFT", _count: { questions: 3 } },
  { id: 3, title: "Nghe chép A1 — Daily messages", publicationStatus: "DRAFT", _count: { questions: 20 }, listeningAudioArtifacts: [{ version: 1, status: "PREVIEW_READY" }] },
];
const all = { query: "", status: "ALL", level: "ALL", audio: "ALL", sort: "NEWEST" } as const;

test("cmsLevelFromTitle reads the tag at the head only", () => {
  assert.equal(cmsLevelFromTitle("Hội thoại C1 — A1 notes"), "C1");
  assert.equal(cmsLevelFromTitle("Ordering food"), null);
});

test("filterSkillContent: level, audio and status narrow the list", () => {
  assert.deepEqual(filterSkillContent(items, { ...all, level: "C1" }).map((i) => i.id), [2]);
  assert.deepEqual(filterSkillContent(items, { ...all, audio: "none" }).map((i) => i.id), [2]);
  assert.deepEqual(filterSkillContent(items, { ...all, audio: "pending" }).map((i) => i.id), [3]);
  assert.deepEqual(filterSkillContent(items, { ...all, status: "DRAFT", query: "visit" }).map((i) => i.id), [2]);
});

test("filterSkillContent: sorts by level, title, question count and age", () => {
  assert.deepEqual(filterSkillContent(items, { ...all, sort: "LEVEL" }).map((i) => i.id), [3, 1, 2]);
  assert.deepEqual(filterSkillContent(items, { ...all, sort: "FEWEST" }).map((i) => i.id), [2, 1, 3]);
  assert.deepEqual(filterSkillContent(items, { ...all, sort: "OLDEST" }).map((i) => i.id), [1, 2, 3]);
  assert.deepEqual(filterSkillContent(items, { ...all, sort: "TITLE" }).map((i) => i.id), [2, 3, 1]);
});

test("audioBadgeFor: comprehension and dictation count clips per question", () => {
  assert.deepEqual(
    audioBadgeFor({ bilingualContent: { mode: "COMPREHENSION" }, questionsWithAudio: 6, _count: { questions: 6 } }),
    { label: "Audio 6/6 câu", tone: "ok" },
  );
  assert.equal(
    audioBadgeFor({ bilingualContent: { mode: "DICTATION" }, questionsWithAudio: 3, _count: { questions: 20 } }).tone,
    "pending",
  );
  assert.equal(
    audioBadgeFor({ bilingualContent: { mode: "DIALOGUE" }, listeningAudioArtifacts: [{ version: 1, status: "PUBLISHED" }] }).label,
    "Audio v1 · đang dùng",
  );
});

test("publishChecklist: per-question audio for dictation", () => {
  const items = publishChecklist({
    domain: "listening",
    listeningMode: "DICTATION",
    title: "Nghe chép A1",
    questions: [
      { type: "DICTATION", content: {}, audioAssets: [{ isActive: true }] },
      { type: "DICTATION", content: {}, audioAssets: [] },
    ],
  });
  assert.deepEqual(items.at(-1), { label: "Audio từng câu 1/2", done: false });
});
