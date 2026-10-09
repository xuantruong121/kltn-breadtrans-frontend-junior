import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAIN_NAV_ORDER,
  MORE_DROPDOWN_ITEMS,
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
      "Khóa học",
      "Cửa hàng",
      "More",
    ];

    assert.equal(MAIN_NAV_ORDER.length, 10);
    MAIN_NAV_ORDER.forEach((item, index) => {
      assert.equal(item.label, expectedLabels[index]);
    });
  });

  it("ensures no standalone Grammar or My Courses items remain in global navigation", () => {
    const labels = MAIN_NAV_ORDER.map((item) => item.label);
    assert.equal(labels.includes("Ngữ pháp"), false);
    assert.equal(labels.includes("Khóa học của tôi"), false);
    assert.equal(labels.includes("Bảng xếp hạng"), false);
    assert.equal(labels.includes("Liên hệ"), false);
    assert.equal(labels.includes("Đề xuất"), false);
  });

  it("verifies the More dropdown contains exactly Bảng xếp hạng, Liên hệ, and Đề xuất", () => {
    assert.equal(MORE_DROPDOWN_ITEMS.length, 3);
    assert.equal(MORE_DROPDOWN_ITEMS[0].label, "Bảng xếp hạng");
    assert.equal(MORE_DROPDOWN_ITEMS[0].href, "/arena");

    assert.equal(MORE_DROPDOWN_ITEMS[1].label, "Liên hệ");
    assert.equal(MORE_DROPDOWN_ITEMS[1].href, "/help");

    assert.equal(MORE_DROPDOWN_ITEMS[2].label, "Đề xuất");
    assert.equal(MORE_DROPDOWN_ITEMS[2].href, "/help#feedback");
  });

  it("activates 'Đọc' for both Reading and Grammar routes", () => {
    assert.equal(isReadingRoute("/reading"), true);
    assert.equal(isReadingRoute("/reading/quizzes/12"), true);
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

  it("activates 'More' for Leaderboard and Help/Contact/Feedback routes", () => {
    assert.equal(isMoreRoute("/arena"), true);
    assert.equal(isMoreRoute("/arena/weekly"), true);
    assert.equal(isMoreRoute("/help"), true);
    assert.equal(isMoreRoute("/help#feedback"), true);

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
