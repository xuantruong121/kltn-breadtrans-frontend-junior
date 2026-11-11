"use client";

/**
 * TOEIC Speaking & Writing / 4 Skills detail, rendered by the canonical route
 * /exams/:examId. Lifted unchanged from the former /toeic/assessments/:id page:
 * the same assessment query, the same attempt endpoint with the same
 * idempotency key, and the same runtime route after Start.
 */
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import ToeicExamDetailShell from "@/components/toeic/ToeicExamDetailShell";
import {
  buildAssessmentStructureRows,
  buildAssessmentSummaryFacts,
  getToeicDetailPresentation,
  resolveAssessmentReadiness,
  type ToeicAssessmentComponentView,
} from "@/lib/toeic/detailPresentation";
import { enterFullscreen } from "@/lib/toeic/useExamFullscreen";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type AssessmentDetail = {
  id: number;
  title: string;
  description: string | null;
  productFamily: string;
  /** Speaking & Writing and four-skill exams need Pro to start a new session. */
  requiredPlan?: "FREE" | "PRO";
  isLocked?: boolean;
  components: ToeicAssessmentComponentView[];
  attempt?: { id: number; status: string } | null;
};

export default function ToeicAssessmentDetail({
  assessmentId,
}: {
  /** ToeicAssessment id -- the runtime identity, never shown in the URL. */
  assessmentId: number;
}) {
  const id = assessmentId;
  const router = useRouter();
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["toeic-assessment", id],
    queryFn: async () =>
      (await axiosClient.get(
        `/toeic/assessments/${id}`,
      )) as unknown as AssessmentDetail,
    enabled: Number.isInteger(id),
  });
  // Unchanged orchestration: the same attempt endpoint and the same runtime
  // route as before this page was moved onto the shared detail shell.
  const start = useMutation({
    mutationFn: async () =>
      // Every press is a new session; the key only stops one press from opening
      // two. An unfinished session is reached from Khôi phục inside the room.
      (await axiosClient.post(`/toeic/assessments/${id}/attempts`, {
        idempotencyKey: crypto.randomUUID(),
      })) as unknown as {
        id: number;
      },
    onSuccess: (attempt) =>
      router.push(`/toeic/assessments/${id}/attempts/${attempt.id}`),
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, "Không thể bắt đầu bài thi."));
    },
  });

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" />
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-slate-600 dark:text-slate-400">
        Không tìm thấy bài thi này.
      </div>
    );

  const presentation = getToeicDetailPresentation(data.productFamily);
  const components = data.components ?? [];
  const structureRows = buildAssessmentStructureRows(components);
  const facts = buildAssessmentSummaryFacts(components, data.productFamily);
  const readiness = resolveAssessmentReadiness(components);

  // Each skill's size and time are already on its "Cấu trúc đề" card; the
  // side panel repeats only a single total, when every skill shares a unit.
  const summaryRows =
    facts.totalValue && facts.totalLabel
      ? [{ label: facts.totalLabel, value: facts.totalValue }]
      : [];
  // Say "not an official ETS test" once: only when the description does not.
  const description = data.description || presentation.summary;
  const mentionsEts = /ETS/.test(description);

  return (
    <ToeicExamDetailShell
      backHref="/exams"
      backLabel="Quay lại danh sách đề thi"
      badge={presentation.badge}
      title={data.title}
      description={description}
      structureHeading="Cấu trúc đề"
      sections={[
        {
          items: structureRows.map((row) => ({
            label: row.label,
            measure: row.measure,
            meta: row.meta,
          })),
        },
      ]}
      disclaimer={
        mentionsEts
          ? undefined
          : "Bài luyện mô phỏng TOEIC để tự học, không phải đề thi chính thức của ETS; kết quả không thay thế chứng chỉ TOEIC."
      }
      summaryHeading="Thông tin bài thi"
      summaryRows={summaryRows}
      notices={
        data.isLocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="flex items-start gap-2">
              <Lock size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Đề TOEIC Speaking &amp; Writing và đề 4 kỹ năng là quyền lợi của gói Pro. Đề Listening &amp; Reading mở
                cho mọi gói.
              </span>
            </p>
          </div>
        ) : !readiness.ready && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-sm text-rose-800 dark:text-rose-200 font-medium">
            <p>Đề thi này chưa đủ điều kiện để bắt đầu.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium">
              {readiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )
      }
      cta={
        data.isLocked
          ? {
              label: "Nâng cấp lên Pro",
              onClick: () => router.push("/plans?highlight=pro"),
              disabled: false,
              pending: false,
            }
          : {
              label: "Bắt đầu làm bài",
              onClick: () => {
                // Fullscreen must come from this click; the room keeps the same document.
                enterFullscreen();
                start.mutate();
              },
              disabled: !readiness.ready,
              pending: start.isPending,
            }
      }
      ctaError={error || null}
    />
  );
}
