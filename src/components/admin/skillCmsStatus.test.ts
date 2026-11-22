import test from "node:test";
import assert from "node:assert/strict";
import {
  audioBadgeFor,
  cmsLevelFromTitle,
  filterSkillContent,
  latestAudioBadge,
  publishChecklist,
  writingCardLabel,
  writingFormType,
  writingQuizType,
  defaultWritingTaskType,
  WRITING_FORM_KINDS,
  writingDraftKind,
  writingDraftQuestion,
  fullDraftQuestionFields,
  fullDraftQuestionReady,
  parseHintLines,
  hintLines,
  writingUsesPictures, TRACK_FIELD_COPY } from "./skillCmsStatus.ts";

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

test("a dialogue with a clip on every question has its audio", () => {
  const content = {
    options: ["a", "b"],
    correctIndex: 0,
    explanation: { vi: "x", en: "y" },
  };
  const questions = [1, 2].map(() => ({
    type: "MULTIPLE_CHOICE",
    content,
    audioAssets: [{ isActive: true }],
  }));
  const dialogue = { domain: "listening", title: "T", listeningMode: "DIALOGUE" };
  assert.ok(publishChecklist({ ...dialogue, questions }).every((i) => i.done));
  assert.equal(
    publishChecklist({
      ...dialogue,
      questions: [questions[0], { ...questions[1], audioAssets: [] }],
    }).at(-1)?.done,
    false,
  );
  assert.deepEqual(
    audioBadgeFor({
      bilingualContent: { mode: "DIALOGUE" },
      questionsWithAudio: 2,
      _count: { questions: 2 },
    }),
    { label: "Audio 2/2 câu", tone: "ok" },
  );
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

test("a sentence exercise stored as a picture type does not ask for an image", () => {
  const noImage = [{ content: { imageUrl: "" } }];
  assert.equal(writingUsesPictures("WRITING_PICTURE", noImage), false);
  assert.equal(writingUsesPictures("WRITING_PICTURE", []), true);
  assert.equal(
    writingUsesPictures("WRITING_PICTURE", [{ content: { imageUrl: "https://a" } }]),
    true,
  );
  assert.equal(writingUsesPictures("WRITING_EMAIL", []), false);
  assert.equal(writingCardLabel({ type: "WRITING_PICTURE" }), "Viết câu");
  assert.equal(
    writingCardLabel({ type: "WRITING_PICTURE", thumbnailUrl: "https://a" }),
    "Viết theo tranh",
  );
  assert.equal(writingCardLabel({ type: "WRITING_EMAIL" }), "Viết email");
  assert.equal(writingCardLabel({ type: "WRITING_PICTURE", writingKind: "TRANSLATION" }), "Dịch câu");
  // The backend's kind wins over the old type-and-thumbnail guess.
  assert.equal(writingCardLabel({ type: "WRITING_PICTURE", writingKind: "SENTENCE", thumbnailUrl: "https://a" }), "Viết câu");
  assert.equal(writingCardLabel({ type: "WRITING_PICTURE", writingKind: "PICTURE" }), "Viết theo tranh");
});

test("each writing kind starts its questions with its own task type (owner 2026-11-19)", () => {
  assert.deepEqual(
    WRITING_FORM_KINDS.map((kind) => [kind.value, defaultWritingTaskType(kind.value), writingQuizType(kind.value)]),
    [
      ["WRITING_EMAIL", "EMAIL", "WRITING_EMAIL"],
      ["TRANSLATION", "SENTENCE_TRANSLATION", "WRITING_PICTURE"],
      ["WRITING_PICTURE", "PICTURE_SENTENCE", "WRITING_PICTURE"],
      ["SENTENCE", "SENTENCE", "WRITING_PICTURE"],
    ],
  );
});

test("a picture-type exercise of plain sentences reads as Viết câu", () => {
  assert.equal(writingFormType("WRITING_PICTURE", [{ content: { taskType: "SENTENCE" } }]), "SENTENCE");
  assert.equal(
    writingFormType("WRITING_PICTURE", [{ content: { taskType: "SENTENCE", imageUrl: "https://a" } }]),
    "WRITING_PICTURE",
  );
  assert.equal(writingFormType("WRITING_PICTURE", [{ content: { taskType: "PICTURE_SENTENCE" } }]), "WRITING_PICTURE");
  // A new exercise has no sentences yet: it keeps the type it was created with.
  assert.equal(writingFormType("WRITING_PICTURE", []), "WRITING_PICTURE");
  // An empty "Dịch câu" exercise is known by its topic (owner 2026-11-20).
  assert.equal(writingFormType("WRITING_PICTURE", [], "TRANSLATION"), "TRANSLATION");
  assert.equal(writingFormType("WRITING_EMAIL", [], "TRANSLATION"), "WRITING_EMAIL");
});

test("a Dịch câu exercise reads as its own form type, and hints round-trip as lines", () => {
  const sentences = [{ content: { taskType: "SENTENCE_TRANSLATION" } }];
  assert.equal(writingFormType("WRITING_PICTURE", sentences), "TRANSLATION");
  assert.equal(writingFormType("WRITING_PICTURE", [{ content: { taskType: "PICTURE_SENTENCE" } }]), "WRITING_PICTURE");
  assert.equal(writingFormType("WRITING_EMAIL", sentences), "WRITING_EMAIL");
  const hints = parseHintLines("giáo viên = teacher\nkhông có dấu bằng\n = trống\nbệnh viện= hospital ");
  assert.deepEqual(hints, [
    { vi: "giáo viên", en: "teacher" },
    { vi: "bệnh viện", en: "hospital" },
  ]);
  assert.equal(hintLines(hints), "giáo viên = teacher\nbệnh viện = hospital");
  assert.equal(hintLines(null), "");
});

test("admin track copy says lĩnh vực, as the learner onboarding does", () => {
  assert.equal(TRACK_FIELD_COPY.label, "Lĩnh vực");
  assert.equal(TRACK_FIELD_COPY.untagged, "Chưa gắn lĩnh vực");
  for (const text of Object.values(TRACK_FIELD_COPY)) {
    assert.doesNotMatch(text, /ngành/i);
  }
});

test("AI drafts exist for email and Dịch câu only (owner 2026-11-19)", () => {
  assert.deepEqual(
    WRITING_FORM_KINDS.map((kind) => writingDraftKind(kind.value)),
    ["EMAIL", "TRANSLATION", null, null],
  );
});

test("a picked AI task saves as a question of its kind", () => {
  assert.deepEqual(
    writingDraftQuestion({ taskType: "REQUEST", prompt: "Ask for a day off.", wordRange: [60, 100], explanation: "Nêu lý do." }, "B1"),
    { type: "WRITING", prompt: "Ask for a day off.", taskType: "REQUEST", level: "B1", wordRange: [60, 100], explanation: "Nêu lý do." },
  );
  assert.deepEqual(
    writingDraftQuestion({
      taskType: "SENTENCE_TRANSLATION",
      prompt: "Tôi có hai quyển sách.",
      acceptedAnswers: ["I have two books.", "I've got two books."],
      hints: [{ vi: "quyển sách", en: "book" }],
      grammarTip: "Số nhiều thêm s.",
      wordRange: [1, 2],
    }),
    {
      type: "WRITING",
      prompt: "Tôi có hai quyển sách.",
      taskType: "SENTENCE_TRANSLATION",
      acceptedAnswers: ["I have two books.", "I've got two books."],
      hints: [{ vi: "quyển sách", en: "book" }],
      grammarTip: "Số nhiều thêm s.",
    },
  );
});

test("a 'Nghe hiểu' draft question fills the same fields as one typed by hand", () => {
  assert.deepEqual(
    fullDraftQuestionFields({
      audioText: "  The bank opens at eight thirty.  ",
      prompt: "When does the bank open?",
      options: ["At eight", "At eight thirty", "At nine", "At noon"],
      correctIndex: 1,
      explanation: "Người nói nói “eight thirty”.",
      explanationEn: "The speaker says “eight thirty”.",
    }),
    {
      type: "MULTIPLE_CHOICE",
      prompt: "When does the bank open?",
      options: "At eight\nAt eight thirty\nAt nine\nAt noon",
      correctIndex: "1",
      explanation: "Người nói nói “eight thirty”.",
      explanationEn: "The speaker says “eight thirty”.",
      // The comprehension editor's "Câu nghe": saved as content.audioText.
      audioText: "The bank opens at eight thirty.",
      questionType: "MAIN_IDEA",
    },
  );
  // A dialogue or dictation question plays the shared source: no sentence of its own.
  const dialogue = fullDraftQuestionFields({ prompt: "Who calls?", options: ["a", "b", "c", "d"], correctIndex: 0 });
  assert.equal(dialogue.audioText, "");
  assert.equal(dialogue.correctIndex, "0");
  assert.equal(fullDraftQuestionFields({}).options, "");
});

test("a 'Nghe hiểu' draft question applies only with its sentence", () => {
  const question = { prompt: "When does the bank open?", options: "a\nb\nc\nd", audioText: "The bank opens at eight." };
  assert.equal(fullDraftQuestionReady(question, "COMPREHENSION"), true);
  assert.equal(fullDraftQuestionReady({ ...question, audioText: "  " }, "COMPREHENSION"), false);
  // The other forms play their shared source, so no sentence is needed.
  assert.equal(fullDraftQuestionReady({ ...question, audioText: "" }, "DIALOGUE"), true);
  assert.equal(fullDraftQuestionReady({ ...question, audioText: "" }), true);
  assert.equal(fullDraftQuestionReady({ ...question, options: "a\nb\nc" }, "COMPREHENSION"), false);
  assert.equal(fullDraftQuestionReady({ ...question, prompt: " " }, "DICTATION"), false);
});

