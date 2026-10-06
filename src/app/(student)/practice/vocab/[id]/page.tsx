"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, ArrowRight, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { vocabService } from "@/lib/api/services/vocab.service";
import { isPremiumVocabForbiddenError } from "@/lib/api/services/plan.service";
import { BackButton } from "@/components/ui";
import { VocabStudyRoom } from "@/modules/vocab/components/VocabStudyRoom";

export default function VocabPracticePage() {
  const { id } = useParams();
  const topicId = Number(id);

  const {
    data: topic,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId),
    enabled: !!topicId,
    retry: (failureCount, err: any) => {
      // Do not retry 401 or 403 entitlement errors
      if (err?.response?.status === 401 || isPremiumVocabForbiddenError(err)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 className="animate-spin text-sky-500" size={40} />
        <span className="text-xs font-bold text-slate-400">Đang chuẩn bị phòng học từ vựng...</span>
      </div>
    );
  }

  // Handle commercial entitlement denial: 403 FEATURE_NOT_INCLUDED (PREMIUM_VOCAB)
  if (isError && isPremiumVocabForbiddenError(error)) {
    return (
      <div className="max-w-md mx-auto text-center mt-16 space-y-5 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-md">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <Lock size={28} aria-hidden="true" />
        </span>
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            Nội dung Premium
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Mở khóa chủ đề Premium
          </h2>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Nâng cấp BreadTrans Plus để truy cập chủ đề từ vựng Premium.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <BackButton href="/flashcard" label="Để sau" />
          <Link
            href="/plans?highlight=plus"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>Xem gói Plus</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // Handle 401 unauthenticated access
  if (isError && (error as any)?.response?.status === 401) {
    return (
      <div className="max-w-md mx-auto text-center mt-16 space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <LogIn size={24} />
        </span>
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
          Yêu cầu đăng nhập
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Vui lòng đăng nhập để tiếp tục học từ vựng và lưu tiến độ cá nhân.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <BackButton href="/flashcard" label="Quay lại" />
          <Link
            href={`/login?redirect=${encodeURIComponent(`/practice/vocab/${topicId}`)}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
          >
            <span>Đăng nhập</span>
          </Link>
        </div>
      </div>
    );
  }

  // Handle other unexpected errors
  if (isError) {
    return (
      <div className="max-w-md mx-auto text-center mt-16 space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-sm">
        <AlertCircle size={36} className="text-rose-500 mx-auto" />
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
          Không thể tải bài học
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Đã xảy ra sự cố khi tải bài học từ vựng. Vui lòng thử lại sau.
        </p>
        <div className="flex justify-center pt-2">
          <BackButton href="/flashcard" label="Quay lại danh mục" />
        </div>
      </div>
    );
  }

  if (!topic || !topic.words || topic.words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Chưa có từ vựng</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chủ đề này hiện tại chưa có từ vựng nào để học.</p>
        <div className="flex justify-center pt-2">
          <BackButton href="/flashcard" label="Quay lại danh mục" />
        </div>
      </div>
    );
  }

  return <VocabStudyRoom topic={topic} />;
}
