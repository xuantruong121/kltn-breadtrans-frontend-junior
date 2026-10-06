"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { vocabService } from "@/lib/api/services/vocab.service";
import { isPremiumVocabForbiddenError } from "@/lib/api/services/plan.service";
import { BackButton } from "@/components/ui";
import { VocabStudyRoom } from "@/modules/vocab/components/VocabStudyRoom";

function StudyRoomContent() {
  const searchParams = useSearchParams();
  const paramTopicId = searchParams.get("topicId");
  const topicId = paramTopicId ? Number(paramTopicId) : undefined;

  // If topicId is provided, fetch directly
  const {
    data: topicDetail,
    isLoading: isLoadingDetail,
    error: errorDetail,
  } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId!),
    enabled: !!topicId,
    retry: false,
  });

  // If topicId is not provided, fetch topics to resolve the first one
  const { data: topicsResponse, isLoading: isLoadingTopics } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: () => vocabService.getTopics(),
    enabled: !topicId,
  });

  const resolvedFirstTopic = !topicId ? topicsResponse?.topics?.[0] : undefined;
  const resolvedTopicId = topicId ?? resolvedFirstTopic?.id;

  // If we had to resolve first topic id, fetch its details
  const {
    data: firstTopicDetail,
    isLoading: isLoadingFirstDetail,
    error: errorFirstDetail,
  } = useQuery({
    queryKey: ["vocab-topic", resolvedTopicId],
    queryFn: () => vocabService.getTopicById(resolvedTopicId!),
    enabled: !topicId && !!resolvedTopicId,
    retry: false,
  });

  const isLoading = isLoadingDetail || isLoadingTopics || isLoadingFirstDetail;
  const activeTopic = topicDetail || firstTopicDetail;
  const queryError = errorDetail || errorFirstDetail;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 className="animate-spin text-sky-500" size={40} />
        <span className="text-xs font-bold text-slate-400">Đang khởi tạo phòng học từ vựng...</span>
      </div>
    );
  }

  // Handle premium vocab denial
  if (isPremiumVocabForbiddenError(queryError)) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 space-y-5 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-md">
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

  if (!activeTopic || !activeTopic.words || activeTopic.words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Không tìm thấy bài học</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Vui lòng chọn một chủ đề từ vựng từ danh mục để bắt đầu.
        </p>
        <div className="flex justify-center pt-2">
          <BackButton href="/flashcard" label="Quay lại danh mục" />
        </div>
      </div>
    );
  }

  return <VocabStudyRoom topic={activeTopic} />;
}

export default function VocabularyStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-96 gap-3">
          <Loader2 className="animate-spin text-sky-500" size={40} />
          <span className="text-xs font-bold text-slate-400">Đang tải phòng học...</span>
        </div>
      }
    >
      <StudyRoomContent />
    </Suspense>
  );
}
