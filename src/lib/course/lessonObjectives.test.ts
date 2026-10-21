import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDuplicateLearningObjectivesSection } from "./lessonObjectives.ts";

const objectives = [
  "Ask and answer 'How are you?' questions",
  "Express simple feelings and daily status",
  "Use polite conversational fillers like 'Thank you' and 'Please'",
];

describe("isDuplicateLearningObjectivesSection", () => {
  it("hides a Section when the heading matches a known objectives label AND its bullets exactly reflect learningObjectives", () => {
    const section = {
      heading: "Mục tiêu bài học",
      content: { bullets: [...objectives] },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      true,
    );
  });

  it("hides a Section when the heading matches and bullets are equivalent after normalization (casing/punctuation)", () => {
    const section = {
      heading: "MỤC TIÊU BÀI HỌC",
      content: {
        bullets: [
          "ask and answer 'how are you' questions",
          "express simple feelings and daily status.",
          "use polite conversational fillers like 'thank you' and 'please'",
        ],
      },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      true,
    );
  });

  it("keeps the Section when the heading matches but it has additional meaningful content beyond the objectives", () => {
    const section = {
      heading: "Mục tiêu bài học",
      content: {
        bullets: [...objectives, "Complete the review quiz at the end."],
      },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      false,
    );
  });

  it("keeps an INTRO/'Mở đầu' Section even when its content happens to mention goals, because the heading doesn't match", () => {
    const section = {
      heading: "Mở đầu",
      content: {
        paragraphs: [
          "Hôm nay chúng ta sẽ luyện các mục tiêu: hỏi thăm sức khỏe, bày tỏ cảm xúc, dùng lời lẽ lịch sự.",
          "Bài học cũng giới thiệu một đoạn hội thoại mẫu giữa hai đồng nghiệp.",
        ],
      },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      false,
    );
  });

  it("never hides a Section on heading match alone — heading-only forbidden shortcut is not implemented", () => {
    // A heading that merely *contains* "mục tiêu" as a substring inside a
    // longer, different heading must not match the exact-candidate set.
    const section = {
      heading: "Mục tiêu và nội dung chính của bài",
      content: { bullets: [...objectives] },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      false,
    );
  });

  it("returns false when there are no learningObjectives", () => {
    const section = {
      heading: "Mục tiêu bài học",
      content: { bullets: ["Something"] },
    };
    assert.equal(isDuplicateLearningObjectivesSection(section, []), false);
    assert.equal(
      isDuplicateLearningObjectivesSection(section, undefined),
      false,
    );
  });

  it("returns false (safe) for an empty Section", () => {
    const section = { heading: "Mục tiêu bài học", content: {} };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
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
      const section = { heading, content: { bullets: [...objectives] } };
      assert.equal(
        isDuplicateLearningObjectivesSection(section, objectives),
        true,
        `expected heading "${heading}" to be recognized`,
      );
    }
  });

  it("falls back to paragraphs when the Section has no bullets", () => {
    const section = {
      heading: "Mục tiêu bài học",
      content: { paragraphs: [...objectives] },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, objectives),
      true,
    );
  });

  it("real Course 12 / Lesson 656 shape: bullets mirror objectives exactly but an extra framing paragraph exists — KEEP", () => {
    // Confirmed from source: Lesson 656's "Mục tiêu bài học" INTRO section
    // has bullets that exactly match learningObjectives, plus one extra
    // paragraph that is not part of the objectives list.
    const lesson656Objectives = [
      "Biết IPA ghi âm thanh chứ không ghi chính tả.",
      "Đọc được phiên âm đơn giản trong từ điển.",
      "Nhận ra âm đầu và âm cuối quan trọng.",
    ];
    const section = {
      heading: "Mục tiêu bài học",
      content: {
        bullets: [...lesson656Objectives],
        paragraphs: [
          "Hiểu Bảng ký hiệu phiên âm quốc tế (IPA) và cách dùng ký hiệu để đọc từ mới.",
        ],
      },
    };
    assert.equal(
      isDuplicateLearningObjectivesSection(section, lesson656Objectives),
      false,
    );
  });
});
