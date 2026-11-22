import test from "node:test";
import assert from "node:assert/strict";
import {
  DIALOGUE_DRAFT_KEY,
  dialogueForSave,
  dialogueMetadata,
  dialogueQuestionContent,
  dialogueSavePlan,
  dialogueSource,
  dialogueTurns,
  dialogueTurnsProblem,
  renameSpeaker,
  transcriptForSave,
} from "./listeningDialogue.ts";

// The shape of the published dialogue quizzes (kltn_db, quizzes 47–58).
const stored = [
  {
    speaker: "Khách hàng",
    text: "Good morning. Can I have a latte, please?",
    translation: "Chào buổi sáng. Cho tôi một ly latte.",
    voiceKey: "en-us-female-01",
  },
  { speaker: "Nhân viên", text: "Sure. Hot or iced?", voiceKey: "en-us-male-01" },
];
const mcq = (id: number, transcriptSegments?: unknown[]) => ({
  id,
  type: "MULTIPLE_CHOICE",
  content: { options: ["a", "b", "c", "d"], correctIndex: 0, ...(transcriptSegments ? { transcriptSegments } : {}) },
});
const holder = (id: number, transcriptSegments: unknown[]) => ({ id, type: "DIALOGUE", content: { transcriptSegments } });

test("the conversation is read from a legacy holder, then a question, then the quiz draft", () => {
  const other = [{ speaker: "A", text: "Hi." }];
  assert.deepEqual(dialogueSource([mcq(1, other), holder(2, stored)]).segments, stored);
  assert.deepEqual(dialogueSource([mcq(1), mcq(2, stored)]).segments, stored);
  assert.deepEqual(dialogueSource([mcq(1)], { mode: "DIALOGUE", [DIALOGUE_DRAFT_KEY]: other }).segments, other);
  // A question's turns win over a stale draft.
  assert.deepEqual(dialogueSource([mcq(1, stored)], { [DIALOGUE_DRAFT_KEY]: other }).segments, stored);
  assert.deepEqual(dialogueSource([], {}).segments, []);
  assert.equal(dialogueSource([{ ...mcq(1, stored), content: { transcriptSegments: stored, accent: "UK" } }]).accent, "UK");
  assert.equal(dialogueSource([]).accent, "US");
});

test("stored turns become editor rows that keep their voice", () => {
  const rows = dialogueTurns(stored);
  assert.deepEqual(rows[0], {
    speaker: "Khách hàng",
    text: "Good morning. Can I have a latte, please?",
    translation: "Chào buổi sáng. Cho tôi một ly latte.",
    voiceKey: "en-us-female-01",
  });
  assert.deepEqual(dialogueTurns(undefined), [{ speaker: "", text: "", translation: "" }]);
  // Renaming a speaker drops the old speaker's voice.
  assert.deepEqual(renameSpeaker(rows[1], "Thu ngân"), { speaker: "Thu ngân", text: "Sure. Hot or iced?", translation: "" });
});

test("dialogueTurnsProblem: 2 turns by 2 speakers", () => {
  assert.equal(dialogueTurnsProblem(dialogueTurns(stored)), null);
  assert.equal(
    dialogueTurnsProblem([
      { speaker: "A", text: "Hi." },
      { speaker: "A", text: "Again." },
    ]),
    "Lời thoại cần ít nhất 2 lượt lời của 2 người nói.",
  );
  assert.match(String(dialogueTurnsProblem([{ speaker: "A", text: "Hi." }, { speaker: "B", text: " " }])), /2 người nói/);
});

test("a new turn takes its speaker's voice, so every copy is the same", () => {
  const rows = [...dialogueTurns(stored), { speaker: "Khách hàng", text: "Iced, please.", translation: "" }];
  const conversation = dialogueForSave(rows, stored);
  assert.deepEqual(conversation[2], { speaker: "Khách hàng", text: "Iced, please.", voiceKey: "en-us-female-01" });
  // Unchanged turns save exactly as stored, empty rows are dropped.
  assert.deepEqual(dialogueForSave([...dialogueTurns(stored), { speaker: "", text: "", translation: "" }], stored), stored);
  assert.deepEqual(transcriptForSave([{ speaker: " A ", text: " Hi. ", translation: " " }]), [{ speaker: "A", text: "Hi." }]);
  assert.deepEqual(dialogueQuestionContent(conversation.slice(0, 2)), {
    transcriptSegments: conversation.slice(0, 2),
    audioText: "Good morning. Can I have a latte, please? Sure. Hot or iced?",
  });
});

test("a save fills every question without the conversation and leaves equal copies alone", () => {
  const conversation = dialogueForSave(dialogueTurns(stored), stored);
  const questions = [mcq(1, stored), mcq(2), mcq(3, stored)];
  assert.deepEqual(dialogueSavePlan({ questions, conversation, edited: false, hasAttempts: false }), {
    update: [2],
    remove: [],
  });
  // Nothing to write when nothing differs.
  assert.deepEqual(
    dialogueSavePlan({ questions: [mcq(1, stored), mcq(2, stored)], conversation, edited: true, hasAttempts: false }).update,
    [],
  );
});

test("edited turns reach every question; untouched other turns are kept", () => {
  const edited = dialogueForSave([...dialogueTurns(stored), { speaker: "Khách hàng", text: "Iced.", translation: "" }], stored);
  const questions = [mcq(1, stored), mcq(2, stored), { id: 3, type: "DICTATION", content: { correctAnswer: "Hi." } }];
  assert.deepEqual(dialogueSavePlan({ questions, conversation: edited, edited: true, hasAttempts: false }).update, [1, 2]);
  // Not edited in this session: a question with other turns keeps them.
  assert.deepEqual(dialogueSavePlan({ questions, conversation: edited, edited: false, hasAttempts: false }).update, []);
});

test("a legacy holder's turns go into the questions and the holder goes", () => {
  const conversation = dialogueForSave(dialogueTurns(stored), stored);
  const stale = [{ speaker: "A", text: "Old." }];
  const questions = [holder(9, stored), mcq(1), mcq(2, stale), mcq(3, stored)];
  assert.deepEqual(dialogueSavePlan({ questions, conversation, edited: false, hasAttempts: false }), {
    update: [1, 2],
    remove: [9],
  });
  // The server refuses to delete a question of a quiz with attempts: the holder stays.
  assert.deepEqual(dialogueSavePlan({ questions, conversation, edited: false, hasAttempts: true }).remove, []);
});

test("the quiz keeps the conversation only while no question carries it", () => {
  const conversation = transcriptForSave(stored);
  const meta = { mode: "DIALOGUE", levels: ["B1"] };
  assert.deepEqual(dialogueMetadata(meta, conversation, false), { ...meta, [DIALOGUE_DRAFT_KEY]: conversation });
  assert.deepEqual(dialogueMetadata({ ...meta, [DIALOGUE_DRAFT_KEY]: conversation }, conversation, true), meta);
  assert.deepEqual(dialogueMetadata({ ...meta, [DIALOGUE_DRAFT_KEY]: conversation }, [], false), meta);
});
