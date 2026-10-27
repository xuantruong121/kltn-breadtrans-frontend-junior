"use client";

/**
 * TOEIC Listening & Reading detail, rendered by the canonical route
 * /exams/:examId. Lifted unchanged from the former /toeic/:examSetId page so
 * the briefing query, the Start mutation and the attempt target stay exactly
 * as they were proven; only the public URL that reaches it has changed.
 */
import { useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toeicService } from "@/lib/api/services/toeic.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useAuthStore } from "@/stores/authStore";
import ToeicExamDetailShell from "@/components/toeic/ToeicExamDetailShell";
import { canonicalExamDetailPath } from "@/lib/toeic/canonicalExamRoute";
import { getApiErrorMessage } from "@/lib/utils/apiError";

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
  // Two modes: practice chosen Parts, or the whole Full Test.
  const [mode, setMode] = useState<"PRACTICE" | "FULL_TEST">("PRACTICE");
  const [chosenParts, setChosenParts] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const startMutation = useMutation({
    mutationFn: (parts?: number[]) =>
      toeicService.startAttempt(
        examId,
        data?.type === "FULL_TEST" ? mode : "PRACTICE",
        parts,
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

  const fullTestExam = data.type === "FULL_TEST";
  const activeByMode = (wanted: "PRACTICE" | "FULL_TEST") =>
    (data.activeAttempts ?? []).find((a) => a.mode === wanted) ?? null;
  const chosenMode = fullTestExam ? mode : "PRACTICE";
  const activeForMode = data.activeAttempts
    ? activeByMode(chosenMode)
    : data.activeAttempt ?? null;
  const activeParts = (activeForMode as { selectedParts?: number[] } | null)?.selectedParts ?? [];
  const sameParts = (a: number[], b: number[]) => [...a].sort().join(",") === [...b].sort().join(",");
  // A practice in progress on other Parts must be resumed or cancelled first.
  const practiceConflict =
    fullTestExam && mode === "PRACTICE" && activeForMode && chosenParts.length > 0 && !sameParts(activeParts, chosenParts);
  const needParts = fullTestExam && mode === "PRACTICE" && chosenParts.length === 0 && !activeForMode;
  const partLabel = (list: number[]) => (list.length ? `Part ${list.join(", ")}` : "toàn bộ đề");

  const begin = () => {
    if (fullTestExam && mode === "FULL_TEST" && data.learnerReady === false) return;
    if (practiceConflict || needParts) return;
    // Resuming a practice without choosing again keeps its own Parts.
    // Fullscreen must come from this click (transient user activation). The
    // exam page keeps the same document element, so it stays fullscreen.
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    void fullscreenRequest?.catch(() => undefined);
    startMutation.mutate(fullTestExam && mode === "PRACTICE" ? (chosenParts.length ? chosenParts : activeParts) : undefined);
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

  const notReady = fullTestExam && mode === "FULL_TEST" && data.learnerReady === false;
  const modeOptions = [
    {
      value: "PRACTICE" as const,
      title: "Luyện tập linh hoạt",
      body: "Chọn một hoặc nhiều Part để luyện. Audio phần Nghe có thể tạm dừng, tua và nghe lại.",
    },
    {
      value: "FULL_TEST" as const,
      title: "Làm Full Test",
      body: "Đủ 200 câu, Part 1 đến Part 7, trong 120 phút. Audio có thể tạm dừng, tua và nghe lại.",
    },
  ];
  const cancelActive = async () => {
    if (!activeForMode) return;
    await toeicService.cancelAttempt(activeForMode.id);
    await queryClient.invalidateQueries({ queryKey: ["toeic-briefing", examId] });
  };
  // The description written for this exam usually already says it is not an
  // official ETS test; repeat that only when it does not.
  const description = data.description || "Bài luyện thi TOEIC theo định dạng Listening & Reading.";
  const mentionsEts = /ETS/.test(description);

  return (
    <ToeicExamDetailShell
      backHref={safeReturnTo || "/exams"}
      backLabel="Quay lại danh sách đề thi"
      badge={data.type === "FULL_TEST" ? "TOEIC Full Test" : "Luyện theo phần"}
      title={data.title}
      description={description}
      structureHeading="Cấu trúc đề"
      sections={[
        ...(listeningParts.length
          ? [partSection("Nghe (Listening)", listeningParts, listeningTotal)]
          : []),
        ...(readingParts.length
          ? [partSection("Đọc (Reading)", readingParts, readingTotal)]
          : []),
      ]}
      disclaimer={
        mentionsEts
          ? undefined
          : "Đề do BreadTrans biên soạn theo cấu trúc TOEIC, không phải đề thi chính thức của ETS và không thay thế chứng chỉ TOEIC."
      }
      summaryHeading="Thông tin bài thi"
      summaryRows={[
        { label: "Số câu hỏi", value: `${total} câu` },
        {
          label: "Thời lượng",
          value: `${Math.round(data.durationSeconds / 60)} phút`,
        },
      ]}
      notices={
        <>
          {fullTestExam && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Chế độ làm bài
              </legend>
              {modeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-left transition-colors ${mode === option.value ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}
                >
                  <input
                    type="radio"
                    name="toeic-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="mt-1 accent-blue-600"
                  />
                  <span>
                    <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                      {option.title}
                      {activeByMode(option.value) && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          Đang làm dở
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {option.body}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {fullTestExam && mode === "PRACTICE" && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Chọn Part muốn luyện</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {data.parts.map((p) => (
                  <label
                    key={p.part}
                    className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border text-sm font-semibold ${chosenParts.includes(p.part) ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}
                  >
                    <input
                      type="checkbox"
                      name="toeic-part"
                      value={p.part}
                      checked={chosenParts.includes(p.part)}
                      onChange={(e) =>
                        setChosenParts((old) =>
                          e.target.checked ? [...old, p.part].sort((a, b) => a - b) : old.filter((x) => x !== p.part),
                        )
                      }
                      className="accent-blue-600"
                    />
                    Part {p.part}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setChosenParts(chosenParts.length === data.parts.length ? [] : data.parts.map((p) => p.part))}
                className="mt-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
              >
                {chosenParts.length === data.parts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </fieldset>
          )}
          {activeForMode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {mode === "PRACTICE" ? `Bạn đang có lượt luyện tập dở (${partLabel(activeParts)}).` : "Bạn đang có lượt Full Test dở dang."}{" "}
              {practiceConflict ? "Hãy làm tiếp lượt đó hoặc hủy để luyện Part khác." : "Bấm để làm tiếp từ chỗ đã lưu."}
              <button type="button" onClick={() => void cancelActive()} className="ml-1 font-bold text-rose-700 underline dark:text-rose-300">
                Hủy lượt dở
              </button>
            </div>
          )}
          {notReady && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-sm text-rose-800 dark:text-rose-200 font-medium">
              Đề thi này chưa đủ điều kiện phát hành Full Test.
            </div>
          )}
        </>
      }
      cta={{
        label: needParts
          ? "Chọn ít nhất một Part"
          : activeForMode && !practiceConflict
            ? "Làm tiếp ở chế độ toàn màn hình"
            : "Bắt đầu ở chế độ toàn màn hình",
        onClick: begin,
        disabled: notReady || Boolean(practiceConflict) || needParts,
        pending: startMutation.isPending,
      }}
      ctaError={
        startMutation.isError
          ? getApiErrorMessage(startMutation.error, "Không thể khởi tạo lượt thi. Vui lòng thử lại.")
          : null
      }
    />
  );
}
