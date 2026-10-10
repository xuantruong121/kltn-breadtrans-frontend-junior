import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getCourseCardMedia } from "./catalogVisual.ts";

test("maps all eight course cards to distinct local visuals", () => {
  const media = Array.from({ length: 8 }, (_, index) =>
    getCourseCardMedia({ id: index + 1 }),
  );

  assert.equal(new Set(media.map((item) => item.src)).size, 8);
  assert.ok(media.every((item) => item.src.includes("/images/courses/photos/")));
  assert.ok(media.every((item) => item.fallbackSrc.endsWith(".svg")));
  assert.ok(
    media.every((item) =>
      fs.existsSync(new URL(`../../../public${item.fallbackSrc}`, import.meta.url)),
    ),
  );
  assert.ok(media.every((item) => item.alt.length > 10));
});

test("keeps local photography primary while using profile label and SVG fallback", () => {
  assert.deepEqual(
    getCourseCardMedia({
      id: 8,
      learning: {
        introduction: "",
        objectives: [],
        studyGuidance: "",
        mediaLabel: "Ngữ pháp và từ vựng",
        coverImage: "/images/courses/course-8-grammar-vocabulary.svg",
      },
    }),
    {
      src: "/images/courses/photos/course-8-grammar-vocabulary.jpg",
      fallbackSrc: "/images/courses/course-8-grammar-vocabulary.svg",
      alt: "Học ngữ pháp, từ vựng và xây dựng câu tiếng Anh",
    },
  );
});
