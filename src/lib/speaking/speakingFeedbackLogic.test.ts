import assert from "node:assert/strict";
import test from "node:test";

import { COLLAPSE_AFTER_CHARS, selectSpeakingFeedback } from "./speakingFeedbackLogic.ts";

const AZURE_SCRIPTED =
  "Điểm phát âm: 9.6/10. Độ chính xác: 94%, Trôi chảy: 100%, Hoàn thiện: 100%.";
const AZURE_FREE =
  "Điểm phát âm: 9.3/10, chấm trên chính câu trả lời bạn nói (bài trả lời tự do, không so với câu hỏi). Độ chính xác: 95%, Trôi chảy: 99%, Ngữ điệu: 90%. Tốc độ nói khoảng 212 từ/phút.";
const DETAILED = "Bạn đọc rất rõ ràng, nhịp câu tự nhiên. Hãy giữ phong độ này nhé!";

test("T01 detailed feedback and suggestions are both shown", () => {
  const v = selectSpeakingFeedback({
    scripted: true,
    feedbackStatus: "COMPLETED",
    feedback: DETAILED,
    suggestions: ["Nhấn rõ âm cuối.", "Đọc chậm ở từ dài."],
  });
  assert.deepEqual(v.paragraph, { title: "Nhận xét chi tiết", text: DETAILED, collapsible: false });
  assert.deepEqual(v.suggestions, ["Nhấn rõ âm cuối.", "Đọc chậm ở từ dài."]);
  assert.equal(v.pending, false);
  assert.equal(v.enrichmentFailed, false);
});

test("T02 detailed feedback without suggestions", () => {
  const v = selectSpeakingFeedback({ scripted: true, feedbackStatus: "COMPLETED", feedback: DETAILED });
  assert.equal(v.paragraph?.text, DETAILED);
  assert.deepEqual(v.suggestions, []);
});

test("T03/T11 no feedback text: no paragraph, no empty block", () => {
  for (const feedback of [undefined, null, 42]) {
    const v = selectSpeakingFeedback({ scripted: true, feedbackStatus: "COMPLETED", feedback, suggestions: [] });
    assert.equal(v.paragraph, null);
    assert.deepEqual(v.suggestions, []);
  }
});

test("T04 whitespace feedback and blank suggestions are dropped", () => {
  const v = selectSpeakingFeedback({
    scripted: true,
    feedbackStatus: "COMPLETED",
    feedback: "   \n ",
    suggestions: ["  ", "", "Nói to hơn."],
  });
  assert.equal(v.paragraph, null);
  assert.deepEqual(v.suggestions, ["Nói to hơn."]);
});

test("T05/T06 enrichment failed (timeout, 503): Azure result stands, no detailed claim", () => {
  const v = selectSpeakingFeedback({ scripted: true, feedbackStatus: "FAILED", feedback: AZURE_SCRIPTED, suggestions: [] });
  assert.equal(v.enrichmentFailed, true);
  assert.equal(v.pending, false);
  assert.equal(v.paragraph, null, "the scripted Azure summary only repeats the gauges");
});

test("T07 enrichment pending: flagged, the Azure summary is not presented as detailed", () => {
  const v = selectSpeakingFeedback({ scripted: true, feedbackStatus: "PROCESSING", feedback: AZURE_SCRIPTED });
  assert.equal(v.pending, true);
  assert.equal(v.paragraph, null);
});

test("a free answer keeps its Azure summary (speech rate, intonation), titled as a summary", () => {
  const v = selectSpeakingFeedback({ scripted: false, feedbackStatus: "COMPLETED", feedback: AZURE_FREE, suggestions: ["Giữ tốc độ này."] });
  assert.deepEqual(v.paragraph, { title: "Tóm tắt đánh giá", text: AZURE_FREE, collapsible: false });
  assert.deepEqual(v.suggestions, ["Giữ tốc độ này."]);
});

test("T10 a suggestion that repeats the paragraph, or another suggestion, is shown once", () => {
  const v = selectSpeakingFeedback({
    scripted: true,
    feedbackStatus: "COMPLETED",
    feedback: DETAILED,
    suggestions: [DETAILED, "Nhấn rõ âm cuối.", "nhấn rõ âm cuối."],
  });
  assert.deepEqual(v.suggestions, ["Nhấn rõ âm cuối."]);
});

test("long detailed feedback is collapsible", () => {
  const long = "Nhận xét ".repeat(Math.ceil(COLLAPSE_AFTER_CHARS / 8) + 5).trim();
  assert.equal(selectSpeakingFeedback({ scripted: true, feedback: long }).paragraph?.collapsible, true);
});

test("T12 AI markup is kept as plain text (rendered as a text node, never as HTML)", () => {
  const v = selectSpeakingFeedback({ scripted: true, feedback: '<img src=x onerror="alert(1)"> Tốt <script>alert(2)</script>' });
  assert.equal(typeof v.paragraph?.text, "string");
  assert.ok(v.paragraph?.text.includes("<script>"));
});
