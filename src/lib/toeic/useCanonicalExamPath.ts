"use client";

/**
 * Reverse-resolve a canonical exam path from a runtime identity.
 *
 * Runtime pages only know the aggregate they are running (a ToeicExamSet id or
 * a ToeicAssessment id), but the learner-visible detail route is keyed by the
 * Generic Exam (product) id. Rather than let each call site navigate to its
 * legacy aggregate URL and lean on the compatibility redirect, they ask this
 * hook for the canonical path and go straight there.
 *
 * The owner is found through the real linkage returned by GET /exams. There is
 * deliberately no numeric mapping table here: the two aggregate ID spaces
 * overlap, so assessment 1 and exam set 1 are different objects and only the
 * linkage can tell which product owns which.
 */
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api/services/exam.service";
import {
  canonicalExamDetailPath,
  resolveCanonicalExamIdFromLegacy,
} from "./canonicalExamRoute";

/**
 * Shared across every caller so the product list is fetched once per session
 * and the legacy-redirect shim and the runtime back-links hit the same cache.
 */
export const EXAM_PRODUCT_LINKS_QUERY_KEY = ["exam-product-links"] as const;

export type CanonicalExamPathResult = {
  /** The canonical path, or null while unresolved or if no owner exists. */
  path: string | null;
  /** True once the lookup has settled, either way. */
  isResolved: boolean;
};

export function useCanonicalExamPath(legacy: {
  examSetId?: number;
  assessmentId?: number;
}): CanonicalExamPathResult {
  const hasIdentity =
    typeof legacy.examSetId === "number" ||
    typeof legacy.assessmentId === "number";

  const { data, isSuccess, isError } = useQuery({
    queryKey: EXAM_PRODUCT_LINKS_QUERY_KEY,
    queryFn: () => examService.getPublished(),
    enabled: hasIdentity,
    staleTime: 5 * 60 * 1000,
  });

  if (!hasIdentity) return { path: null, isResolved: true };
  if (isError) return { path: null, isResolved: true };
  if (!isSuccess || !data) return { path: null, isResolved: false };

  const examId = resolveCanonicalExamIdFromLegacy(data, legacy);
  return {
    path: examId === null ? null : canonicalExamDetailPath(examId),
    isResolved: true,
  };
}
