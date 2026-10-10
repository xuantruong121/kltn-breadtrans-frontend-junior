import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("Course catalog is the single learner discovery entry", () => {
  const catalog = read("src/app/(public)/courses/page.tsx");
  const rootMyCourses = read("src/app/(student)/my-courses/page.tsx");

  assert.equal(catalog.includes('role="tablist"'), false);
  assert.equal(catalog.includes("Khám phá khóa học"), false);
  assert.equal(catalog.includes("Khóa học của tôi"), false);
  assert.match(rootMyCourses, /redirect\("\/courses"\)/);
});

test("Nested learner and lesson routes remain registered", () => {
  assert.equal(
    fs.existsSync(path.join(root, "src/app/(student)/my-courses/[courseId]/page.tsx")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, "src/app/(student)/my-courses/[courseId]/lessons/[lessonId]/page.tsx")),
    true,
  );
  assert.match(read("src/lib/course/navigation.ts"), /isSafeCourseReturn/);
});

test("Course imagery has no overlaid illustration captions", () => {
  const detailRoutes = [
    "src/app/(public)/courses/[id]/page.tsx",
    "src/app/(student)/my-courses/[courseId]/page.tsx",
    "src/app/(student)/my-courses/[courseId]/lessons/[lessonId]/page.tsx",
  ];

  for (const route of detailRoutes) {
    const source = read(route);
    assert.equal(source.includes("mediaLabel"), false, route);
    assert.equal(source.includes("Minh họa"), false, route);
  }

  const visuals = read("src/lib/course/catalogVisual.ts");
  assert.equal(visuals.includes("Minh họa"), false);
});
