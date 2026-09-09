"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";
import { VocabStudyRoom } from "@/modules/vocab/components/VocabStudyRoom";

export default function VocabPracticePage() {
  const { id } = useParams();
  const topicId = Number(id);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId),
    enabled: !!topicId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 className="animate-spin text-sky-500" size={40} />
        <span className="text-xs font-bold text-slate-400">Đang chuẩn bị phòng học từ vựng...</span>
      </div>
    );
  }

  if (!topic || !topic.words || topic.words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800">Chưa có từ vựng</h2>
        <p className="text-xs text-slate-500 font-medium">Chủ đề này hiện tại chưa có từ vựng nào để học.</p>
        <div className="flex justify-center pt-2">
          <BackButton href="/flashcard" label="Quay lại danh mục" />
        </div>
      </div>
    );
  }

  return <VocabStudyRoom topic={topic} />;
}
