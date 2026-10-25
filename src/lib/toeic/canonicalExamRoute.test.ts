import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_EXAM_DETAIL_PATTERN,
  canonicalExamDetailPath,
  resolveCanonicalExamIdFromLegacy,
  resolveExamRuntimeBinding,
  type ExamProductLink,
} from "./canonicalExamRoute.ts";

/** Mirrors the verified current data: Exam#2/3/4 over two ID spaces. */
const PRODUCTS: ExamProductLink[] = [
  { id: 2, variantCode: "TOEIC_LR", runtimeId: 1, assessment: null },
  { id: 3, variantCode: "TOEIC_SW", runtimeId: null, assessment: { id: 1 } },
  {
    id: 4,
    variantCode: "TOEIC_4_SKILLS",
    runtimeId: null,
    assessment: { id: 2 },
  },
];

test("all three products share one public route pattern", () => {
  const paths = PRODUCTS.map((p) => canonicalExamDetailPath(p.id));
  assert.deepEqual(paths, ["/exams/2", "/exams/3", "/exams/4"]);
  for (const path of paths) assert.match(path, /^\/exams\/\d+$/);
  assert.equal(CANONICAL_EXAM_DETAIL_PATTERN, "/exams/:examId");
});

test("L&R resolves to its exam set, not to an assessment", () => {
  assert.deepEqual(resolveExamRuntimeBinding(PRODUCTS[0]), {
    kind: "LR",
    examSetId: 1,
  });
});

test("S&W resolves to its assessment", () => {
  assert.deepEqual(resolveExamRuntimeBinding(PRODUCTS[1]), {
    kind: "ASSESSMENT",
    assessmentId: 1,
  });
});

test("4 Skills resolves to its assessment", () => {
  assert.deepEqual(resolveExamRuntimeBinding(PRODUCTS[2]), {
    kind: "ASSESSMENT",
    assessmentId: 2,
  });
});

test("a 4 Skills product is never routed as L&R even though it contains an L&R section", () => {
  // The variant decides, not the presence of a runtimeId: a 4 Skills
  // assessment carries an L&R exam set as one of its components.
  const fourSkillsWithLrSection: ExamProductLink = {
    id: 4,
    variantCode: "TOEIC_4_SKILLS",
    runtimeId: 99,
    assessment: { id: 2 },
  };
  assert.deepEqual(resolveExamRuntimeBinding(fourSkillsWithLrSection), {
    kind: "ASSESSMENT",
    assessmentId: 2,
  });
});

test("an unroutable product resolves to null instead of guessing", () => {
  assert.equal(resolveExamRuntimeBinding(null), null);
  assert.equal(resolveExamRuntimeBinding(undefined), null);
  assert.equal(
    resolveExamRuntimeBinding({ id: 9, variantCode: "TOEIC_LR", runtimeId: null }),
    null,
  );
  assert.equal(
    resolveExamRuntimeBinding({ id: 9, variantCode: "TOEIC_SW", assessment: null }),
    null,
  );
});

test("legacy L&R url resolves to its owning product", () => {
  assert.equal(
    resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId: 1 }),
    2,
  );
});

test("legacy assessment urls resolve to their owning products", () => {
  assert.equal(
    resolveCanonicalExamIdFromLegacy(PRODUCTS, { assessmentId: 1 }),
    3,
  );
  assert.equal(
    resolveCanonicalExamIdFromLegacy(PRODUCTS, { assessmentId: 2 }),
    4,
  );
});

test("the two ID spaces are never confused", () => {
  // examSet 1 and assessment 1 are different objects owned by different
  // products; resolving by the wrong space must not return the other's owner.
  assert.equal(resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId: 1 }), 2);
  assert.equal(resolveCanonicalExamIdFromLegacy(PRODUCTS, { assessmentId: 1 }), 3);
  // assessment 2 exists, but there is no exam set 2 owned by any product
  assert.equal(resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId: 2 }), null);
});

test("an unknown legacy id does not redirect anywhere", () => {
  assert.equal(
    resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId: 404 }),
    null,
  );
  assert.equal(resolveCanonicalExamIdFromLegacy([], { assessmentId: 1 }), null);
});

test("the canonical route never resolves back into a legacy route", () => {
  // Guards the redirect loop: a canonical id maps to /exams/:id only.
  for (const product of PRODUCTS) {
    const path = canonicalExamDetailPath(product.id);
    assert.doesNotMatch(path, /^\/toeic\//);
  }
});

// --- runtime back-link call sites -----------------------------------------
// These mirror what the runtime pages actually know: the assessment attempt
// page knows only an assessmentId, the bundle page only an examSetId.

test("assessment attempt backlink resolves to the canonical exam url", () => {
  const assessmentId = 1; // what /toeic/assessments/1/attempts/:id knows
  const examId = resolveCanonicalExamIdFromLegacy(PRODUCTS, { assessmentId });
  assert.equal(examId, 3);
  assert.equal(canonicalExamDetailPath(examId as number), "/exams/3");
});

test("bundle backlink resolves to the canonical exam url", () => {
  const examSetId = 1; // what the bundle knows about its L&R half
  const examId = resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId });
  assert.equal(examId, 2);
  assert.equal(canonicalExamDetailPath(examId as number), "/exams/2");
});

test("reverse mapping follows linkage, not a hardcoded number table", () => {
  // Same aggregate ids, different owners: the result must follow the linkage.
  const relinked: ExamProductLink[] = [
    { id: 77, variantCode: "TOEIC_LR", runtimeId: 1, assessment: null },
    { id: 88, variantCode: "TOEIC_SW", runtimeId: null, assessment: { id: 1 } },
  ];
  assert.equal(
    resolveCanonicalExamIdFromLegacy(relinked, { examSetId: 1 }),
    77,
  );
  assert.equal(
    resolveCanonicalExamIdFromLegacy(relinked, { assessmentId: 1 }),
    88,
  );
  // and the original fixture still maps to its own owners
  assert.equal(resolveCanonicalExamIdFromLegacy(PRODUCTS, { examSetId: 1 }), 2);
});

test("a resolved runtime backlink needs no compatibility redirect", () => {
  // Every back-link destination is already canonical, so it never lands on a
  // /toeic/* URL that would then have to redirect.
  for (const legacy of [{ assessmentId: 1 }, { assessmentId: 2 }, { examSetId: 1 }]) {
    const examId = resolveCanonicalExamIdFromLegacy(PRODUCTS, legacy);
    assert.notEqual(examId, null);
    const path = canonicalExamDetailPath(examId as number);
    assert.match(path, /^\/exams\/\d+$/);
    assert.doesNotMatch(path, /\/toeic\//);
  }
});
