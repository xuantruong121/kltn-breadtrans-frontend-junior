"use client";

/**
 * TOEIC Listening & Reading detail, rendered by the canonical route
 * /exams/:examId. Lifted unchanged from the former /toeic/:examSetId page so
 * the briefing query, the Start mutation and the attempt target stay exactly
 * as they were proven; only the public URL that reaches it has changed.
 */
import { useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toeicService } from "@/lib/api/services/toeic.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useAuthStore } from "@/stores/authStore";
import ToeicExamDetailShell from "@/components/toeic/ToeicExamDetailShell";
import { canonicalExamDetailPath } from "@/lib/toeic/canonicalExamRoute";

const TOEIC_PART_NAMES: Record<number, string> = {
  1: "Mô tả hình ảnh (Photographs)",
  2: "Hỏi & Đáp (Question - Response)",
  3: "Đoạn hội thoại (Short Conversations)",
  4: "Bài nói ngắn (Short Talks)",
  5: "Điền câu (Incomplete Sentences)",
  6: "Điền đoạn văn (Text Completion)",
  7: "Đọc hiểu văn bản (Reading Comprehension)",
};

export default function ToeicLrExamDetail({
  examSetId,
  canonicalExamId,
  safeReturnTo,
}: {
  /** ToeicExamSet id -- the runtime identity, never shown in the URL. */
  examSetId: number;
  /** Exam (product) id -- the public identity, used for auth return routes. */
  canonicalExamId: number;
  safeReturnTo: string | null;
}) {
  const examId = examSetId;
  const router = useRouter();
  const { user } = useAuthStore();
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-briefing", examId],
    queryFn: () => toeicService.getBriefing(examId),
    enabled: hasMounted && Number.isInteger(examId) && !!user,
  });
  const startMutation = useMutation({
    mutationFn: () =>
      toeicService.startAttempt(
        examId,
        data?.type === "FULL_TEST" ? "FULL_TEST" : "PRACTICE",
      ),
    onSuccess: async ({ id }) => {
      await toeicService.beginAttempt(id);
      router.push(
        `/toeic/attempts/${id}${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`,
      );
    },
  });
  if (!hasMounted)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" />
      </div>
    );
  if (!user)
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Vui lòng đăng nhập để xem hướng dẫn và bắt đầu đề thi.
        </p>
        <AuthGateModal
          isOpen
          onClose={() => router.back()}
          targetRoute={canonicalExamDetailPath(canonicalExamId)}
          targetLabel="đề thi TOEIC này"
          onOpenLogin={() => router.push("/login")}
          onOpenRegister={() => router.push("/register")}
        />
      </div>
    );
  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-slate-600 dark:text-slate-400">
        Không tải được thông tin đề thi.
      </div>
    );

  const total = data.parts.reduce((sum, part) => sum + part.questionCount, 0);
  const listeningParts = data.parts.filter((p) => p.part <= 4);
  const readingParts = data.parts.filter((p) => p.part >= 5);
  const listeningTotal = listeningParts.reduce(
    (sum, p) => sum + p.questionCount,
    0,
  );
  const readingTotal = readingParts.reduce(
    (sum, p) => sum + p.questionCount,
    0,
  );

  const begin = () => {
    if (data.type === "FULL_TEST" && data.learnerReady === false) return;
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    void fullscreenRequest?.catch(() => undefined);
    startMutation.mutate();
  };


  const partSection = (
    heading: string,
    parts: typeof listeningParts,
    totalQuestions: number,
  ) => ({
    heading,
    measure: `${totalQuestions} câu`,
    items: parts.map((p) => ({
      label: (
        <>
          <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">
            Part {p.part}:
          </span>
          {TOEIC_PART_NAMES[p.part] || `Phần ${p.part}`}
        </>
      ),
      measure: `${p.questionCount} câu`,
    })),
  });

  const notReady = data.type === "FULL_TEST" && data.learnerReady === false;

  return (
    <ToeicExamDetailShell
      backHref={safeReturnTo || "/exams"}
      backLabel="Quay lại danh sách đề thi"
      badge={data.type === "FULL_TEST" ? "TOEIC Full Test" : "Luyện theo phần"}
      title={data.title}
      description={
        data.description ||
        "Bài luyện thi TOEIC chuẩn định dạng Listening & Reading."
      }
      structureHeading="Cấu trúc nội dung đề thi"
      structureSubtitle={`Tổng quy mô ${total} câu hỏi được phân bổ theo định dạng chuẩn`}
      structureBadge={`${data.parts.length} phần thi`}
      sections={[
        ...(listeningParts.length
          ? [
              partSection(
                "Phần 1: Kỹ năng Nghe (Listening)",
                listeningParts,
                listeningTotal,
              ),
            ]
          : []),
        ...(readingParts.length
          ? [
              partSection(
                "Phần 2: Kỹ năng Đọc (Reading)",
                readingParts,
                readingTotal,
              ),
            ]
          : []),
      ]}
      disclaimer={
        <>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Quy chế khảo thí &amp; Bản quyền:
          </span>{" "}
          Đề thi được biên soạn mô phỏng theo cấu trúc chuẩn TOEIC nhằm phục vụ
          mục đích tự đánh giá năng lực học thuật và rèn luyện kỹ năng làm bài.
          Nội dung không phải đề thi chính thức do ETS phát hành và không thay
          thế chứng chỉ TOEIC chính thức.
        </>
      }
      summaryHeading="Quy cách phòng thi"
      summaryRows={[
        { label: "Số câu hỏi", value: `${total} câu` },
        {
          label: "Thời lượng thi",
          value:
            data.type === "FULL_TEST" ? (
              <span className="block space-y-0.5">
                <span className="block">Listening 45 phút</span>
                <span className="block">Reading 75 phút</span>
              </span>
            ) : (
              `${Math.round(data.durationSeconds / 60)} phút`
            ),
        },
        {
          label: "Hình thức thi",
          value:
            data.type === "FULL_TEST"
              ? "Full Test (2 Kỹ năng)"
              : "Luyện theo phần",
        },
        { label: "Chế độ hiển thị", value: "Toàn màn hình", muted: true },
      ]}
      notices={
        <>
          {data.activeAttempt && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
              Bạn đang có một lượt thi dở dang cho đề này. Bấm để tiếp tục làm
              tiếp.
            </div>
          )}
          {notReady && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-200 font-medium">
              Đề thi này chưa đủ điều kiện phát hành Full Test.
            </div>
          )}
        </>
      }
      cta={{
        label: data.activeAttempt ? "Tiếp tục làm bài" : "Bắt đầu làm bài",
        onClick: begin,
        disabled: notReady,
        pending: startMutation.isPending,
      }}
      ctaError={
        startMutation.isError
          ? "Không thể khởi tạo lượt thi. Vui lòng thử lại."
          : null
      }
    />
  );
}
