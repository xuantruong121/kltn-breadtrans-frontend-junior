import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDuplicateLearningObjectivesSection } from "./lessonObjectives.ts";

const objectives = [
  "Ask and answer 'How are you?' questions",
  "Express simple feelings and daily status",
  "Use polite conversational fillers like 'Thank you' and 'Please'",
];

describe("isDuplicateLearningObjectivesSection", () => {
  it("hides a Section whenever the heading matches a known objectives label and the lesson has objectives", () => {
    const section = { heading: "Mục tiêu bài học" };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      true,
    );
  });

  it("hides a Section even when its content differs from the lesson's objectives, because the header already shows them", () => {
    const section = { heading: "Mục tiêu bài học" };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, [
        "A completely different objective than the section would show",
      ]),
      true,
    );
  });

  it("keeps an INTRO/'Mở đầu' Section even when its content happens to mention goals, because the heading doesn't match", () => {
    const section = { heading: "Mở đầu" };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      false,
    );
  });

  it("never hides a Section on a partial/substring heading match", () => {
    const section = { heading: "Mục tiêu và nội dung chính của bài" };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      false,
    );
  });

  it("returns false when there are no learningObjectives", () => {
    const section = { heading: "Mục tiêu bài học" };
    assert.equal(isDuplicateLearningObjectivesSection(section, []), false);
    assert.equal(
      isDuplicateLearningObjectivesSection(section, undefined),
      false,
    );
  });

  it("recognizes English objective heading equivalents", () => {
    for (const heading of [
      "Learning Objectives",
      "Lesson objectives",
      "Objectives",
      "Mục tiêu",
    ]) {
      const section = { heading };
      assert.equal(
        isDuplicateLearningObjectivesSection(section, objectives),
        true,
        `expected heading "${heading}" to be recognized`,
      );
    }
  });

  it("is diacritic- and casing-insensitive for the heading", () => {
    const section = { heading: "MUC TIEU BAI HOC" };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      true,
    );
  });
});
