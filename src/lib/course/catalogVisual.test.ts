import assert from "node:assert/strict";
import test from "node:test";
import { getCourseCardMedia } from "./catalogVisual.ts";

test("uses the backend-provided course thumbnail without deriving a local path", () => {
  const media = getCourseCardMedia({
    title: "Course",
    thumbnail: "https://cdn.example.test/catalog/courses/course-1/cover.svg",
  });

  assert.equal(media.src, "https://cdn.example.test/catalog/courses/course-1/cover.svg");
  assert.equal(media.fallbackSrc, null);
  assert.equal(media.alt, "Ảnh đại diện khóa học Course");
});

test("does not silently fall back to a misleading local course image", () => {
  const media = getCourseCardMedia({ title: "Ngữ pháp", thumbnail: null });
  assert.equal(media.src, null);
  assert.equal(media.fallbackSrc, null);
});
