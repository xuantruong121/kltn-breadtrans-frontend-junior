import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const lessonSource = readFileSync("src/app/(student)/my-courses/[courseId]/lessons/[lessonId]/page.tsx", "utf8");
const overviewSource = readFileSync("src/app/(student)/my-courses/[courseId]/page.tsx", "utf8");

test("course learning uses native lesson/exercise routes", () => {
  assert.match(lessonSource, /getCourseLearningLesson/);
  assert.match(lessonSource, /submitCourseLearningExercise/);
  assert.match(lessonSource, /grid-cols/);
  assert.match(lessonSource, /Danh sách bài học/);
  assert.doesNotMatch(lessonSource, /getCourseActivityAccess/);
  assert.doesNotMatch(lessonSource, /LockKeyhole/);
});

test("course overview exposes every lesson without a lock gate", () => {
  assert.match(overviewSource, /getCourseLearningOverview/);
  assert.match(overviewSource, /data\.lessons\.map/);
  assert.doesNotMatch(overviewSource, /getCourseActivityAccess/);
  assert.doesNotMatch(overviewSource, /LockKeyhole/);
});

test("course lessons expose native media and open response practice", () => {
  assert.match(lessonSource, /controls preload="metadata"/);
  assert.match(lessonSource, /<textarea/);
  assert.match(lessonSource, /rubric/);
  assert.match(lessonSource, /Bạn còn .* câu chưa trả lời/);
  assert.match(lessonSource, /Đáp án đúng/);
  assert.match(lessonSource, /loading=\{mediaIndex === 0 \? "eager" : "lazy"\}/);
  assert.doesNotMatch(lessonSource, /Tài liệu tham khảo thêm/);
});

test("guided and final exercise regression fixture are distinct", () => {
  const guided = [
    "She ____ coffee every morning.",
    "He doesn't work here.",
    "I am working today.",
  ];
  const finalCheck = [
    "Look! Minh ___ for the bus now.",
    "My sister usually works from home, but this week she ___ at the office.",
    "Choose the corrected sentence for a weekly habit.",
  ];
  assert.equal(new Set([...guided, ...finalCheck]).size, guided.length + finalCheck.length);
  assert.match(guided[0], /She .*coffee every morning/);
  assert.equal(finalCheck.includes(guided[0]), false);
  assert.equal(finalCheck.includes(guided[1]), false);
  assert.equal(finalCheck.includes(guided[2]), false);
});
