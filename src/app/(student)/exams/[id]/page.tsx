"use client";

/**
 * Canonical learner detail route for every TOEIC product: /exams/:examId.
 *
 * `examId` is the Generic Exam (product) id, which is the one identity that
 * spans both backend aggregates. This page resolves the product to whichever
 * aggregate backs it and renders the shared detail shell through the matching
 * adapter, so the learner never sees an aggregate-specific URL. It used to
 * redirect to /toeic/:examSetId or /toeic/assessments/:id, which is why the
 * three products ended up with two different public URL formats.
 */
import { use } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api/services/exam.service";
import { isSafeCourseReturn } from "@/lib/course/navigation";
import { resolveExamRuntimeBinding } from "@/lib/toeic/canonicalExamRoute";
import ToeicLrExamDetail from "@/modules/toeic/ToeicLrExamDetail";
import ToeicAssessmentDetail from "@/modules/toeic/ToeicAssessmentDetail";

export default function CanonicalExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const examId = Number(rawId);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo =
    returnTo && isSafeCourseReturn(returnTo) ? returnTo : null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exam-product", examId],
    queryFn: () => examService.getById(examId),
    enabled: Number.isInteger(examId) && examId > 0,
  });

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" />
      </div>
    );

  const binding = resolveExamRuntimeBinding(data);
  if (isError || !data || !binding)
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-slate-600 dark:text-slate-400">
        Không thể mở đề luyện tập này.
      </main>
    );

  return binding.kind === "LR" ? (
    <ToeicLrExamDetail
      examSetId={binding.examSetId}
      canonicalExamId={examId}
      safeReturnTo={safeReturnTo}
    />
  ) : (
    <ToeicAssessmentDetail assessmentId={binding.assessmentId} />
  );
}
