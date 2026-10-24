"use client";

import { use, useState } from "react";
import { Loader2 } from "lucide-react";
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

type AssessmentDetail = {
  id: number;
  title: string;
  description: string | null;
  productFamily: string;
  components: ToeicAssessmentComponentView[];
  attempt?: { id: number; status: string } | null;
};

export default function ToeicAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
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
      (await axiosClient.post(`/toeic/assessments/${id}/attempts`, {
        idempotencyKey: `learner-${id}`,
      })) as unknown as { id: number },
    onSuccess: (attempt) =>
      router.push(`/toeic/assessments/${id}/attempts/${attempt.id}`),
    onError: (err: unknown) => {
      const message = (
        err as { response?: { data?: { message?: string } } } | null
      )?.response?.data?.message;
      setError(message ?? "Không thể bắt đầu bài thi.");
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
  const isCompleted = data.attempt?.status === "COMPLETED";

  const summaryRows = [
    // One total only when every skill shares the same unit; otherwise the
    // sizes are listed per skill so questions are never added to tasks.
    ...(facts.totalValue && facts.totalLabel
      ? [{ label: facts.totalLabel, value: facts.totalValue }]
      : facts.itemLines.length
        ? [
            {
              label: "Quy mô đề thi",
              value: (
                <span className="block space-y-0.5">
                  {facts.itemLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              ),
            },
          ]
        : []),
    {
      label: "Thời lượng thi",
      value: (
        <span className="block space-y-0.5">
          {facts.durationLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      ),
    },
    { label: "Hình thức thi", value: facts.format },
    {
      label: "Quyền truy cập",
      value: "Kiểm tra trước khi bắt đầu",
      muted: true,
    },
  ];

  return (
    <ToeicExamDetailShell
      backHref="/exams"
      backLabel="Quay lại danh sách đề thi"
      badge={presentation.badge}
      title={data.title}
      description={data.description || presentation.summary}
      structureHeading="Cấu trúc nội dung đề thi"
      structureSubtitle={
        facts.totalValue
          ? `Tổng quy mô ${facts.totalValue} theo từng kỹ năng`
          : "Quy mô đề thi theo từng kỹ năng"
      }
      structureBadge={`${structureRows.length} kỹ năng`}
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
        <>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Quy chế khảo thí &amp; Bản quyền:
          </span>{" "}
          Đây là bài luyện mô phỏng TOEIC để tự học và theo dõi tiến độ. Nội
          dung không phải đề thi chính thức do ETS phát hành và kết quả không
          thay thế chứng chỉ TOEIC chính thức.
        </>
      }
      summaryHeading="Quy cách phòng thi"
      summaryRows={summaryRows}
      notices={
        <>
          {data.attempt && !isCompleted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
              Bạn đang có một lượt thi dở dang cho đề này. Bấm để tiếp tục làm
              tiếp.
            </div>
          )}
          {!readiness.ready && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-200 font-medium">
              <p>Đề thi này chưa đủ điều kiện để bắt đầu.</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 font-normal">
                {readiness.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      }
      cta={{
        label: isCompleted
          ? "Đã hoàn thành"
          : data.attempt
            ? "Tiếp tục làm bài"
            : "Bắt đầu làm bài",
        onClick: () => start.mutate(),
        disabled: isCompleted || !readiness.ready,
        pending: start.isPending,
      }}
      ctaError={error || null}
    />
  );
}
