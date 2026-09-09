"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";
import { VocabStudyRoom } from "@/modules/vocab/components/VocabStudyRoom";

function StudyRoomContent() {
  const searchParams = useSearchParams();
  const paramTopicId = searchParams.get("topicId");
  const topicId = paramTopicId ? Number(paramTopicId) : undefined;

  // If topicId is provided, fetch directly
  const { data: topicDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId!),
    enabled: !!topicId,
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
  const { data: firstTopicDetail, isLoading: isLoadingFirstDetail } = useQuery({
    queryKey: ["vocab-topic", resolvedTopicId],
    queryFn: () => vocabService.getTopicById(resolvedTopicId!),
    enabled: !topicId && !!resolvedTopicId,
  });

  const isLoading = isLoadingDetail || isLoadingTopics || isLoadingFirstDetail;
  const activeTopic = topicDetail || firstTopicDetail;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 className="animate-spin text-sky-500" size={40} />
        <span className="text-xs font-bold text-slate-400">Đang khởi tạo phòng học từ vựng...</span>
      </div>
    );
  }

  if (!activeTopic || !activeTopic.words || activeTopic.words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800">Không tìm thấy bài học</h2>
        <p className="text-xs text-slate-500 font-medium">
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
