/**
 * The learner-visible identity of a TOEIC product is the Generic Exam row, not
 * the aggregate that happens to back it. There are two aggregates with separate
 * ID spaces -- ToeicExamSet (L&R) and ToeicAssessment (S&W, 4 Skills) -- so
 * routing on the aggregate id produced two different public URL formats for the
 * same kind of thing. These helpers keep one public route model:
 *
 *   /exams/:examId        canonical, the Exam (product) id
 *   /toeic/:examSetId     legacy compatibility only
 *   /toeic/assessments/:assessmentId
 *                         legacy compatibility only
 *
 * The aggregates themselves are left exactly as they are; only the public
 * identity is unified.
 */

/** The shape the resolver needs from GET /exams -- a subset of the product DTO. */
export type ExamProductLink = {
  id: number;
  variantCode?: string | null;
  /** ToeicExamSet id for L&R products. */
  runtimeId?: number | null;
  assessment?: { id: number } | null;
};

export const CANONICAL_EXAM_DETAIL_PATTERN = "/exams/:examId";

export function canonicalExamDetailPath(examId: number): string {
  return `/exams/${examId}`;
}

/** Which aggregate backs a product. Returned so a caller can pick an adapter. */
export type ExamRuntimeBinding =
  | { kind: "LR"; examSetId: number }
  | { kind: "ASSESSMENT"; assessmentId: number };

/**
 * Resolve a product to the aggregate that carries its content and runtime.
 * L&R is checked first because a 4 Skills assessment also contains an L&R exam
 * set as one of its components -- the product's own variant decides, not the
 * presence of a relation.
 */
export function resolveExamRuntimeBinding(
  product: ExamProductLink | null | undefined,
): ExamRuntimeBinding | null {
  if (!product) return null;
  if (product.variantCode === "TOEIC_LR") {
    return typeof product.runtimeId === "number"
      ? { kind: "LR", examSetId: product.runtimeId }
      : null;
  }
  if (typeof product.assessment?.id === "number") {
    return { kind: "ASSESSMENT", assessmentId: product.assessment.id };
  }
  // A non-L&R product with no assessment, or an L&R product with no exam set,
  // is not routable -- the caller shows "not available" rather than guessing.
  return null;
}

/**
 * Reverse lookup for the legacy compatibility routes: given an aggregate id,
 * find the product that owns it. Positional assumptions are deliberately
 * avoided -- the match is on the real linkage carried by GET /exams.
 */
export function resolveCanonicalExamIdFromLegacy(
  products: ExamProductLink[],
  legacy: { examSetId?: number; assessmentId?: number },
): number | null {
  if (typeof legacy.examSetId === "number") {
    const owner = products.find(
      (product) =>
        product.variantCode === "TOEIC_LR" &&
        product.runtimeId === legacy.examSetId,
    );
    if (owner) return owner.id;
  }
  if (typeof legacy.assessmentId === "number") {
    const owner = products.find(
      (product) => product.assessment?.id === legacy.assessmentId,
    );
    if (owner) return owner.id;
  }
  return null;
}
