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
  listeningFormLocked,
  parseHintLines,
  hintLines,
  writingUsesPictures, TRACK_FIELD_COPY,
  aiCandidateQuestionFields,
  aiCandidateReady,
  aiShortfallNotice,
  answeredQuestions,
  audioStepsDone,
  clampDraftCount,
  comprehensionCandidate,
  fullDraftCountRange,
  joinTitleHead,
  normalizeReadingQuestionType,
  publishCheckView,
  questionSaveProblem,
  readingQuestionTypeLabel,
  splitTitleHead,
  writingKindOfForm,
  writingTaskLabel,
  listeningTitlePrefix,
  draftDescription,
  draftSaveHint,
  dictationDraftState,
  draftSentenceAvoid,
  draftAvoidList,
  replaceDraftItem,
  fillDraftSentences,
  replaceDraftSentence,
} from "./skillCmsStatus.ts";
import { comprehensionSpokenContent } from "../../lib/listening/listeningExchange.ts";

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

const twoSpeakers = [
  { speaker: "A", text: "Hi." },
  { speaker: "B", text: "Hello." },
];
const withTurns = <T extends { content: Record<string, unknown> }>(question: T, turns: unknown[] = twoSpeakers) => ({
  ...question,
  content: { ...question.content, transcriptSegments: turns },
});

test("publishChecklist: a complete listening quiz passes every item", () => {
  const items = publishChecklist({
    domain: "listening",
    title: "A Visit",
    levelTagged: true,
    listeningMode: "DIALOGUE",
    questions: [withTurns(mcq({ vi: "Vì…", en: "Because…" }))],
    audioPublished: false,
  }).map((item) => [item.label, item.done]);
  // The question has no clip and no recording is published: only its audio is missing.
  assert.deepEqual(items, [
    ["Có tiêu đề", true],
    ["Có trình độ", true],
    ["Có ít nhất 1 câu hỏi", true],
    ["Câu trắc nghiệm đủ đáp án", true],
    ["Lời thoại có ít nhất 2 lượt của 2 người nói", true],
    ["Audio đã xuất bản cho học viên", false],
  ]);
  const shared = publishChecklist({
    domain: "listening",
    title: "A Visit",
    levelTagged: true,
    listeningMode: "DIALOGUE",
    questions: [withTurns(mcq("x"))],
    audioPublished: true,
  });
  assert.ok(shared.every((item) => item.done));
});

// The server checks the conversation the questions carry (dialogueQuizIssues).
test("publishChecklist: a Hội thoại quiz needs 2 turns by 2 speakers in its questions", () => {
  const turnsItem = (questions: Array<{ type: string; content: Record<string, unknown> }>) =>
    publishChecklist({
      domain: "listening",
      title: "A Visit",
      levelTagged: true,
      listeningMode: "DIALOGUE",
      questions,
      audioPublished: true,
    }).find((item) => item.label === "Lời thoại có ít nhất 2 lượt của 2 người nói")?.done;
  assert.equal(turnsItem([mcq("x")]), false);
  assert.equal(turnsItem([]), false);
  assert.equal(turnsItem([withTurns(mcq("x"), [twoSpeakers[0], { speaker: "A", text: "Again." }])]), false);
  assert.equal(turnsItem([withTurns(mcq("x")), withTurns(mcq("y"))]), true);
  // The other forms have no conversation item.
  const comprehension = publishChecklist({
    domain: "listening",
    title: "T",
    levelTagged: true,
    listeningMode: "COMPREHENSION",
    questions: [mcq("x")],
  });
  assert.equal(comprehension.some((item) => item.label.startsWith("Lời thoại")), false);
});

test("a dialogue with a clip on every question has its audio", () => {
  const content = {
    options: ["a", "b"],
    correctIndex: 0,
    explanation: { vi: "x", en: "y" },
    transcriptSegments: twoSpeakers,
  };
  const questions = [1, 2].map(() => ({
    type: "MULTIPLE_CHOICE",
    content,
    audioAssets: [{ isActive: true }],
  }));
  const dialogue = { domain: "listening", title: "T", levelTagged: true, listeningMode: "DIALOGUE" };
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

test("publishChecklist: flags a bad key and unpublished audio, as the server does", () => {
  const items = publishChecklist({
    domain: "listening",
    title: "Quiz",
    levelTagged: true,
    questions: [mcq("Chỉ tiếng Việt"), mcq({ vi: "x", en: "y" }, ["a", "b"], 4)],
    audioPublished: false,
  });
  const byLabel = Object.fromEntries(items.map((item) => [item.label, item.done]));
  assert.equal(byLabel["Câu trắc nghiệm đủ đáp án"], false);
  assert.equal(byLabel["Audio đã xuất bản cho học viên"], false);
  assert.equal(byLabel["Có ít nhất 1 câu hỏi"], true);
  // The server never asked for a bilingual explanation, so neither does the checklist.
  assert.equal(items.some((item) => item.label.includes("English")), false);
});

// QA 2026-11-22: an empty new quiz showed "3/5 mục sẵn sàng".
test("publishChecklist: an empty quiz has nothing done but its title", () => {
  for (const domain of ["listening", "reading", "writing"]) {
    const items = publishChecklist({ domain, title: "Mới", levelTagged: false, questions: [], listeningMode: "COMPREHENSION" });
    assert.deepEqual(
      items.filter((item) => item.done).map((item) => item.label),
      ["Có tiêu đề"],
      domain,
    );
  }
});

test("publishChecklist: reading lists only its own items", () => {
  const items = publishChecklist({ domain: "reading", title: "", levelTagged: false, questions: [] });
  assert.deepEqual(
    items.map((item) => [item.label, item.done]),
    [
      ["Có tiêu đề", false],
      ["Có trình độ", false],
      ["Có ít nhất 1 câu hỏi", false],
      ["Câu trắc nghiệm đủ đáp án", false],
    ],
  );
});

// QA 2026-11-22: Viết listed "Câu trắc nghiệm đủ đáp án".
test("publishChecklist: writing has no choice item and checks its own tasks", () => {
  const task = (content: Record<string, unknown>) => ({ type: "WRITING", content });
  const email = publishChecklist({
    domain: "writing",
    title: "Email",
    levelTagged: true,
    quizType: "WRITING_EMAIL",
    questions: [task({ prompt: "Write to your manager.", taskType: "REQUEST", wordRange: [60, 40] })],
  });
  assert.deepEqual(
    email.map((item) => [item.label, item.done]),
    [
      ["Có tiêu đề", true],
      ["Có trình độ", true],
      ["Có ít nhất 1 câu hỏi", true],
      ["Mỗi câu có đề bài", true],
      ["Số từ tối thiểu, tối đa hợp lệ", false],
    ],
  );
  const picture = publishChecklist({
    domain: "writing",
    title: "Tranh",
    levelTagged: true,
    quizType: "WRITING_PICTURE",
    questions: [task({ prompt: "Describe.", taskType: "PICTURE_SENTENCE", imageUrl: "" })],
  });
  assert.equal(picture.find((item) => item.label === "Câu theo tranh có ảnh")?.done, false);
  const translation = publishChecklist({
    domain: "writing",
    title: "Dịch",
    levelTagged: true,
    quizType: "WRITING_PICTURE",
    questions: [
      task({
        prompt: "Mẹ tôi là giáo viên.",
        taskType: "SENTENCE_TRANSLATION",
        acceptedAnswers: ["My mother is a teacher.", "My mom is a teacher."],
        hints: [{ vi: "giáo viên", en: "teacher" }],
        grammarTip: "Nghề nghiệp cần a/an.",
      }),
    ],
  });
  assert.ok(translation.every((item) => item.done));
  assert.equal(translation.some((item) => item.label === "Câu trắc nghiệm đủ đáp án"), false);
});

test("publishChecklist: dictation needs 10 sentences, as the server", () => {
  const sentence = { type: "DICTATION", content: { correctAnswer: "The bus is late." }, audioAssets: [{ isActive: true }] };
  const few = publishChecklist({
    domain: "listening",
    listeningMode: "DICTATION",
    title: "Nghe chép",
    levelTagged: true,
    questions: Array.from({ length: 3 }, () => sentence),
  });
  assert.deepEqual(
    few.map((item) => [item.label, item.done]),
    [
      ["Có tiêu đề", true],
      ["Có trình độ", true],
      ["Có ít nhất 1 câu hỏi", true],
      ["Nghe chép cần ít nhất 10 câu (3/10)", false],
      ["Mỗi câu nghe chép có câu cần chép", true],
      ["Audio từng câu 3/3", true],
    ],
  );
  const enough = publishChecklist({
    domain: "listening",
    listeningMode: "DICTATION",
    title: "Nghe chép",
    levelTagged: true,
    // Exactly the minimum is enough.
    questions: Array.from({ length: 10 }, () => sentence),
  });
  assert.ok(enough.every((item) => item.done));
});

// QA 2026-11-22: a hand-made dialogue counted its turns as a question.
test("publishChecklist: the transcript holder is not a question", () => {
  const holder = {
    type: "DIALOGUE",
    content: { transcriptSegments: [{ speaker: "A", text: "Hi." }, { speaker: "B", text: "Hello." }] },
  };
  const items = publishChecklist({
    domain: "listening",
    listeningMode: "DIALOGUE",
    title: "Hội thoại",
    levelTagged: true,
    questions: [holder],
    audioPublished: true,
  });
  const byLabel = Object.fromEntries(items.map((item) => [item.label, item.done]));
  assert.equal(byLabel["Có ít nhất 1 câu hỏi"], false);
  assert.equal(byLabel["Lời thoại có ít nhất 2 lượt của 2 người nói"], true);
  assert.deepEqual(answeredQuestions("listening", [holder, mcq("x")]).length, 1);
  assert.deepEqual(answeredQuestions("reading", [holder, mcq("x")]).length, 2);
});

test("publishCheckView: publishing is offered only when the server and every item pass", () => {
  const ok = [{ label: "Có tiêu đề", done: true }];
  assert.deepEqual(publishCheckView(ok, { valid: true, errors: [] }), {
    passed: ["Có tiêu đề"],
    failed: [],
    details: [],
    canPublish: true,
  });
  const failing = publishCheckView(
    [...ok, { label: "Có ít nhất 1 câu hỏi", done: false }],
    { valid: false, errors: ["Cần ít nhất một câu hỏi"] },
  );
  assert.deepEqual(failing.failed, ["Có ít nhất 1 câu hỏi"]);
  assert.deepEqual(failing.details, ["Cần ít nhất một câu hỏi"]);
  assert.equal(failing.canPublish, false);
  assert.equal(publishCheckView(ok, { valid: false, errors: ["Câu 2: chưa có audio cho học viên"] }).canPublish, false);
});

// QA 2026-11-22: step 1 "Kiểm tra lời thoại" showed done on a new quiz.
test("audioStepsDone: nothing is done before the transcript is checked", () => {
  assert.equal(audioStepsDone(undefined, false), 0);
  assert.equal(audioStepsDone(undefined, true), 1);
  assert.equal(audioStepsDone("FAILED", false), 1);
  assert.equal(audioStepsDone("PREVIEW_READY", false), 2);
  assert.equal(audioStepsDone("APPROVED", false), 3);
  assert.equal(audioStepsDone("PUBLISHED", false), 4);
});

// The "Hội thoại" turns are checked by the conversation editor (listeningDialogue.test.ts).
test("questionSaveProblem: each question needs its prompt or sentence", () => {
  assert.equal(questionSaveProblem("listening", { type: "MULTIPLE_CHOICE", prompt: "Who calls?" }), null);
  assert.equal(questionSaveProblem("listening", { type: "DICTATION", prompt: " " }), "Cần nhập câu cần chép.");
  assert.equal(questionSaveProblem("reading", { type: "MULTIPLE_CHOICE", prompt: "" }), "Cần nhập đề bài.");
  assert.equal(questionSaveProblem("writing", { type: "WRITING", prompt: "Viết email." }), null);
});

// QA 2026-11-22: "Writing B1 — [QA] …" went to the AI as its topic.
test("splitTitleHead: the editor edits the part after the server-added head", () => {
  assert.deepEqual(splitTitleHead("Writing B1 — [QA] Email xin nghỉ"), { head: "Writing B1", body: "[QA] Email xin nghỉ" });
  assert.deepEqual(splitTitleHead("Hội thoại A1–A2 — At the café — part 2"), {
    head: "Hội thoại A1–A2",
    body: "At the café — part 2",
  });
  assert.deepEqual(splitTitleHead("Ordering food"), { head: "", body: "Ordering food" });
  assert.deepEqual(splitTitleHead("Weekend — plans"), { head: "", body: "Weekend — plans" });
  assert.equal(joinTitleHead("Writing B1", " Email "), "Writing B1 — Email");
  assert.equal(joinTitleHead("", "Email"), "Email");
  assert.equal(joinTitleHead("Writing B1", " "), "");
});

// QA 2026-11-22: "Viết câu" saved with Lưu reopened as "Viết theo tranh".
test("the writing kind is saved with the exercise and read back first", () => {
  for (const kind of WRITING_FORM_KINDS)
    assert.equal(
      writingFormType(writingQuizType(kind.value), [], writingKindOfForm(kind.value)),
      kind.value,
      kind.label,
    );
  // An older exercise with nothing saved still reads its kind from the sentences.
  assert.equal(
    writingFormType("WRITING_PICTURE", [{ content: { taskType: "SENTENCE" } }]),
    "SENTENCE",
  );
  assert.equal(writingFormType("WRITING_PICTURE", [], null), "WRITING_PICTURE");
});

test("aiShortfallNotice: says how many items the AI sent", () => {
  assert.equal(aiShortfallNotice(1, 3), "AI chỉ trả về 1/3 câu.");
  assert.equal(aiShortfallNotice(3, 3), null);
});

test("fullDraftCountRange: Nghe chép counts 10 to 30 sentences (owner 2026-11-25)", () => {
  const dictation = fullDraftCountRange("DICTATION");
  assert.deepEqual(dictation, { min: 10, max: 30, label: "Số câu" });
  assert.equal(clampDraftCount(5, dictation), 10);
  assert.equal(clampDraftCount(40, dictation), 30);
  assert.equal(clampDraftCount(25, fullDraftCountRange("DIALOGUE")), 10);
  assert.equal(fullDraftCountRange(undefined).label, "Số câu hỏi");
});

test("Viết shows task types in Vietnamese, never the code", () => {
  assert.equal(writingTaskLabel("INFORMATION_REQUEST"), "Email hỏi thông tin");
  assert.equal(writingTaskLabel("email"), "Phản hồi email");
  assert.equal(writingTaskLabel("SOMETHING_NEW"), "Bài viết");
});

// QA 2026-11-22: the reading full draft stored "detail".
test("reading question types are read in any case", () => {
  assert.equal(normalizeReadingQuestionType("detail"), "DETAIL");
  assert.equal(normalizeReadingQuestionType("Main idea"), "MAIN_IDEA");
  assert.equal(normalizeReadingQuestionType("opinion"), "MAIN_IDEA");
  assert.equal(readingQuestionTypeLabel("detail"), "Chi tiết");
  assert.equal(readingQuestionTypeLabel(undefined), "Trắc nghiệm đọc hiểu");
  assert.equal(fullDraftQuestionFields({ questionType: "inference" }).questionType, "INFERENCE");
});

test("a Nghe hiểu AI candidate keeps its sentence and saves like a hand-written question", () => {
  const candidate = comprehensionCandidate({
    prompt: "Where is she going?",
    options: ["Bank", "Station", "School", "Work"],
    correctIndex: 1,
    explanation: "Cô ấy nói “the station”.",
    explanationEn: "She says “the station”.",
    turns: [
      { speaker: "A", text: "Where are you going?" },
      { speaker: "B", text: "To the station." },
    ],
  });
  assert.equal(candidate.audioText, "A: Where are you going?\nB: To the station.");
  assert.equal(aiCandidateReady(candidate, true), true);
  assert.equal(aiCandidateReady({ ...candidate, audioText: " " }, true), false);
  assert.equal(aiCandidateReady({ ...candidate, audioText: "" }, false), true);
  assert.deepEqual(aiCandidateQuestionFields(candidate), {
    type: "MULTIPLE_CHOICE",
    prompt: "Where is she going?",
    options: "Bank\nStation\nSchool\nWork",
    correctIndex: "1",
    explanation: "Cô ấy nói “the station”.",
    explanationEn: "She says “the station”.",
    audioText: "A: Where are you going?\nB: To the station.",
  });
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

// Review 2026-11-22: a hand-made dialogue keeps its clip on the transcript holder.
test("audioBadgeFor: a dialogue whose holder has a clip and no recording is ready", () => {
  const dialogue = { bilingualContent: { mode: "DIALOGUE" }, _count: { questions: 3 } };
  assert.deepEqual(audioBadgeFor({ ...dialogue, dialogueAudio: true }), {
    label: "Audio lời thoại · đang dùng",
    tone: "ok",
  });
  assert.equal(audioBadgeFor({ ...dialogue, dialogueAudio: false }).tone, "none");
  // A shared recording, when there is one, decides.
  assert.deepEqual(
    audioBadgeFor({
      ...dialogue,
      dialogueAudio: true,
      listeningAudioArtifacts: [{ version: 2, status: "PREVIEW_READY" }],
    }),
    { label: "Audio v2 · chờ duyệt", tone: "pending" },
  );
  // Only a dialogue quiz reads its holder.
  assert.equal(
    audioBadgeFor({ bilingualContent: { mode: "COMPREHENSION" }, dialogueAudio: true }).tone,
    "none",
  );
  // The list's audio filter follows the same badge.
  const items = [
    { id: 1, title: "Hội thoại B1 — A", ...dialogue, dialogueAudio: true },
    { id: 2, title: "Hội thoại B1 — B", ...dialogue, dialogueAudio: false },
  ];
  const ok = { query: "", status: "ALL", level: "ALL", audio: "ok", sort: "NEWEST" } as const;
  assert.deepEqual(filterSkillContent(items, ok).map((item) => item.id), [1]);
});

test("publishChecklist: per-question audio for dictation", () => {
  const items = publishChecklist({
    domain: "listening",
    listeningMode: "DICTATION",
    title: "Nghe chép A1",
    levelTagged: true,
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

test("a 'Nghe hiểu' draft exchange fills the field with A:/B: lines, which save as its turns", () => {
  const fields = fullDraftQuestionFields({
    audioText: "Is this seat free? Yes, go ahead.",
    turns: [
      { speaker: "A", text: "Is this seat free?" },
      { speaker: "B", text: "Yes, go ahead." },
    ],
    prompt: "Where are they?",
    options: ["a", "b", "c", "d"],
    correctIndex: 0,
  });
  assert.equal(fields.audioText, "A: Is this seat free?\nB: Yes, go ahead.");
  assert.deepEqual(comprehensionSpokenContent(fields.audioText), {
    audioText: "Is this seat free? Yes, go ahead.",
    transcriptSegments: [
      { speaker: "A", text: "Is this seat free?" },
      { speaker: "B", text: "Yes, go ahead." },
    ],
  });
  assert.equal(fullDraftQuestionReady(fields, "COMPREHENSION"), true);
  // Turns that make no exchange fall back to the sentence.
  assert.equal(
    fullDraftQuestionFields({ audioText: "One sentence.", turns: [{ speaker: "A", text: "x" }] }).audioText,
    "One sentence.",
  );
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

test("the listening form locks with saved questions or an applied draft (owner 2026-11-22)", () => {
  assert.equal(listeningFormLocked(0, 0), false);
  assert.equal(listeningFormLocked(3, 0), true);
  // Applied from an AI draft, not saved yet: Lưu stores them in the chosen form.
  assert.equal(listeningFormLocked(0, 3), true);
});

test("a Listening title shows the form chosen before it (owner 2026-11-25)", () => {
  assert.equal(listeningTitlePrefix("DIALOGUE"), "Hội thoại");
  assert.equal(listeningTitlePrefix("DICTATION"), "Nghe chép");
  assert.equal(listeningTitlePrefix("COMPREHENSION"), "Nghe hiểu");
  assert.equal(listeningTitlePrefix(undefined), "Nghe hiểu");
});

test("an AI draft keeps the description the admin typed, and fills only an empty box (owner 2026-11-25)", () => {
  assert.equal(draftDescription("Nghe hội thoại ở quầy lễ tân.", "AI sentence"), "Nghe hội thoại ở quầy lễ tân.");
  assert.equal(draftDescription("   ", "  Nghe khách hỏi đường.  "), "Nghe khách hỏi đường.");
  assert.equal(draftDescription(undefined, undefined), "");
});

test("after applying an AI draft the page says Lưu comes next, and that a Listening lesson then makes its audio (owner 2026-11-25)", () => {
  assert.equal(draftSaveHint("listening"), "Bấm Lưu để lưu bài. Audio sẽ tự tạo sau khi lưu.");
  assert.equal(draftSaveHint("reading"), "Bấm Lưu để lưu bài.");
});

test("Nghe chép draft review: replacements fill dropped sentences and nothing is repeated (owner 2026-11-25)", () => {
  const draft = [
    { text: "We eat dinner at six." },
    { text: "Call your brother.", excluded: true },
    { text: "  " },
    { text: "My aunt grows tomatoes.", excluded: true },
  ];
  // Every line goes to the AI to avoid, dropped ones too.
  assert.deepEqual(draftSentenceAvoid(draft), ["We eat dinner at six.", "Call your brother.", "My aunt grows tomatoes."]);
  assert.deepEqual(dictationDraftState(draft, 10), { kept: 1, dropped: 2, missing: 9 });
  // One click replaces one sentence in place, dropped or not.
  assert.deepEqual(replaceDraftSentence(draft, 1, "Visit grandma on Sunday.")[1], {
    text: "Visit grandma on Sunday.",
    excluded: false,
  });
  // Several new ones fill the dropped slots in order; extras go at the end.
  const filled = fillDraftSentences(draft, ["A.", "B.", "C."]);
  assert.deepEqual(
    filled.map((s) => [s.text, !!s.excluded]),
    [
      ["We eat dinner at six.", false],
      ["A.", false],
      ["  ", false],
      ["B.", false],
      ["C.", false],
    ],
  );
  assert.deepEqual(dictationDraftState(Array.from({ length: 10 }, () => ({ text: "x" }))), { kept: 10, dropped: 0, missing: 0 });
});

test("draftAvoidList: every draft item once, trimmed, at most 40 of 300 characters", () => {
  assert.deepEqual(draftAvoidList(["  What is  the idea? ", "what is the idea?", "", null, undefined, "Why?"]), [
    "What is the idea?",
    "Why?",
  ]);
  assert.equal(draftAvoidList(Array.from({ length: 50 }, (_, i) => `q${i}`)).length, 40);
  assert.equal(draftAvoidList(["x".repeat(400)])[0].length, 300);
});

test("replaceDraftItem: one item replaced in place, the others untouched", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const next = replaceDraftItem(items, 1, { id: 9 });
  assert.deepEqual(next, [{ id: 1 }, { id: 9 }, { id: 3 }]);
  assert.equal(next[0], items[0]);
});
