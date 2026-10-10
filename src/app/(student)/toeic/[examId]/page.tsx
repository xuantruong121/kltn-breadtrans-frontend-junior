"use client";

import { use, useSyncExternalStore } from "react";
import { Clock3, FileText, Loader2, PlayCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toeicService } from "@/lib/api/services/toeic.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useAuthStore } from "@/stores/authStore";
import { isSafeCourseReturn } from "@/lib/course/navigation";

export default function ToeicBriefingPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId: rawExamId } = use(params);
  const examId = Number(rawExamId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo =
    returnTo && isSafeCourseReturn(returnTo) ? returnTo : null;
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
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Vui lòng đăng nhập để xem hướng dẫn và bắt đầu đề thi.
        </p>
        <AuthGateModal
          isOpen
          onClose={() => router.back()}
          targetRoute={`/toeic/${examId}`}
          targetLabel="đề thi TOEIC này"
          onOpenLogin={() => router.push("/login")}
          onOpenRegister={() => router.push("/register")}
        />
      </main>
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
  const begin = () => {
    if (data.type === "FULL_TEST" && data.learnerReady === false) return;
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    void fullscreenRequest?.catch(() => undefined);
    startMutation.mutate();
  };
  const durationLabel =
    data.type === "FULL_TEST"
      ? "Listening 45 phút · Reading 75 phút"
      : `${Math.round(data.durationSeconds / 60)} phút`;
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm sm:p-12">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
          Thông tin bài thi
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">
          {data.title}
        </h1>
        <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
          {data.description ||
            "Bài luyện TOEIC theo cấu trúc Listening và Reading."}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <FileText className="text-sky-600 dark:text-sky-400" size={20} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Số câu
            </p>
            <p className="font-black text-slate-900 dark:text-slate-100">
              {total} câu
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <Clock3 className="text-amber-600 dark:text-amber-400" size={20} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Thời lượng
            </p>
            <p className="font-black text-slate-900 dark:text-slate-100">
              {durationLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hình thức
            </p>
            <p className="font-black text-slate-900 dark:text-slate-100">
              {data.type === "FULL_TEST" ? "Làm bài đầy đủ" : "Luyện theo phần"}
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {data.parts.map((part) => (
            <span
              key={part.part}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Part {part.part}: {part.questionCount} câu
            </span>
          ))}
        </div>
        {data.activeAttempt && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Bạn có một lượt thi đang mở. Nút bên dưới sẽ tiếp tục đúng lượt thi
            đó và không tạo lượt mới.
          </div>
        )}
        {data.type === "FULL_TEST" && data.learnerReady === false && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            Đề thi này chưa đủ điều kiện để làm Full Test. Quản trị viên cần
            hoàn thiện nội dung trước khi phát hành.
          </div>
        )}
        <button
          type="button"
          onClick={begin}
          disabled={
            startMutation.isPending ||
            (data.type === "FULL_TEST" && data.learnerReady === false)
          }
          className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
        >
          {startMutation.isPending ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <PlayCircle size={17} />
          )}{" "}
          {data.activeAttempt ? "Tiếp tục làm bài" : "Bắt đầu làm bài"}
        </button>
        {startMutation.isError && (
          <p
            role="alert"
            className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
          >
            Không thể bắt đầu lượt thi. Vui lòng thử lại.
          </p>
        )}
      </section>
    </main>
  );
}
