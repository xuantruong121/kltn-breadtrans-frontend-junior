"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";
import { isSafeCourseReturn } from "@/lib/course/navigation";
import { ToeicLrResult } from "@/components/toeic/result/ToeicLrResult";

export default function ToeicResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId: rawAttemptId } = use(params);
  const attemptId = Number(rawAttemptId);
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const parentAttemptId = searchParams.get("parentAttemptId");
  const parentComponentId = searchParams.get("parentComponentId");
  const parentAssessmentId = searchParams.get("parentAssessmentId");
  const courseReturn =
    requestedReturnTo && isSafeCourseReturn(requestedReturnTo)
      ? requestedReturnTo
      : null;
  // Arriving straight from a submitted assessment section closes that
  // section once (idempotent on the server). Reopening the result later
  // carries no parent parameters and writes nothing.
  const completeParent = useMutation({
    mutationFn: async () => {
      if (!parentAttemptId || !parentComponentId) return;
      await toeicService.completeAssessmentComponent(
        Number(parentAttemptId),
        Number(parentComponentId),
      );
    },
  });
  const completedParentRef = useRef(false);
  useEffect(() => {
    if (!parentAttemptId || !parentComponentId || completedParentRef.current)
      return;
    completedParentRef.current = true;
    completeParent.mutate();
  }, [parentAttemptId, parentComponentId]);
  const secondary =
    "inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <ToeicLrResult
        attemptId={attemptId}
        extraActions={
          <>
            {parentAttemptId && parentAssessmentId && (
              <Link href={`/toeic/assessments/${parentAssessmentId}/attempts/${parentAttemptId}`} className={secondary}>
                Quay lại tiến độ bài thi
              </Link>
            )}
            {courseReturn && (
              <Link href={courseReturn} className={secondary}>
                Quay lại khóa học
              </Link>
            )}
          </>
        }
      />
    </main>
  );
}
