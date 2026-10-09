import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isExamRoute,
  isSkillsRoute,
  isListeningRoute,
  isSpeakingRoute,
  isReadingRoute,
  isWritingRoute,
  isFlashcardRoute,
  isCoursesRoute,
  isMarketRoute,
  isMoreRoute,
} from "./navUtils.ts";

describe("Navigation Route Classification", () => {
  it("classifies canonical listening routes as Skills Practice, NOT Exam Practice", () => {
    assert.equal(isExamRoute("/listening"), false);
    assert.equal(isSkillsRoute("/listening"), true);

    assert.equal(isExamRoute("/listening/123"), false);
    assert.equal(isSkillsRoute("/listening/123"), true);

    // Listening practice submission/analytics
    assert.equal(isExamRoute("/listening/submissions/456"), false);
    assert.equal(isSkillsRoute("/listening/submissions/456"), true);
  });

  it("classifies exam catalog and TOEIC tests as Exam Practice (Luyện đề)", () => {
    // Exam catalog
    assert.equal(isExamRoute("/exams"), true);
    assert.equal(isSkillsRoute("/exams"), false);

    assert.equal(isExamRoute("/exams/"), true);
    assert.equal(isSkillsRoute("/exams/"), false);

    // TOEIC test routes
    assert.equal(isExamRoute("/toeic/1"), true);
    assert.equal(isSkillsRoute("/toeic/1"), false);

    assert.equal(isExamRoute("/toeic/attempts/99"), true);
    assert.equal(isSkillsRoute("/toeic/attempts/99"), false);

    assert.equal(isExamRoute("/toeic/results/99"), true);
    assert.equal(isSkillsRoute("/toeic/results/99"), false);

    assert.equal(isExamRoute("/toeic/bundle/5"), true);
    assert.equal(isSkillsRoute("/toeic/bundle/5"), false);
  });

  it("classifies other skill practice routes correctly", () => {
    // Hub
    assert.equal(isExamRoute("/practice"), false);
    assert.equal(isSkillsRoute("/practice"), false);
    assert.equal(isSkillsRoute("/listening"), true);

    // Speaking
    assert.equal(isExamRoute("/speaking"), false);
    assert.equal(isSkillsRoute("/speaking"), true);

    // Reading
    assert.equal(isExamRoute("/reading"), false);
    assert.equal(isSkillsRoute("/reading"), true);
    assert.equal(isExamRoute("/reading/1"), false);
    assert.equal(isSkillsRoute("/reading/1"), true);
    assert.equal(isSkillsRoute("/reading/mistakes"), true);

    // Writing
    assert.equal(isExamRoute("/writing"), false);
    assert.equal(isSkillsRoute("/writing"), true);

    // Vocab / Flashcard / Grammar
    assert.equal(isExamRoute("/flashcard/1"), false);
    assert.equal(isSkillsRoute("/flashcard/1"), true);
    assert.equal(isExamRoute("/flashcard"), false);
    assert.equal(isSkillsRoute("/flashcard"), true);
    assert.equal(isExamRoute("/grammar"), false);
    assert.equal(isSkillsRoute("/grammar"), true);
  });

  it("returns false for non-practice routes", () => {
    assert.equal(isExamRoute("/dashboard"), false);
    assert.equal(isSkillsRoute("/dashboard"), false);

    assert.equal(isExamRoute("/courses"), false);
    assert.equal(isSkillsRoute("/courses"), false);

    assert.equal(isExamRoute("/market"), false);
    assert.equal(isSkillsRoute("/market"), false);

    assert.equal(isExamRoute("/"), false);
    assert.equal(isSkillsRoute("/"), false);
  });

  it("classifies individual header route families accurately", () => {
    // 1. Listening
    assert.equal(isListeningRoute("/listening"), true);
    assert.equal(isListeningRoute("/listening/456"), true);
    assert.equal(isListeningRoute("/speaking"), false);

    // 2. Speaking
    assert.equal(isSpeakingRoute("/speaking"), true);
    assert.equal(isSpeakingRoute("/speaking/456"), true);
    assert.equal(isSpeakingRoute("/reading"), false);

    // 3. Reading (merges Reading and Grammar)
    assert.equal(isReadingRoute("/reading"), true);
  assert.equal(isReadingRoute("/reading/1"), true);
    assert.equal(isReadingRoute("/reading/mistakes"), true);
    assert.equal(isReadingRoute("/reading?tab=grammar"), false);
    assert.equal(isReadingRoute("/grammar"), true);
    assert.equal(isReadingRoute("/grammar/topic/1"), true);
    assert.equal(isReadingRoute("/writing/1"), false);

    // 4. Writing
    assert.equal(isWritingRoute("/writing"), true);
    assert.equal(isWritingRoute("/writing/3"), true);
    assert.equal(isWritingRoute("/listening"), false);

    // 5. Flashcard & Vocabulary
    assert.equal(isFlashcardRoute("/flashcard"), true);
    assert.equal(isFlashcardRoute("/flashcard/1"), true);
    assert.equal(isFlashcardRoute("/vocabulary/study"), true);
    assert.equal(isFlashcardRoute("/vocabulary/saved"), true);
    assert.equal(isFlashcardRoute("/flashcard/1"), true);
    assert.equal(isFlashcardRoute("/courses"), false);

    // 6. Courses (includes public courses, my-courses, classes)
    assert.equal(isCoursesRoute("/courses"), true);
    assert.equal(isCoursesRoute("/courses/12"), true);
    assert.equal(isCoursesRoute("/my-courses"), true);
    assert.equal(isCoursesRoute("/classes"), true);
    assert.equal(isCoursesRoute("/classes/45"), true);
    assert.equal(isCoursesRoute("/market"), false);

    // 7. Market
    assert.equal(isMarketRoute("/market"), true);
    assert.equal(isMarketRoute("/market/items"), true);
    assert.equal(isMarketRoute("/arena"), false);

    // 8. More (Arena, Help/Contact/Feedback)
    assert.equal(isMoreRoute("/arena"), true);
    assert.equal(isMoreRoute("/help"), true);
    assert.equal(isMoreRoute("/help#feedback"), true);
    assert.equal(isMoreRoute("/dashboard"), false);
  });
});
