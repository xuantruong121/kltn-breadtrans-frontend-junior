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
  it("classifies listening practice routes as Skills Practice, NOT Exam Practice", () => {
    // Listening catalog
    assert.equal(isExamRoute("/practice/listening"), false);
    assert.equal(isSkillsRoute("/practice/listening"), true);

    // Any listening practice exercise (e.g. /practice/quizzes/123)
    assert.equal(isExamRoute("/practice/quizzes/123"), false);
    assert.equal(isSkillsRoute("/practice/quizzes/123"), true);

    // Listening practice submission/analytics
    assert.equal(isExamRoute("/practice/quizzes/submissions/456"), false);
    assert.equal(isSkillsRoute("/practice/quizzes/submissions/456"), true);
  });

  it("classifies exam catalog and TOEIC tests as Exam Practice (Luyện đề)", () => {
    // Exam catalog
    assert.equal(isExamRoute("/practice/quizzes"), true);
    assert.equal(isSkillsRoute("/practice/quizzes"), false);

    assert.equal(isExamRoute("/practice/quizzes/"), true);
    assert.equal(isSkillsRoute("/practice/quizzes/"), false);

    // TOEIC test routes
    assert.equal(isExamRoute("/practice/toeic/1"), true);
    assert.equal(isSkillsRoute("/practice/toeic/1"), false);

    assert.equal(isExamRoute("/practice/toeic/attempts/99"), true);
    assert.equal(isSkillsRoute("/practice/toeic/attempts/99"), false);

    assert.equal(isExamRoute("/practice/toeic/results/99"), true);
    assert.equal(isSkillsRoute("/practice/toeic/results/99"), false);

    assert.equal(isExamRoute("/practice/toeic/bundle/5"), true);
    assert.equal(isSkillsRoute("/practice/toeic/bundle/5"), false);
  });

  it("classifies other skill practice routes correctly", () => {
    // Hub
    assert.equal(isExamRoute("/practice"), false);
    assert.equal(isSkillsRoute("/practice"), true);

    // Speaking
    assert.equal(isExamRoute("/practice/speaking"), false);
    assert.equal(isSkillsRoute("/practice/speaking"), true);

    // Reading
    assert.equal(isExamRoute("/practice/reading"), false);
    assert.equal(isSkillsRoute("/practice/reading"), true);
    assert.equal(isExamRoute("/practice/reading/1"), false);
    assert.equal(isSkillsRoute("/practice/reading/1"), true);

    // Writing
    assert.equal(isExamRoute("/practice/writing"), false);
    assert.equal(isSkillsRoute("/practice/writing"), true);

    // Vocab / Flashcard / Grammar
    assert.equal(isExamRoute("/practice/vocab"), false);
    assert.equal(isSkillsRoute("/practice/vocab"), true);
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
    assert.equal(isListeningRoute("/practice/listening"), true);
    assert.equal(isListeningRoute("/practice/listening/123"), true);
    assert.equal(isListeningRoute("/practice/speaking"), false);

    // 2. Speaking
    assert.equal(isSpeakingRoute("/practice/speaking"), true);
    assert.equal(isSpeakingRoute("/practice/speaking/456"), true);
    assert.equal(isSpeakingRoute("/practice/reading"), false);

    // 3. Reading (merges Reading and Grammar)
    assert.equal(isReadingRoute("/practice/reading"), true);
    assert.equal(isReadingRoute("/practice/reading/1"), true);
    assert.equal(isReadingRoute("/practice/reading?tab=grammar"), true);
    assert.equal(isReadingRoute("/grammar"), true);
    assert.equal(isReadingRoute("/grammar/topic/1"), true);
    assert.equal(isReadingRoute("/practice/writing"), false);

    // 4. Writing
    assert.equal(isWritingRoute("/practice/writing"), true);
    assert.equal(isWritingRoute("/practice/writing/3"), true);
    assert.equal(isWritingRoute("/practice/listening"), false);

    // 5. Flashcard & Vocabulary
    assert.equal(isFlashcardRoute("/flashcard"), true);
    assert.equal(isFlashcardRoute("/flashcard/1"), true);
    assert.equal(isFlashcardRoute("/vocabulary/study"), true);
    assert.equal(isFlashcardRoute("/vocabulary/saved"), true);
    assert.equal(isFlashcardRoute("/practice/vocab"), true);
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
