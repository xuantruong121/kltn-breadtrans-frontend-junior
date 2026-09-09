"use client";

import React from "react";
import { BookOpen, Lightbulb, PlayCircle } from "lucide-react";
import { GrammarTopicDetail } from "../types";

interface GrammarVideoPlayerProps {
  topic: GrammarTopicDetail;
}

export const GrammarVideoPlayer: React.FC<GrammarVideoPlayerProps> = ({ topic }) => (
  <div className="space-y-6">
    {topic.videoYoutubeId ? (
      <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] border-4 border-slate-200 bg-slate-900 shadow-[0_12px_0_0_#e2e8f0]">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${topic.videoYoutubeId}?rel=0&modestbranding=1`}
          title={topic.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full border-none"
        />
      </div>
    ) : (
      <div className="flex aspect-video flex-col items-center justify-center rounded-[2.5rem] border-4 border-dashed border-sky-200 bg-sky-50 p-6 text-center text-sky-800">
        <PlayCircle size={42} aria-hidden="true" />
        <p className="mt-3 font-black">Bài học này chưa có video minh họa</p>
        <p className="mt-1 text-sm font-medium">Bạn vẫn có thể xem lý thuyết và làm bài tập bên cạnh.</p>
      </div>
    )}

    <section className="space-y-4 rounded-[2rem] border-4 border-slate-200 bg-white p-6 shadow-[0_8px_0_0_#e2e8f0]">
      <div className="border-b-2 border-slate-100 pb-4">
        <h2 className="text-2xl font-black text-slate-800">{topic.title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
          {topic.description || "Củng cố cấu trúc qua ví dụ và bài tập thực hành."}
        </p>
      </div>
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
          <Lightbulb size={16} className="text-amber-500" aria-hidden="true" /> Công thức ghi nhớ cốt lõi
        </div>
        <p className="text-lg font-black text-amber-900 font-mono">
          {topic.keyFormula || "Xem ví dụ và áp dụng cấu trúc trong bài tập."}
        </p>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-700">
          <BookOpen size={16} className="text-sky-500" aria-hidden="true" /> Cách học hiệu quả
        </h3>
        <p className="text-sm font-medium leading-6 text-slate-600">
          Xem lý thuyết, sau đó hoàn thành bài tập để hệ thống lưu kết quả và cập nhật tiến độ thật của bạn.
        </p>
      </div>
    </section>
  </div>
);
