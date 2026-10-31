import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COURSES_ENABLED } from "../../lib/featureFlags.ts";
import {
  MAIN_NAV_ORDER,
  MORE_DROPDOWN_ITEMS,
  MAX_HEADER_NAV_BUTTONS,
  splitNavOverflow,
  isExamRoute,
  isListeningRoute,
  isSpeakingRoute,
  isReadingRoute,
  isWritingRoute,
  isFlashcardRoute,
  isCoursesRoute,
  isMarketRoute,
  isMoreRoute,
} from "./navUtils.ts";

describe("Header Navigation Restructure Verification", () => {
  it("enforces the exact main desktop header logical order", () => {
    const expectedLabels = [
      "Home/Logo",
      "Nghe",
      "Nói",
      "Đọc",
      "Viết",
      "Flashcard",
      "Luyện đề",
      ...(COURSES_ENABLED ? ["Khóa học"] : ["Cửa hàng"]),
      ...(COURSES_ENABLED ? ["Cửa hàng"] : ["Bảng xếp hạng"]),
      "More",
    ];

    assert.equal(MAIN_NAV_ORDER.length, expectedLabels.length);
    MAIN_NAV_ORDER.forEach((item, index) => {
      assert.equal(item.label, expectedLabels[index]);
    });
  });

  it("ensures no standalone Grammar or My Courses items remain in global navigation", () => {
    const labels = MAIN_NAV_ORDER.map((item) => item.label);
    assert.equal(labels.includes("Ngữ pháp"), false);
    assert.equal(labels.includes("Khóa học của tôi"), false);
    assert.equal(labels.includes("Liên hệ"), false);
    assert.equal(labels.includes("Đề xuất"), false);
  });

  it("shows at most 8 destination buttons; the rest go into More", () => {
    const buttons = MAIN_NAV_ORDER.filter(
      (item) => item.label !== "Home/Logo" && item.label !== "More",
    );
    assert.equal(MAX_HEADER_NAV_BUTTONS, 8);
    assert.equal(buttons.length, 8);
    assert.deepEqual(
      MORE_DROPDOWN_ITEMS.map((item) => item.href),
      COURSES_ENABLED ? ["/arena", "/help"] : ["/help"],
    );
  });

  it("splitNavOverflow keeps a short list whole and has no More", () => {
    const eight = Array.from({ length: 8 }, (_, i) => i);
    assert.deepEqual(splitNavOverflow(eight), { visible: eight, overflow: [] });
    assert.deepEqual(splitNavOverflow([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), {
      visible: [1, 2, 3, 4, 5, 6, 7, 8],
      overflow: [9, 10],
    });
  });

  it("activates 'Đọc' for both Reading and Grammar routes", () => {
    assert.equal(isReadingRoute("/reading"), true);
    assert.equal(isReadingRoute("/reading/12"), true);
    assert.equal(isReadingRoute("/reading?tab=grammar"), false);
    assert.equal(isReadingRoute("/grammar"), true);
    assert.equal(isReadingRoute("/grammar/topic/5"), true);

    // Other skills should not activate Đọc
    assert.equal(isReadingRoute("/listening"), false);
    assert.equal(isReadingRoute("/speaking"), false);
    assert.equal(isReadingRoute("/writing"), false);
  });

  it("activates 'Khóa học' for Course catalog, My Courses, and Class routes", () => {
    assert.equal(isCoursesRoute("/courses"), true);
    assert.equal(isCoursesRoute("/courses/react-toeic"), true);
    assert.equal(isCoursesRoute("/my-courses"), true);
    assert.equal(isCoursesRoute("/classes"), true);
    assert.equal(isCoursesRoute("/classes/77"), true);

    assert.equal(isCoursesRoute("/market"), false);
  });

  it("activates 'More' for Leaderboard and FAQ routes", () => {
    assert.equal(isMoreRoute("/arena"), true);
    assert.equal(isMoreRoute("/arena/weekly"), true);
    assert.equal(isMoreRoute("/help"), true);

    assert.equal(isMoreRoute("/dashboard"), false);
    assert.equal(isMoreRoute("/practice"), false);
  });

  it("preserves active highlighting for all other skills, flashcard, and store", () => {
    assert.equal(isListeningRoute("/listening"), true);
    assert.equal(isSpeakingRoute("/speaking"), true);
    assert.equal(isWritingRoute("/writing"), true);
    assert.equal(isFlashcardRoute("/flashcard"), true);
    assert.equal(isFlashcardRoute("/vocabulary/study"), true);
    assert.equal(isMarketRoute("/market"), true);
  });

  it("activates 'Luyện đề' for exam catalog and certificate practice routes", () => {
    assert.equal(isExamRoute("/exams"), true);
    assert.equal(isExamRoute("/exams/"), true);
    assert.equal(isExamRoute("/toeic/1"), true);
    assert.equal(isExamRoute("/toeic/attempts/123"), true);

    // Skill quizzes like reading or listening should NOT activate Luyện đề
    assert.equal(isExamRoute("/listening/123"), false);
    assert.equal(isExamRoute("/reading"), false);
    assert.equal(isExamRoute("/listening"), false);
  });
});
