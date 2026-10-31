import test from "node:test";
import assert from "node:assert/strict";
import {
  GRAMMAR_PASTE_SAMPLE,
  grammarChecklist,
  parseGrammarPaste,
  publishBlocker,
  questionProblems,
  youtubeIdFrom,
} from "./grammarCms.ts";

test("youtubeIdFrom reads links and bare ids, and rejects anything else", () => {
  assert.equal(youtubeIdFrom("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom(" dQw4w9WgXcQ "), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom(""), "");
  assert.equal(youtubeIdFrom("https://vimeo.com/12345"), "");
  assert.equal(youtubeIdFrom("not a video"), "");
});

test("grammarChecklist flags missing theory, bad options and explanations", () => {
  const items = grammarChecklist({
    title: "Present perfect",
    description: "",
    questions: [
      { question: "I ___ here.", options: ["have been", "was", "am", ""], correctIndex: 0, explanation: "x" },
      { question: "She ___.", options: ["a", "b", "c", "d"], correctIndex: 2 },
    ],
  });
  const done = Object.fromEntries(items.map((i) => [i.label, i.done]));
  assert.equal(done["Có phần lý thuyết"], false);
  assert.equal(done["Mỗi câu có 4 phương án khác nhau và đáp án đúng"], false);
  assert.equal(done["Giải thích 1/2 câu"], false);
  assert.equal(done["Lý do sai đủ 3 phương án 0/2 câu"], false);
});

test("publishBlocker ignores advisory items and asks to save first", () => {
  const items = grammarChecklist({
    title: "Past simple",
    description: "Hành động đã kết thúc.",
    questions: [{ question: "She ___ .", options: ["went", "go", "goes", "going"], correctIndex: 0 }],
  });
  assert.equal(publishBlocker(items, false), null);
  assert.equal(publishBlocker(items, true), "Lưu thay đổi trước khi xuất bản.");
  const missing = grammarChecklist({ title: "", description: "", questions: [] });
  assert.match(publishBlocker(missing, false) ?? "", /có tên chủ đề; có phần lý thuyết/);
});

test("questionProblems matches the server rule", () => {
  assert.deepEqual(
    questionProblems({ question: "x", options: ["a", "A ", "b", "c"], correctIndex: 1 }),
    ["Có hai đáp án giống nhau"],
  );
  assert.deepEqual(
    questionProblems({ question: "", options: ["a", "b", "c"], correctIndex: null }),
    ["Thiếu đề bài", "Cần đúng 4 đáp án (đang có 3)", "Chưa chọn đáp án đúng"],
  );
});

test("parseGrammarPaste reads blocks with marks, rationales and explanations", () => {
  const rows = parseGrammarPaste(GRAMMAR_PASTE_SAMPLE);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].options, ["repaired", "repairs", "repair", "repairing"]);
  assert.equal(rows[0].correctIndex, 0);
  assert.deepEqual(rows[0].optionExplanations, [
    null,
    'Hiện tại đơn, không hợp với "yesterday"',
    "Động từ nguyên mẫu, chưa chia thì",
    "V-ing cần trợ động từ",
  ]);
  assert.match(rows[0].explanation ?? "", /mốc quá khứ/);
  assert.equal(rows[1].correctIndex, 1);
  assert.equal(rows[1].optionExplanations, null);
  assert.deepEqual(rows.map((r) => r.problems), [[], []]);
});

test("parseGrammarPaste accepts an answer line, numbering and trailing marks", () => {
  const [row] = parseGrammarPaste(
    "1. They ____ football now.\n(A) play\n(B) are playing\n(C) played\n(D) plays\nĐáp án: B",
  );
  assert.equal(row.question, "They ____ football now.");
  assert.equal(row.correctIndex, 1);
  const [trailing] = parseGrammarPaste("Q?\n= yes\nno\nmaybe\nnever");
  assert.equal(trailing.correctIndex, 0);
});

test("parseGrammarPaste reads spreadsheet rows and flags problems per block", () => {
  const rows = parseGrammarPaste(
    [
      "She ___ here.\tis\tare\tam\tbe\tA\tChủ ngữ số ít.",
      "They ___ late.\twere\twas\tis\tbe\t5\t",
    ].join("\n") + "\n\nOnly prompt\nA. one\nB. two",
    ["she ___ here."],
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].duplicate, true);
  assert.equal(rows[0].explanation, "Chủ ngữ số ít.");
  assert.deepEqual(rows[0].problems, []);
  assert.deepEqual(rows[1].problems, ["Chưa chọn đáp án đúng"]);
  assert.deepEqual(rows[2].problems, ["Cần đúng 4 đáp án (đang có 2)", "Chưa chọn đáp án đúng"]);
  assert.equal(rows[2].block, 3);
});

test("parseGrammarPaste reports two marked answers", () => {
  const [row] = parseGrammarPaste("Q\n*a\n*b\nc\nd");
  assert.equal(row.problems[0], "Đánh dấu nhiều hơn 1 đáp án đúng");
});
