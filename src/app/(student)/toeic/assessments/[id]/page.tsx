"use client";

/**
 * Legacy detail URL. The canonical learner route is /exams/:examId; this path
 * stays reachable for old links and redirects there once. The assessment detail
 * UI now lives in src/modules/toeic/ToeicAssessmentDetail.tsx.
 */
import { use } from "react";
import { useSearchParams } from "next/navigation";
import LegacyExamRouteRedirect from "@/modules/toeic/LegacyExamRouteRedirect";

export default function LegacyToeicAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const search = useSearchParams().toString();
  return (
    <LegacyExamRouteRedirect
      assessmentId={Number(rawId)}
      search={search || undefined}
    />
  );
}
