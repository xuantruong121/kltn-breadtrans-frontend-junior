"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminExamService } from "@/lib/api/services/adminExam.service";
import { ExamOutline } from "@/components/admin/exam/ExamOutline";
import { getPublishReadinessUi } from "@/lib/examStudio/readinessUi";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Tab = "info" | "structure" | "quality" | "preview";

const variantLabel = (variant?: string) =>
  ({
    TOEIC_LR: "Listening & Reading",
    TOEIC_SW: "Speaking & Writing",
    TOEIC_4_SKILLS: "4 kỹ năng",
  })[variant || ""] ||
  variant ||
  "Loại đề";

export default function ExamStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const examId = Number(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("structure");
  const [selectedPart, setSelectedPart] = useState<number | null>(5);

  const { data: exam, isLoading } = useQuery({
    queryKey: ["admin-exam-studio", examId],
    queryFn: () => adminExamService.getById(examId),
    enabled: Number.isInteger(examId),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adminExamService.unpublish(examId),
    onSuccess: () => {
      toast.success("Đã chuyển về bản nháp");
      void queryClient.invalidateQueries({ queryKey: ["admin-exam-studio", examId] });
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      if (code === "EXAM_HAS_ATTEMPTS") {
        toast.error(
          "Đề đã có lượt làm nên nội dung được khóa để bảo toàn kết quả cũ.",
        );
      } else {
        toast.error(getApiErrorMessage(err, "Không thể chuyển về bản nháp"));
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => adminExamService.publish(examId),
    onSuccess: () => {
      toast.success("Đã xuất bản đề thi");
      void queryClient.invalidateQueries({ queryKey: ["admin-exam-studio", examId] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể xuất bản đề thi")),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => adminExamService.duplicate(examId),
    onSuccess: (result: any) => {
      toast.success("Đã tạo phiên bản mới (bản nháp)");
      if (result?.id) router.push(`/admin/exams/${result.id}`);
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể tạo phiên bản mới")),
  });

  const issues = useMemo(
    () =>
      (exam?.validation?.issues ?? []).map((issue) => ({
        groupId: issue.groupId,
        questionId: issue.questionId,
      })),
    [exam],
  );

  if (isLoading || !exam) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  const isPublished = exam.publicationStatus === "PUBLISHED";
  const hasAttempts = (exam.attemptsCount ?? 0) > 0;
  const isLR = (exam.variantCode ?? "TOEIC_LR") !== "TOEIC_SW";
  const publishReadiness = getPublishReadinessUi(
    exam.learnerReady,
    exam.validation?.issues.length ?? 0,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/admin/exams")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft size={15} /> Quay lại danh sách đề thi
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {exam.title}
          </h1>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${isPublished ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {isPublished ? "Đã xuất bản" : "Bản nháp"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {exam.aiGenerationJobId && (
            <a
              href={`/admin/exams/ai/${exam.aiGenerationJobId}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Candidate AI
            </a>
          )}
          {!isPublished && (
            <a
              href={`/admin/exams?exam=${exam.id}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Mở trình soạn nội dung
            </a>
          )}
          <button
            type="button"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Nhân bản đề
          </button>
          {isPublished ? (
            hasAttempts ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Đề đã có lượt làm · nội dung bị khóa
              </span>
            ) : (
              <button
                type="button"
                onClick={() => unpublishMutation.mutate()}
                disabled={unpublishMutation.isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Chuyển về bản nháp
              </button>
            )
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending || !publishReadiness.canPublish}
                title={publishReadiness.helpText}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-slate-100 dark:text-slate-900"
              >
                {publishReadiness.label}
              </button>
              {!publishReadiness.canPublish && (
                <p className="max-w-[240px] text-right text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {publishReadiness.helpText}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-4 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            ["info", "Thông tin"],
            ["structure", "Cấu trúc & nội dung"],
            ["quality", "Kiểm tra"],
            ["preview", "Xem như học viên"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === key ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoRow label="Tên đề" value={exam.title} />
          <InfoRow label="Dạng đề" value={variantLabel(exam.variantCode)} />
          <InfoRow label="Trạng thái" value={isPublished ? "Đã xuất bản" : "Bản nháp"} />
          <InfoRow
            label="Thời lượng"
            value={
              exam.durationSeconds
                ? `${Math.round(exam.durationSeconds / 60)} phút`
                : "Chưa đặt"
            }
          />
          <InfoRow label="Số câu/task" value={String(exam.totalQuestions ?? 0)} />
          <InfoRow label="Lượt làm bài" value={String(exam.attemptsCount ?? 0)} />
          {exam.description && (
            <div className="sm:col-span-2">
              <InfoRow label="Mô tả" value={exam.description} />
            </div>
          )}
        </div>
      )}

      {tab === "structure" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {isLR ? (
            <>
              <ExamOutline
                groups={exam.groups}
                issues={issues}
                selectedPart={selectedPart}
                onSelectPart={setSelectedPart}
              />
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Part {selectedPart} ·{" "}
                  {exam.groups.filter((g) => g.part === selectedPart).length} nhóm câu.
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Soạn/sửa nội dung Part này trong trình soạn hiện có — Outline chỉ
                  điều hướng và cho biết tình trạng.
                </p>
                <a
                  href={`/admin/exams?exam=${exam.id}`}
                  className="mt-3 inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Mở trình soạn Part {selectedPart}
                </a>
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p>
                Speaking: {exam.readiness?.speakingCount ?? 0}/
                {exam.readiness?.speakingExpected ?? 11} task
              </p>
              <p className="mt-1">
                Writing: {exam.readiness?.writingCount ?? 0}/
                {exam.readiness?.writingExpected ?? 8} task
              </p>
              <a
                href={`/admin/exams?exam=${exam.id}`}
                className="mt-3 inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Mở soạn Speaking / Writing
              </a>
            </div>
          )}
        </div>
      )}

      {tab === "quality" && (
        <div className="mt-6 space-y-3">
          {(exam.readinessSummary ?? []).map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {row.label}
              </span>
              <span
                className={`text-xs font-medium ${row.state === "READY" ? "text-emerald-600" : row.state === "WARNING" ? "text-amber-600" : "text-slate-500"}`}
              >
                {row.state === "READY"
                  ? "Sẵn sàng"
                  : row.state === "WARNING"
                    ? `${row.issueCount} vấn đề`
                    : "Chưa hoàn thiện"}
              </span>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Cách chấm</p>
            <p className="mt-1">Listening &amp; Reading: Chấm tự động theo đáp án.</p>
            {!isLR && (
              <>
                <p className="mt-1">Speaking: AI đánh giá theo bộ tiêu chí của phần Nói.</p>
                <p className="mt-1">Writing: AI đánh giá theo bộ tiêu chí của phần Viết.</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Mở chế độ xem như học viên — không tạo lượt làm bài, không hiện đáp án.
          </p>
          <a
            href={`/admin/exams/${exam.id}/learner-preview`}
            className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Mở chế độ xem như học viên
          </a>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
