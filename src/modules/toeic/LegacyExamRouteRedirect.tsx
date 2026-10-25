"use client";

/**
 * Compatibility shim for the pre-unification detail URLs. The canonical learner
 * route is /exams/:examId; an old aggregate URL still works but resolves its
 * owning Generic Exam and replaces itself with the canonical one exactly once.
 *
 * The owner is found through the real linkage carried by GET /exams, never by
 * assuming the aggregate id equals the product id -- the two ID spaces differ.
 * `router.replace` is used so the compatibility URL does not enter history.
 */
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api/services/exam.service";
import {
  canonicalExamDetailPath,
  resolveCanonicalExamIdFromLegacy,
} from "@/lib/toeic/canonicalExamRoute";
import { EXAM_PRODUCT_LINKS_QUERY_KEY } from "@/lib/toeic/useCanonicalExamPath";

export default function LegacyExamRouteRedirect({
  examSetId,
  assessmentId,
  search,
}: {
  examSetId?: number;
  assessmentId?: number;
  /** Preserved query string, e.g. a course returnTo. */
  search?: string;
}) {
  const router = useRouter();
  const { data, isError } = useQuery({
    queryKey: EXAM_PRODUCT_LINKS_QUERY_KEY,
    queryFn: () => examService.getPublished(),
  });

  const canonicalId = data
    ? resolveCanonicalExamIdFromLegacy(data, { examSetId, assessmentId })
    : null;

  useEffect(() => {
    if (canonicalId === null) return;
    const suffix = search ? `?${search}` : "";
    router.replace(`${canonicalExamDetailPath(canonicalId)}${suffix}`);
  }, [canonicalId, router, search]);

  if (isError || (data && canonicalId === null))
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-slate-600 dark:text-slate-400">
        Không thể mở đề luyện tập này.
      </main>
    );

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2
        className="animate-spin text-amber-600 dark:text-amber-400"
        aria-label="Đang mở đề luyện tập"
      />
    </div>
  );
}
