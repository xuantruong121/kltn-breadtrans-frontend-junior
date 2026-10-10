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
  assert.match(lessonSource, /references/);
});
