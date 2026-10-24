"use client";

/**
 * Legacy detail URL. The canonical learner route is /exams/:examId; this path
 * stays reachable for old links and redirects there once. The L&R detail UI now
 * lives in src/modules/toeic/ToeicLrExamDetail.tsx.
 */
import { use } from "react";
import { useSearchParams } from "next/navigation";
import LegacyExamRouteRedirect from "@/modules/toeic/LegacyExamRouteRedirect";

export default function LegacyToeicExamSetPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId: rawExamId } = use(params);
  const search = useSearchParams().toString();
  return (
    <LegacyExamRouteRedirect
      examSetId={Number(rawExamId)}
      search={search || undefined}
    />
  );
}
