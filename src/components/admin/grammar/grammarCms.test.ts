import test from "node:test";
import assert from "node:assert/strict";
import { grammarChecklist, youtubeIdFrom } from "./grammarCms.ts";

test("youtubeIdFrom reads links and bare ids", () => {
  assert.equal(youtubeIdFrom("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom(" dQw4w9WgXcQ "), "dQw4w9WgXcQ");
  assert.equal(youtubeIdFrom(""), "");
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
  assert.equal(done["Mỗi câu có 4 phương án và đáp án đúng"], false);
  assert.equal(done["Giải thích 1/2 câu"], false);
});
