import test from "node:test";
import assert from "node:assert/strict";
import { parseQuestionExplanation } from "./listeningExplanationUtils.ts";

test("Structured Vietnamese explanation: parses primary vi, evidence, and vocabularyNote", () => {
  const raw = {
    vi: "Người nói cho biết cửa hàng mở cửa lúc 9 giờ. Vì vậy đáp án đúng là D — At 9:00.",
    evidence: "The shop opens at nine o’clock.",
    keyPhrase: "opens at nine o’clock",
    vocabularyNote: "open at + time = mở cửa vào lúc …",
  };

  const parsed = parseQuestionExplanation(raw);
  assert.ok(parsed);
  assert.equal(parsed.type, "structured");
  if (parsed.type === "structured") {
    assert.equal(parsed.vi, "Người nói cho biết cửa hàng mở cửa lúc 9 giờ. Vì vậy đáp án đúng là D — At 9:00.");
    assert.equal(parsed.evidence, "The shop opens at nine o’clock.");
    assert.equal(parsed.keyPhrase, "opens at nine o’clock");
    assert.equal(parsed.vocabularyNote, "open at + time = mở cửa vào lúc …");
  }
});

test("Structured explanation: handles optional fields omitted gracefully", () => {
  const raw = {
    vi: "Người nói cần hai chai nước khoáng.",
  };

  const parsed = parseQuestionExplanation(raw);
  assert.ok(parsed);
  assert.equal(parsed.type, "structured");
  if (parsed.type === "structured") {
    assert.equal(parsed.vi, "Người nói cần hai chai nước khoáng.");
    assert.equal(parsed.evidence, undefined);
    assert.equal(parsed.keyPhrase, undefined);
    assert.equal(parsed.vocabularyNote, undefined);
  }
});

test("Legacy English string: maps to legacy type with explicit fallback notice", () => {
  const raw = "The time stated is nine o’clock.";

  const parsed = parseQuestionExplanation(raw);
  assert.ok(parsed);
  assert.equal(parsed.type, "legacy");
  if (parsed.type === "legacy") {
    assert.equal(parsed.text, "The time stated is nine o’clock.");
    assert.equal(parsed.fallbackNotice, "Giải thích chi tiết đang được cập nhật.");
  }
});

test("Empty or null explanation: returns null (prevents rendering empty cards)", () => {
  assert.equal(parseQuestionExplanation(null), null);
  assert.equal(parseQuestionExplanation(undefined), null);
  assert.equal(parseQuestionExplanation(""), null);
  assert.equal(parseQuestionExplanation("   "), null);
  assert.equal(parseQuestionExplanation({}), null);
  assert.equal(parseQuestionExplanation({ vi: "" }), null);
});

test("Whitespace handling: trims strings properly", () => {
  const raw = {
    vi: "  Cửa hàng mở lúc 9h.  ",
    evidence: "  The shop opens at nine o'clock.  ",
    vocabularyNote: "  open at = mở cửa  ",
  };

  const parsed = parseQuestionExplanation(raw);
  assert.ok(parsed);
  assert.equal(parsed.type, "structured");
  if (parsed.type === "structured") {
    assert.equal(parsed.vi, "Cửa hàng mở lúc 9h.");
    assert.equal(parsed.evidence, "The shop opens at nine o'clock.");
    assert.equal(parsed.vocabularyNote, "open at = mở cửa");
  }
});
